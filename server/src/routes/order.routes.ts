import express from 'express';
import { createOrder, getUserOrders, cancelOrder, getOrderById } from '../controllers/order.controller';
import { protect } from '../middlewares/auth.middleware';

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/myorders', protect, getUserOrders);
router.put('/:id/cancel', protect, cancelOrder);
router.get('/:id', protect, getOrderById);

export default router;
