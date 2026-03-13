"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderById = exports.getUserOrders = exports.createOrder = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Order_1 = __importDefault(require("../models/Order"));
const Cart_1 = __importDefault(require("../models/Cart"));
const Product_1 = __importDefault(require("../models/Product"));
const createOrder = async (req, res) => {
    try {
        const { items, total, shippingAddress, contactEmail } = req.body;
        if (!items || items.length === 0) {
            res.status(400).json({ message: 'No order items' });
            return;
        }
        const requestedProductIds = items
            .map((item) => String(item?.product || '').trim())
            .filter(Boolean);
        const objectIds = requestedProductIds
            .filter((productId) => mongoose_1.default.Types.ObjectId.isValid(productId))
            .map((productId) => new mongoose_1.default.Types.ObjectId(productId));
        const products = await Product_1.default.find({
            $or: [
                ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
                { id: { $in: requestedProductIds } },
            ],
        }).select('_id seller price discountPrice');
        const productMap = new Map(products.flatMap((product) => {
            const entries = [
                [product._id.toString(), product],
            ];
            if (product.id) {
                entries.push([product.id, product]);
            }
            return entries;
        }));
        const normalizedItems = items
            .map((item) => {
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
            .filter((item) => item !== null);
        if (normalizedItems.length === 0) {
            res.status(400).json({ message: 'No valid order items' });
            return;
        }
        const calculatedTotal = normalizedItems.reduce((sum, item) => {
            return sum + item.price * item.quantity;
        }, 0);
        const order = new Order_1.default({
            user: req.user?._id,
            items: normalizedItems,
            total: Number(total) > 0 ? Number(total) : calculatedTotal,
            shippingAddress,
            contactEmail,
            status: 'pending',
            paymentStatus: 'pending',
        });
        const createdOrder = await order.save();
        // Clear the cart after order
        await Cart_1.default.findOneAndUpdate({ user: req.user?._id }, { items: [] });
        res.status(201).json(createdOrder);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createOrder = createOrder;
const getUserOrders = async (req, res) => {
    try {
        const orders = await Order_1.default.find({ user: req.user?._id })
            .populate('items.product')
            .sort({ createdAt: -1 });
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getUserOrders = getUserOrders;
const getOrderById = async (req, res) => {
    try {
        const order = await Order_1.default.findById(req.params.id).populate('items.product');
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getOrderById = getOrderById;
