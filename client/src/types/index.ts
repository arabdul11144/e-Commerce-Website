export interface Product {
  id: string;
  sellerId?: string;
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
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  avatar?: string;
}

export interface Seller {
  id: string;
  name: string;
  businessName: string;
  activeBankAccount: string;
  profileImage?: string;
  validEmail: string;
  mobileNumber: string;
  pickupAddress: string;
  username: string;
  status: 'active' | 'blocked';
  role: 'seller';
}

export interface SellerMessage {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  product: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  createdAt: string;
}

export interface Address {
  id: string;
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrder: number;
  expiryDate: string;
  active: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  bgImage: string;
}

export interface Testimonial {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  comment: string;
  product: string;
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  productCount: number;
}
