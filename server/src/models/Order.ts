import mongoose, { Schema, Document } from 'mongoose';
import { IProduct } from './Product';

export interface IOrderItem {
  product: IProduct['_id'];
  seller?: mongoose.Types.ObjectId;
  price?: number;
  quantity: number;
}

export interface IShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress?: IShippingAddress;
  contactEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema: Schema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  seller: { type: Schema.Types.ObjectId, ref: 'Seller' },
  price: { type: Number, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
});

const ShippingAddressSchema: Schema = new Schema(
  {
    fullName: { type: String },
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String },
    country: { type: String },
    phone: { type: String },
  },
  { _id: false }
);

const OrderSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [OrderItemSchema],
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    shippingAddress: ShippingAddressSchema,
    contactEmail: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>('Order', OrderSchema);
