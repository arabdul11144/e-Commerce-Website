import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';

import authRoutes from './routes/auth.routes';
import sellerAuthRoutes from './routes/sellerAuth.routes';
import sellerMessageRoutes from './routes/sellerMessage.routes';
import sellerProfileRoutes from './routes/sellerProfile.routes';
import sellerProductRoutes from './routes/sellerProduct.routes';
import productRoutes from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import wishlistRoutes from './routes/wishlist.routes';
import orderRoutes from './routes/order.routes';
import adminRoutes from './routes/admin.routes';
import { notFound, errorHandler } from './middlewares/error.middleware';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce';

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB successfully connected'))
  .catch((err) => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/seller/auth', sellerAuthRoutes);
app.use('/api/seller/messages', sellerMessageRoutes);
app.use('/api/seller/profile', sellerProfileRoutes);
app.use('/api/seller/products', sellerProductRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Error Middlewares
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
