import { type Response } from 'express';
import mongoose from 'mongoose';
import Seller from '../models/Seller';
import Product from '../models/Product';
import SellerMessage from '../models/SellerMessage';
import { type AuthRequest } from '../middlewares/auth.middleware';
import { type SellerAuthRequest } from '../middlewares/sellerAuth.middleware';

function buildProductIdFilter(productId: string) {
  if (mongoose.Types.ObjectId.isValid(productId)) {
    return {
      $or: [{ _id: new mongoose.Types.ObjectId(productId) }, { id: productId }],
    };
  }

  return { id: productId };
}

function formatMessage(message: any) {
  return {
    id: message._id?.toString() || '',
    message: message.message || '',
    isRead: Boolean(message.isRead),
    createdAt: message.createdAt,
    customer: {
      id: message.customer?._id?.toString?.() || '',
      name: message.customer?.name || 'Unknown Customer',
      email: message.customer?.email || '',
    },
    product: message.product
      ? {
          id: message.product?._id?.toString?.() || '',
          name: message.product?.name || '',
          slug: message.product?.slug || '',
        }
      : null,
  };
}

export const sendMessageToSeller = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    const { sellerId, productId, message } = req.body;

    if (!sellerId || !message || !String(message).trim()) {
      res.status(400).json({ message: 'Seller and message are required' });
      return;
    }

    const seller = await Seller.findById(String(sellerId));

    if (!seller) {
      res.status(404).json({ message: 'Seller not found' });
      return;
    }

    let product = null;

    if (productId) {
      product = await Product.findOne(buildProductIdFilter(String(productId)));

      if (!product) {
        res.status(404).json({ message: 'Product not found' });
        return;
      }

      if (product.seller?.toString() !== seller._id.toString()) {
        res.status(400).json({ message: 'Product does not belong to this seller' });
        return;
      }
    }

    const createdMessage = await SellerMessage.create({
      seller: seller._id,
      customer: req.user._id,
      product: product?._id,
      message: String(message).trim(),
      isRead: false,
    });

    const populatedMessage = await SellerMessage.findById(createdMessage._id)
      .populate('customer', 'name email')
      .populate('product', 'name slug');

    res.status(201).json(formatMessage(populatedMessage));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSellerMessages = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const messages = await SellerMessage.find({ seller: req.seller._id })
      .populate('customer', 'name email')
      .populate('product', 'name slug')
      .sort({ createdAt: -1 })
      .limit(20);

    const unreadCount = await SellerMessage.countDocuments({
      seller: req.seller._id,
      isRead: false,
    });

    res.json({
      items: messages.map((message) => formatMessage(message)),
      unreadCount,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markSellerMessageRead = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const message = await SellerMessage.findOne({
      _id: req.params.id,
      seller: req.seller._id,
    })
      .populate('customer', 'name email')
      .populate('product', 'name slug');

    if (!message) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }

    message.isRead = true;
    await message.save();

    res.json(formatMessage(message));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
