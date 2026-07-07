import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { sendError, AppError } from '../utils/errors';
import { extractReceiptData, isVisionConfigured } from '../services/ocrService';

export async function getOcrStatus(_req: AuthRequest, res: Response): Promise<void> {
  const vision = isVisionConfigured();

  res.json({
    success: true,
    data: {
      vision,
      ready: vision,
      message: vision
        ? 'Receipt scanning ready (Google Vision OCR)'
        : 'Set GOOGLE_APPLICATION_CREDENTIALS in backend/.env to enable receipt scanning',
    },
  });
}

export async function scanReceipt(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const isImage = req.file.mimetype.startsWith('image/');
    if (!isImage) {
      throw new AppError('OCR only supports image files (JPG, PNG)', 400);
    }

    if (!isVisionConfigured()) {
      throw new AppError(
        'Receipt scanning is not configured. Set GOOGLE_APPLICATION_CREDENTIALS in backend/.env',
        503
      );
    }

    const result = await extractReceiptData(req.file.buffer);

    if (result.parseError && !result.merchant && !result.totalAmount && !result.productName) {
      throw new AppError(result.parseError, 422);
    }

    if (!result.productName && !result.merchant && !result.totalAmount) {
      const hint = result.parseError || 'Try a clearer, flatter photo of the full receipt.';
      throw new AppError(`Could not extract receipt data. ${hint}`, 422);
    }

    res.json({
      success: true,
      data: {
        productName: result.productName || '',
        brand: result.brand || '',
        category: result.category || 'Other',
        purchaseDate: result.purchaseDate || '',
        merchant: result.merchant || '',
        totalAmount: result.totalAmount || 0,
        currency: result.currency || 'USD',
        itemCount: result.itemCount,
        notes: result.notes || '',
        warning: result.warning,
        rawText: result.rawText,
      },
    });
  } catch (error) {
    sendError(res, error);
  }
}
