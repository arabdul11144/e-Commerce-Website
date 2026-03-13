import mongoose, { Schema, type Document } from 'mongoose';

export interface ISellerMessage extends Document {
  seller: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SellerMessageSchema = new Schema<ISellerMessage>(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    message: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<ISellerMessage>('SellerMessage', SellerMessageSchema);
