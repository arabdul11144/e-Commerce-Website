import express from 'express';
import {
  getStats,
  getProducts,
  getUsers,
  updateUser,
  getOrders,
  getOrderDetails,
  updateOrderStatus,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/admin.controller';
import { sellerProtect } from '../middlewares/sellerAuth.middleware';

const router = express.Router();

router.get('/stats', sellerProtect, getStats);
router.get('/products', sellerProtect, getProducts);
router.get('/users', sellerProtect, getUsers);
router.put('/users/:id', sellerProtect, updateUser);
router.get('/orders', sellerProtect, getOrders);
router.get('/orders/:id', sellerProtect, getOrderDetails);
router.put('/orders/:id', sellerProtect, updateOrderStatus);
router.post('/products', sellerProtect, createProduct);
router.put('/products/:id', sellerProtect, updateProduct);
router.delete('/products/:id', sellerProtect, deleteProduct);

export default router;
