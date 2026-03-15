import mongoose from 'mongoose';
import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import Cart from '../models/Cart';
import Product from '../models/Product';

const buildProductLookupQuery = (productId: string) => {
  const lookupConditions: Array<Record<string, string>> = [{ id: productId }];

  if (mongoose.Types.ObjectId.isValid(productId)) {
    lookupConditions.push({ _id: productId });
  }

  return { $or: lookupConditions };
};

const resolveProductId = async (productId: string) => {
  const product = await Product.findOne(buildProductLookupQuery(productId)).select('_id');
  return product?._id.toString() ?? null;
};

const normalizeQuantity = (value: unknown, fallback = 1) => {
  const quantity = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(quantity)) {
    return fallback;
  }

  return Math.max(0, Math.trunc(quantity));
};

export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const cart = await Cart.findOne({ user: req.user?._id }).populate('items.product');
    if (cart) {
      res.json(cart);
    } else {
      res.json({ items: [] });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    const productId =
      typeof req.body?.productId === 'string' ? req.body.productId : '';
    const quantity = Math.max(1, normalizeQuantity(req.body?.quantity));

    if (!productId) {
      res.status(400).json({ message: 'Product ID is required' });
      return;
    }

    const resolvedProductId = await resolveProductId(productId);

    if (!resolvedProductId) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    let cart = await Cart.findOne({ user: req.user?._id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user?._id,
        items: [{ product: new mongoose.Types.ObjectId(resolvedProductId), quantity }],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === resolvedProductId
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({
          product: new mongoose.Types.ObjectId(resolvedProductId),
          quantity,
        });
      }
      await cart.save();
    }

    const updatedCart = await Cart.findOne({ user: req.user?._id }).populate('items.product');
    res.status(201).json(updatedCart);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCartItem = async (req: AuthRequest, res: Response) => {
  try {
    const productId = String(req.params.productId ?? '');
    const quantity = Math.max(1, normalizeQuantity(req.body?.quantity));

    const cart = await Cart.findOne({ user: req.user?._id });

    if (!cart) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }

    const resolvedProductId = await resolveProductId(productId);
    const targetProductId = resolvedProductId ?? productId;

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === targetProductId
    );

    if (itemIndex === -1) {
      res.status(404).json({ message: 'Item not found in cart' });
      return;
    }

    cart.items[itemIndex].quantity = quantity;

    await cart.save();
    const updatedCart = await Cart.findOne({ user: req.user?._id }).populate('items.product');
    res.json(updatedCart);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const removeFromCart = async (req: AuthRequest, res: Response) => {
  try {
    const productId = String(req.params.productId ?? '');
    const cart = await Cart.findOne({ user: req.user?._id });
    const resolvedProductId = await resolveProductId(productId);
    const targetProductId = resolvedProductId ?? productId;

    if (cart) {
      cart.items = cart.items.filter(
        (item) => item.product.toString() !== targetProductId
      );
      await cart.save();
      const updatedCart = await Cart.findOne({ user: req.user?._id }).populate('items.product');
      res.json(updatedCart);
    } else {
      res.status(404).json({ message: 'Cart not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    const cart = await Cart.findOne({ user: req.user?._id });
    if (cart) {
      cart.items = [];
      await cart.save();
      res.json({ message: 'Cart cleared' });
    } else {
      res.status(404).json({ message: 'Cart not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};