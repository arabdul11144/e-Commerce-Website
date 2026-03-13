"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markSellerMessageRead = exports.getSellerMessages = exports.sendMessageToSeller = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Seller_1 = __importDefault(require("../models/Seller"));
const Product_1 = __importDefault(require("../models/Product"));
const SellerMessage_1 = __importDefault(require("../models/SellerMessage"));
function buildProductIdFilter(productId) {
    if (mongoose_1.default.Types.ObjectId.isValid(productId)) {
        return {
            $or: [{ _id: new mongoose_1.default.Types.ObjectId(productId) }, { id: productId }],
        };
    }
    return { id: productId };
}
function formatMessage(message) {
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
const sendMessageToSeller = async (req, res) => {
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
        const seller = await Seller_1.default.findById(String(sellerId));
        if (!seller) {
            res.status(404).json({ message: 'Seller not found' });
            return;
        }
        let product = null;
        if (productId) {
            product = await Product_1.default.findOne(buildProductIdFilter(String(productId)));
            if (!product) {
                res.status(404).json({ message: 'Product not found' });
                return;
            }
            if (product.seller?.toString() !== seller._id.toString()) {
                res.status(400).json({ message: 'Product does not belong to this seller' });
                return;
            }
        }
        const createdMessage = await SellerMessage_1.default.create({
            seller: seller._id,
            customer: req.user._id,
            product: product?._id,
            message: String(message).trim(),
            isRead: false,
        });
        const populatedMessage = await SellerMessage_1.default.findById(createdMessage._id)
            .populate('customer', 'name email')
            .populate('product', 'name slug');
        res.status(201).json(formatMessage(populatedMessage));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.sendMessageToSeller = sendMessageToSeller;
const getSellerMessages = async (req, res) => {
    try {
        if (!req.seller) {
            res.status(401).json({ message: 'Seller not found' });
            return;
        }
        const messages = await SellerMessage_1.default.find({ seller: req.seller._id })
            .populate('customer', 'name email')
            .populate('product', 'name slug')
            .sort({ createdAt: -1 })
            .limit(20);
        const unreadCount = await SellerMessage_1.default.countDocuments({
            seller: req.seller._id,
            isRead: false,
        });
        res.json({
            items: messages.map((message) => formatMessage(message)),
            unreadCount,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getSellerMessages = getSellerMessages;
const markSellerMessageRead = async (req, res) => {
    try {
        if (!req.seller) {
            res.status(401).json({ message: 'Seller not found' });
            return;
        }
        const message = await SellerMessage_1.default.findOne({
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.markSellerMessageRead = markSellerMessageRead;
