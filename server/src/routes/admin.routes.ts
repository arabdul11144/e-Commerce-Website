import express from 'express';
import {
  getStats,
  getProducts,
  getUsers,
  updateUser,
  getOrders,
  updateOrderStatus,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/admin.controller';
import { protect } from '../middlewares/auth.middleware';
import { admin } from '../middlewares/admin.middleware';

const router = express.Router();

router.get('/stats', protect, admin, getStats);
router.get('/products', protect, admin, getProducts);
router.get('/users', protect, admin, getUsers);
router.put('/users/:id', protect, admin, updateUser);
router.get('/orders', protect, admin, getOrders);
router.put('/orders/:id', protect, admin, updateOrderStatus);
router.post('/products', protect, admin, createProduct);
router.put('/products/:id', protect, admin, updateProduct);
router.delete('/products/:id', protect, admin, deleteProduct);

export default router;
