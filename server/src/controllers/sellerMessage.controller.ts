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

function populateMessageDetails(query: any) {
  return query
    .populate('customer', 'name email')
    .populate('seller', 'businessName validEmail')
    .populate('product', 'name slug');
}

function formatMessage(message: any, viewer: 'seller' | 'customer') {
  const senderType = message.senderType === 'seller' ? 'seller' : 'customer';

  return {
    id: message._id?.toString() || '',
    message: message.message || '',
    isRead: viewer === 'seller' ? Boolean(message.isRead) : Boolean(message.customerRead),
    senderType,
    createdAt: message.createdAt,
    customer: {
      id: message.customer?._id?.toString?.() || '',
      name: message.customer?.name || 'Unknown Customer',
      email: message.customer?.email || '',
    },
    seller: message.seller
      ? {
          id: message.seller?._id?.toString?.() || '',
          name: message.seller?.businessName || 'Seller',
          email: message.seller?.validEmail || '',
        }
      : null,
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
      senderType: 'customer',
      isRead: false,
      customerRead: true,
    });

    const populatedMessage = await populateMessageDetails(
      SellerMessage.findById(createdMessage._id)
    );

    res.status(201).json(formatMessage(populatedMessage, 'customer'));
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

    const messages = await populateMessageDetails(
      SellerMessage.find({ seller: req.seller._id }).sort({ createdAt: -1 }).limit(20)
    );

    const unreadCount = await SellerMessage.countDocuments({
      seller: req.seller._id,
      isRead: false,
      $or: [{ senderType: 'customer' }, { senderType: { $exists: false } }],
    });

    res.json({
      items: messages.map((message: any) => formatMessage(message, 'seller')),
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

    const message = await populateMessageDetails(
      SellerMessage.findOne({
        _id: req.params.id,
        seller: req.seller._id,
      })
    );

    if (!message) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }

    if (message.senderType !== 'seller') {
      message.isRead = true;
      await message.save();
    }

    res.json(formatMessage(message, 'seller'));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const replyToCustomerMessage = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const replyText = String(req.body?.message || '').trim();

    if (!replyText) {
      res.status(400).json({ message: 'Reply message is required' });
      return;
    }

    const threadMessage = await SellerMessage.findOne({
      _id: req.params.id,
      seller: req.seller._id,
    });

    if (!threadMessage) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }

    const createdReply = await SellerMessage.create({
      seller: req.seller._id,
      customer: threadMessage.customer,
      product: threadMessage.product,
      message: replyText,
      senderType: 'seller',
      isRead: true,
      customerRead: false,
    });

    const populatedReply = await populateMessageDetails(
      SellerMessage.findById(createdReply._id)
    );

    res.status(201).json(formatMessage(populatedReply, 'seller'));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCustomerMessages = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    const messages = await populateMessageDetails(
      SellerMessage.find({ customer: req.user._id }).sort({ createdAt: -1 }).limit(20)
    );

    const unreadCount = await SellerMessage.countDocuments({
      customer: req.user._id,
      senderType: 'seller',
      customerRead: false,
    });

    res.json({
      items: messages.map((message: any) => formatMessage(message, 'customer')),
      unreadCount,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markCustomerMessageRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    const message = await populateMessageDetails(
      SellerMessage.findOne({
        _id: req.params.id,
        customer: req.user._id,
      })
    );

    if (!message) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }

    if (message.senderType === 'seller') {
      message.customerRead = true;
      await message.save();
    }

    res.json(formatMessage(message, 'customer'));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
