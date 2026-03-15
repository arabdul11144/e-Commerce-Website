import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth.middleware';
import Order from '../models/Order';
import Cart from '../models/Cart';
import Product from '../models/Product';
import User, { type IUserSavedAddress } from '../models/User';

function normalizeSavedAddress(value: unknown): Omit<IUserSavedAddress, '_id'> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const address = value as Record<string, unknown>;
  const fullName = String(address.fullName || '').trim();
  const street = String(address.street || '').trim();
  const city = String(address.city || '').trim();
  const state = String(address.state || '').trim();
  const zip = String(address.zip || '').trim();
  const country = String(address.country || '').trim();
  const phone = String(address.phone || '').trim();

  if (!street || !city || !state || !zip) {
    return null;
  }

  return {
    fullName,
    street,
    city,
    state,
    zip,
    country,
    phone,
  };
}

function buildSavedAddressKey(address: Omit<IUserSavedAddress, '_id'> | IUserSavedAddress) {
  return [
    address.fullName || '',
    address.street,
    address.city,
    address.state,
    address.zip,
    address.country || '',
    address.phone || '',
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .join('|');
}

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
      .filter(
        (
          item: {
            product: typeof products[number]['_id'];
            seller?: typeof products[number]['seller'];
            price: number;
            quantity: number;
          } | null
        ): item is {
          product: typeof products[number]['_id'];
          seller?: typeof products[number]['seller'];
          price: number;
          quantity: number;
        } => item !== null
      );

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
    const normalizedAddress = normalizeSavedAddress(shippingAddress);

    if (normalizedAddress && req.user?._id) {
      const user = await User.findById(req.user._id);

      if (user) {
        const addressAlreadyExists = user.savedAddresses.some(
          (savedAddress) =>
            buildSavedAddressKey(savedAddress) === buildSavedAddressKey(normalizedAddress)
        );

        if (!addressAlreadyExists) {
          user.savedAddresses.push(normalizedAddress as IUserSavedAddress);
          await user.save();
        }
      }
    }

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

export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.user.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized to cancel this order' });
      return;
    }

    if (order.status === 'cancelled') {
      res.status(400).json({ message: 'Order has already been cancelled' });
      return;
    }

    if (!['pending', 'processing', 'confirmed'].includes(order.status)) {
      res.status(400).json({ message: 'This order can no longer be cancelled' });
      return;
    }

    order.status = 'cancelled';
    await order.save();
    await order.populate('items.product');

    res.json(order);
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

    if (order.user.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized to view this order' });
      return;
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
