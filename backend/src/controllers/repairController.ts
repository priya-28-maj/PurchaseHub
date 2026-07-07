import { Response } from 'express';
import { body } from 'express-validator';
import Product from '../models/Product';
import Repair from '../models/Repair';
import { AuthRequest } from '../middleware/auth';
import { AppError, sendError } from '../utils/errors';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinaryService';

export const repairValidation = [
  body('date').isISO8601().withMessage('Valid date is required'),
  body('serviceCenter').trim().notEmpty().withMessage('Service center is required'),
  body('cost').isFloat({ min: 0 }).withMessage('Valid cost is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
];

export async function getRepairs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const product = await Product.findOne({ _id: req.params.productId, user: req.user!.id });
    if (!product) throw new AppError('Product not found', 404);

    const repairs = await Repair.find({ product: product._id }).sort({ date: -1 });
    res.json({ success: true, data: repairs });
  } catch (error) {
    sendError(res, error);
  }
}

export async function createRepair(req: AuthRequest, res: Response): Promise<void> {
  try {
    const product = await Product.findOne({ _id: req.params.productId, user: req.user!.id });
    if (!product) throw new AppError('Product not found', 404);

    const { date, serviceCenter, cost, description } = req.body;

    let invoiceUrl: string | undefined;
    let invoicePublicId: string | undefined;
    let invoiceFileName: string | undefined;

    if (req.file) {
      const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'image';
      const uploaded = await uploadToCloudinary(req.file.buffer, 'repairs', resourceType as 'image' | 'raw');
      invoiceUrl = uploaded.url;
      invoicePublicId = uploaded.publicId;
      invoiceFileName = req.file.originalname;
    }

    const repair = await Repair.create({
      user: req.user!.id,
      product: product._id,
      date: new Date(date),
      serviceCenter,
      cost: Number(cost),
      description,
      invoiceUrl,
      invoicePublicId,
      invoiceFileName,
    });

    res.status(201).json({ success: true, data: repair });
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateRepair(req: AuthRequest, res: Response): Promise<void> {
  try {
    const repair = await Repair.findOne({ _id: req.params.id, user: req.user!.id });
    if (!repair) throw new AppError('Repair not found', 404);

    const { date, serviceCenter, cost, description } = req.body;
    if (date) repair.date = new Date(date);
    if (serviceCenter) repair.serviceCenter = serviceCenter;
    if (cost !== undefined) repair.cost = Number(cost);
    if (description) repair.description = description;

    if (req.file) {
      if (repair.invoicePublicId) {
        await deleteFromCloudinary(repair.invoicePublicId);
      }
      const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'image';
      const uploaded = await uploadToCloudinary(req.file.buffer, 'repairs', resourceType as 'image' | 'raw');
      repair.invoiceUrl = uploaded.url;
      repair.invoicePublicId = uploaded.publicId;
      repair.invoiceFileName = req.file.originalname;
    }

    await repair.save();
    res.json({ success: true, data: repair });
  } catch (error) {
    sendError(res, error);
  }
}

export async function deleteRepair(req: AuthRequest, res: Response): Promise<void> {
  try {
    const repair = await Repair.findOne({ _id: req.params.id, user: req.user!.id });
    if (!repair) throw new AppError('Repair not found', 404);

    if (repair.invoicePublicId) {
      await deleteFromCloudinary(repair.invoicePublicId);
    }

    await repair.deleteOne();
    res.json({ success: true, message: 'Repair deleted' });
  } catch (error) {
    sendError(res, error);
  }
}
