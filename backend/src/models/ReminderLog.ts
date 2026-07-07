import mongoose, { Document, Schema, Types } from 'mongoose';

export type ReminderType = '30_days' | '7_days' | 'expiry_day';

export interface IReminderLog extends Document {
  user: Types.ObjectId;
  product: Types.ObjectId;
  reminderType: ReminderType;
  sentAt: Date;
}

const reminderLogSchema = new Schema<IReminderLog>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  reminderType: { type: String, enum: ['30_days', '7_days', 'expiry_day'], required: true },
  sentAt: { type: Date, default: Date.now },
});

reminderLogSchema.index({ product: 1, reminderType: 1 }, { unique: true });

export default mongoose.model<IReminderLog>('ReminderLog', reminderLogSchema);
