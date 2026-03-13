import mongoose, { Schema, type Document } from 'mongoose';

export interface ISeller extends Document {
  businessName: string;
  activeBankAccount: string;
  profileImage?: string;
  validEmail: string;
  mobileNumber: string;
  pickupAddress: string;
  username: string;
  password?: string;
  status: 'active' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

const SellerSchema = new Schema<ISeller>(
  {
    businessName: { type: String, required: true, trim: true },
    activeBankAccount: { type: String, required: true, trim: true },
    profileImage: { type: String, default: '' },
    validEmail: { type: String, required: true, unique: true, trim: true, lowercase: true },
    mobileNumber: { type: String, required: true, trim: true },
    pickupAddress: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model<ISeller>('Seller', SellerSchema);
