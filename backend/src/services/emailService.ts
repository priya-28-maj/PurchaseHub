import nodemailer from 'nodemailer';
import Product from '../models/Product';
import ReminderLog, { ReminderType } from '../models/ReminderLog';
import User from '../models/User';
import { getRemainingDays } from '../utils/warranty';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function getReminderSubject(productName: string, type: ReminderType): string {
  switch (type) {
    case '30_days':
      return `Warranty expiring in 30 days: ${productName}`;
    case '7_days':
      return `Warranty expiring in 7 days: ${productName}`;
    case 'expiry_day':
      return `Warranty expired today: ${productName}`;
  }
}

function getReminderBody(productName: string, brand: string, daysRemaining: number, type: ReminderType): string {
  const greeting = type === 'expiry_day'
    ? `Your warranty for <strong>${productName}</strong> (${brand}) has expired today.`
    : `Your warranty for <strong>${productName}</strong> (${brand}) expires in <strong>${daysRemaining} days</strong>.`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #6366f1; margin-bottom: 8px;">PurchaseHub</h2>
      <p style="color: #64748b; margin-bottom: 24px;">Warranty Reminder</p>
      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="color: #334155; line-height: 1.6;">${greeting}</p>
        <p style="color: #64748b; font-size: 14px;">Log in to PurchaseHub to view details and repair history.</p>
      </div>
      <p style="color: #94a3b8; font-size: 12px;">You're receiving this because you have warranty tracking enabled in PurchaseHub.</p>
    </div>
  `;
}

async function sendReminderEmail(
  email: string,
  productName: string,
  brand: string,
  daysRemaining: number,
  type: ReminderType
): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[Email skipped] ${type} reminder for ${productName} (${daysRemaining} days)`);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'PurchaseHub <noreply@purchasehub.app>',
    to: email,
    subject: getReminderSubject(productName, type),
    html: getReminderBody(productName, brand, daysRemaining, type),
  });
}

export async function processWarrantyReminders(): Promise<void> {
  const products = await Product.find({
    warrantyExpiry: { $ne: null },
    warrantyStatus: { $in: ['active', 'expiring_soon'] },
  }).populate('user');

  for (const product of products) {
    if (!product.warrantyExpiry) continue;

    const daysRemaining = getRemainingDays(product.warrantyExpiry);
    if (daysRemaining === null) continue;

    let reminderType: ReminderType | null = null;
    if (daysRemaining === 30) reminderType = '30_days';
    else if (daysRemaining === 7) reminderType = '7_days';
    else if (daysRemaining === 0) reminderType = 'expiry_day';

    if (!reminderType) continue;

    const existing = await ReminderLog.findOne({ product: product._id, reminderType });
    if (existing) continue;

    const user = await User.findById(product.user);
    if (!user) continue;

    try {
      await sendReminderEmail(user.email, product.name, product.brand, daysRemaining, reminderType);
      await ReminderLog.create({
        user: user._id,
        product: product._id,
        reminderType,
      });
      console.log(`Sent ${reminderType} reminder for ${product.name} to ${user.email}`);
    } catch (error) {
      console.error(`Failed to send reminder for ${product.name}:`, error);
    }
  }
}

export async function refreshWarrantyStatuses(): Promise<void> {
  const products = await Product.find({ warrantyExpiry: { $ne: null } });
  const { getWarrantyStatus } = await import('../utils/warranty');

  for (const product of products) {
    const newStatus = getWarrantyStatus(product.warrantyExpiry);
    if (product.warrantyStatus !== newStatus) {
      product.warrantyStatus = newStatus;
      await product.save();
    }
  }
}
