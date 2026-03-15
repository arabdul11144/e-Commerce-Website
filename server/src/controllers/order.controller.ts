import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth.middleware';
import Order from '../models/Order';
import Cart from '../models/Cart';
import Product from '../models/Product';

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const {
      items,
      total,
      shippingAddress,
      contactEmail,
      clearCart,
      paymentStatus,
    } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ message: 'No order items' });
      return;
    }

    const requestedProductIds = items
      .map((item: { product?: unknown }) => String(item?.product || '').trim())
      .filter(Boolean);

    const objectIds = requestedProductIds
      .filter((productId: string) => mongoose.Types.ObjectId.isValid(productId))
      .map((productId: string) => new mongoose.Types.ObjectId(productId));

    const products = await Product.find({
      $or: [
        ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
        { id: { $in: requestedProductIds } },
      ],
    }).select('_id seller price discountPrice');

    const productMap = new Map(
      products.flatMap((product) => {
        const entries: Array<[string, (typeof products)[number]]> = [
          [product._id.toString(), product],
        ];

        if (product.id) {
          entries.push([product.id, product]);
        }

        return entries;
      })
    );

    const normalizedItems: Array<{
      product: typeof products[number]['_id'];
      seller?: typeof products[number]['seller'];
      price: number;
      quantity: number;
    }> = items
      .map((item: { product?: unknown; quantity?: unknown }) => {
        const productId = String(item?.product || '').trim();
        const product = productMap.get(productId);
        const quantity = Math.max(1, Number(item?.quantity) || 1);

        if (!product) {
          return null;
        }

        return {
          product: product._id,
          seller: product.seller,
          price: Number(product.discountPrice ?? product.price ?? 0),
          quantity,
        };
      })
      .filter((item: {
        product: typeof products[number]['_id'];
        seller?: typeof products[number]['seller'];
        price: number;
        quantity: number;
      } | null): item is {
        product: typeof products[number]['_id'];
        seller?: typeof products[number]['seller'];
        price: number;
        quantity: number;
      } => item !== null);

    if (normalizedItems.length === 0) {
      res.status(400).json({ message: 'No valid order items' });
      return;
    }

    const calculatedTotal = normalizedItems.reduce((sum: number, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    const order = new Order({
      user: req.user?._id,
      items: normalizedItems,
      total: Number(total) > 0 ? Number(total) : calculatedTotal,
      shippingAddress,
      contactEmail,
      status: 'pending',
      paymentStatus: paymentStatus === 'paid' ? 'paid' : 'pending',
    });

    const createdOrder = await order.save();

    if (clearCart === true) {
      const cart = await Cart.findOne({ user: req.user?._id });

      if (cart) {
        const orderedProductIds = new Set(
          normalizedItems.map((item) => item.product.toString())
        );

        cart.items = cart.items.filter(
          (item) => !orderedProductIds.has(item.product.toString())
        );
        await cart.save();
      }
    }

    res.status(201).json(createdOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({ user: req.user?._id })
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product');

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Ensure user can only view their own orders (unless admin)
    if (order.user.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized to view this order' });
      return;
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
