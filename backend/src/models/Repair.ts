import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRepair extends Document {
  user: Types.ObjectId;
  product: Types.ObjectId;
  date: Date;
  serviceCenter: string;
  cost: number;
  description: string;
  invoiceUrl?: string;
  invoicePublicId?: string;
  invoiceFileName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const repairSchema = new Schema<IRepair>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    date: { type: Date, required: true },
    serviceCenter: { type: String, required: true, trim: true },
    cost: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    invoiceUrl: { type: String },
    invoicePublicId: { type: String },
    invoiceFileName: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IRepair>('Repair', repairSchema);
