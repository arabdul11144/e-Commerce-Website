import mongoose, { Schema, type Document } from 'mongoose';

export interface IProduct extends Document {
  id?: string;
  seller?: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  category: 'Laptops' | 'Accessories';
  subcategory?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  shortDescription: string;
  fullDescription: string;
  images: string[];
  specifications: Record<string, string>;
  featured?: boolean;
  rating: number;
  reviewsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    id: { type: String, unique: true, sparse: true },
    seller: { type: Schema.Types.ObjectId, ref: 'Seller' },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    sku: { type: String, required: true },
    brand: { type: String, required: true },
    category: {
      type: String,
      enum: ['Laptops', 'Accessories'],
      required: true,
    },
    subcategory: { type: String },
    price: { type: Number, required: true },
    discountPrice: { type: Number },
    stock: { type: Number, required: true, default: 0 },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
    images: [{ type: String }],
    specifications: { type: Schema.Types.Mixed, default: {} },
    featured: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        if (!ret.id || ret.id === ret._id?.toString()) {
          ret.id = ret._id?.toString();
        }

        if (ret.seller && typeof ret.seller?.toString === 'function') {
          ret.sellerId = ret.seller.toString();
        }

        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

export default mongoose.model<IProduct>('Product', ProductSchema);
