import mongoose, { Document, Schema, Types } from 'mongoose';

export type WarrantyStatus = 'active' | 'expiring_soon' | 'expired' | 'none';
export type DocumentType = 'receipt' | 'warranty_card' | 'invoice' | 'repair_invoice';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD' | 'AED' | 'SGD' | 'JPY';

export interface IDocument {
  _id?: Types.ObjectId;
  type: DocumentType;
  url: string;
  publicId: string;
  fileName: string;
  mimeType: string;
  uploadedAt: Date;
}

export interface IProduct extends Document {
  user: Types.ObjectId;
  name: string;
  brand: string;
  category: string;
  purchasePrice: number;
  currency: CurrencyCode;
  purchaseDate: Date;
  storeName: string;
  warrantyDurationMonths: number;
  warrantyExpiry: Date | null;
  warrantyStatus: WarrantyStatus;
  image?: string;
  imagePublicId?: string;
  notes?: string;
  documents: IDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    type: {
      type: String,
      enum: ['receipt', 'warranty_card', 'invoice', 'repair_invoice'],
      required: true,
    },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const productSchema = new Schema<IProduct>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'AED', 'SGD', 'JPY'],
      default: 'USD',
    },
    purchaseDate: { type: Date, required: true },
    storeName: { type: String, required: true, trim: true },
    warrantyDurationMonths: { type: Number, default: 0, min: 0 },
    warrantyExpiry: { type: Date, default: null },
    warrantyStatus: {
      type: String,
      enum: ['active', 'expiring_soon', 'expired', 'none'],
      default: 'none',
    },
    image: { type: String },
    imagePublicId: { type: String },
    notes: { type: String, trim: true },
    documents: [documentSchema],
  },
  { timestamps: true }
);

productSchema.index({ user: 1, name: 'text', brand: 'text', storeName: 'text' });
productSchema.index({ user: 1, category: 1 });
productSchema.index({ user: 1, warrantyStatus: 1 });

export default mongoose.model<IProduct>('Product', productSchema);
