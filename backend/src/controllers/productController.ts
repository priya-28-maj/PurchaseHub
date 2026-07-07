import { Response } from 'express';
import { body } from 'express-validator';
import Product from '../models/Product';
import Repair from '../models/Repair';
import { AuthRequest } from '../middleware/auth';
import { AppError, sendError } from '../utils/errors';
import { calculateWarrantyExpiry, getWarrantyStatus, getRemainingDays } from '../utils/warranty';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinaryService';
import { isValidCurrencyCode, DEFAULT_CURRENCY, formatAmount } from '../utils/currency';

export const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('brand').trim().notEmpty().withMessage('Brand is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('purchasePrice').isFloat({ min: 0 }).withMessage('Valid purchase price is required'),
  body('purchaseDate').isISO8601().withMessage('Valid purchase date is required'),
  body('storeName').trim().notEmpty().withMessage('Store name is required'),
  body('warrantyDurationMonths').optional().isInt({ min: 0 }),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'AED', 'SGD', 'JPY']),
];

function enrichProduct(product: InstanceType<typeof Product>) {
  const obj = product.toObject();
  return {
    ...obj,
    remainingDays: getRemainingDays(product.warrantyExpiry),
  };
}

export async function getProducts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { search, category, warrantyStatus } = req.query;
    const filter: Record<string, unknown> = { user: req.user!.id };

    if (category) filter.category = category;
    if (warrantyStatus) filter.warrantyStatus = warrantyStatus;

    if (search && typeof search === 'string') {
      filter.$text = { $search: search };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: products.map(enrichProduct) });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const product = await Product.findOne({ _id: req.params.id, user: req.user!.id });
    if (!product) throw new AppError('Product not found', 404);

    res.json({ success: true, data: enrichProduct(product) });
  } catch (error) {
    sendError(res, error);
  }
}

export async function createProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      name, brand, category, purchasePrice, purchaseDate,
      storeName, warrantyDurationMonths = 0, notes, currency,
    } = req.body;

    const productCurrency = isValidCurrencyCode(currency) ? currency : DEFAULT_CURRENCY;

    const purchaseDateObj = new Date(purchaseDate);
    const warrantyExpiry = calculateWarrantyExpiry(purchaseDateObj, Number(warrantyDurationMonths));
    const warrantyStatus = getWarrantyStatus(warrantyExpiry);

    let image: string | undefined;
    let imagePublicId: string | undefined;

    if (req.file) {
      const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'image';
      const uploaded = await uploadToCloudinary(req.file.buffer, 'products', resourceType as 'image' | 'raw');
      image = uploaded.url;
      imagePublicId = uploaded.publicId;
    }

    const product = await Product.create({
      user: req.user!.id,
      name, brand, category,
      purchasePrice: Number(purchasePrice),
      currency: productCurrency,
      purchaseDate: purchaseDateObj,
      storeName,
      warrantyDurationMonths: Number(warrantyDurationMonths),
      warrantyExpiry,
      warrantyStatus,
      notes,
      image,
      imagePublicId,
    });

    res.status(201).json({ success: true, data: enrichProduct(product) });
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const product = await Product.findOne({ _id: req.params.id, user: req.user!.id });
    if (!product) throw new AppError('Product not found', 404);

    const {
      name, brand, category, purchasePrice, purchaseDate,
      storeName, warrantyDurationMonths, notes, currency,
    } = req.body;

    if (name) product.name = name;
    if (brand) product.brand = brand;
    if (category) product.category = category;
    if (purchasePrice !== undefined) product.purchasePrice = Number(purchasePrice);
    if (currency && isValidCurrencyCode(currency)) product.currency = currency;
    if (purchaseDate) {
      product.purchaseDate = new Date(purchaseDate);
      product.warrantyExpiry = calculateWarrantyExpiry(product.purchaseDate, product.warrantyDurationMonths);
      product.warrantyStatus = getWarrantyStatus(product.warrantyExpiry);
    }
    if (storeName) product.storeName = storeName;
    if (notes !== undefined) product.notes = notes;

    if (warrantyDurationMonths !== undefined) {
      product.warrantyDurationMonths = Number(warrantyDurationMonths);
      product.warrantyExpiry = calculateWarrantyExpiry(product.purchaseDate, product.warrantyDurationMonths);
      product.warrantyStatus = getWarrantyStatus(product.warrantyExpiry);
    }

    if (req.file) {
      if (product.imagePublicId) {
        await deleteFromCloudinary(product.imagePublicId);
      }
      const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'image';
      const uploaded = await uploadToCloudinary(req.file.buffer, 'products', resourceType as 'image' | 'raw');
      product.image = uploaded.url;
      product.imagePublicId = uploaded.publicId;
    }

    await product.save();
    res.json({ success: true, data: enrichProduct(product) });
  } catch (error) {
    sendError(res, error);
  }
}

export async function deleteProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const product = await Product.findOne({ _id: req.params.id, user: req.user!.id });
    if (!product) throw new AppError('Product not found', 404);

    if (product.imagePublicId) {
      await deleteFromCloudinary(product.imagePublicId);
    }

    for (const doc of product.documents) {
      const resourceType = doc.mimeType === 'application/pdf' ? 'raw' : 'image';
      await deleteFromCloudinary(doc.publicId, resourceType as 'image' | 'raw');
    }

    await Repair.deleteMany({ product: product._id });
    await product.deleteOne();

    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    sendError(res, error);
  }
}

export async function uploadDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    const product = await Product.findOne({ _id: req.params.id, user: req.user!.id });
    if (!product) throw new AppError('Product not found', 404);
    if (!req.file) throw new AppError('No file uploaded', 400);

    const { type } = req.body;
    if (!['receipt', 'warranty_card', 'invoice'].includes(type)) {
      throw new AppError('Invalid document type', 400);
    }

    const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'image';
    const uploaded = await uploadToCloudinary(req.file.buffer, 'documents', resourceType as 'image' | 'raw');

    product.documents.push({
      type,
      url: uploaded.url,
      publicId: uploaded.publicId,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      uploadedAt: new Date(),
    });

    await product.save();
    res.status(201).json({ success: true, data: enrichProduct(product) });
  } catch (error) {
    sendError(res, error);
  }
}

export async function deleteDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    const product = await Product.findOne({ _id: req.params.id, user: req.user!.id });
    if (!product) throw new AppError('Product not found', 404);

    const docIndex = product.documents.findIndex(
      (d) => d._id?.toString() === req.params.docId
    );
    if (docIndex === -1) throw new AppError('Document not found', 404);

    const doc = product.documents[docIndex];
    const resourceType = doc.mimeType === 'application/pdf' ? 'raw' : 'image';
    await deleteFromCloudinary(doc.publicId, resourceType as 'image' | 'raw');
    product.documents.splice(docIndex, 1);
    await product.save();

    res.json({ success: true, data: enrichProduct(product) });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getProductTimeline(req: AuthRequest, res: Response): Promise<void> {
  try {
    const product = await Product.findOne({ _id: req.params.id, user: req.user!.id });
    if (!product) throw new AppError('Product not found', 404);

    const repairs = await Repair.find({ product: product._id }).sort({ date: 1 });

    const events: Array<{ type: string; date: Date; title: string; description?: string; cost?: number }> = [];

    events.push({
      type: 'purchase',
      date: product.purchaseDate,
      title: 'Purchased',
      description: `${product.name} from ${product.storeName} for ${formatAmount(product.purchasePrice, product.currency || DEFAULT_CURRENCY)}`,
    });

    if (product.warrantyDurationMonths > 0) {
      events.push({
        type: 'warranty_start',
        date: product.purchaseDate,
        title: 'Warranty Started',
        description: `${product.warrantyDurationMonths} month warranty`,
      });
    }

    for (const repair of repairs) {
      events.push({
        type: 'repair',
        date: repair.date,
        title: 'Repair',
        description: `${repair.serviceCenter}: ${repair.description}`,
        cost: repair.cost,
      });
    }

    if (product.warrantyExpiry) {
      events.push({
        type: 'warranty_expiry',
        date: product.warrantyExpiry,
        title: product.warrantyStatus === 'expired' ? 'Warranty Expired' : 'Warranty Expires',
        description: getRemainingDays(product.warrantyExpiry) !== null && getRemainingDays(product.warrantyExpiry)! > 0
          ? `${getRemainingDays(product.warrantyExpiry)} days remaining`
          : 'Warranty period ended',
      });
    }

    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    res.json({ success: true, data: events });
  } catch (error) {
    sendError(res, error);
  }
}
