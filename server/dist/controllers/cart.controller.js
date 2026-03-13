"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getCart = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Cart_1 = __importDefault(require("../models/Cart"));
const Product_1 = __importDefault(require("../models/Product"));
const buildProductLookupQuery = (productId) => {
    const lookupConditions = [{ id: productId }];
    if (mongoose_1.default.Types.ObjectId.isValid(productId)) {
        lookupConditions.push({ _id: productId });
    }
    return { $or: lookupConditions };
};
const resolveProductId = async (productId) => {
    const product = await Product_1.default.findOne(buildProductLookupQuery(productId)).select('_id');
    return product?._id.toString() ?? null;
};
const normalizeQuantity = (value, fallback = 1) => {
    const quantity = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(quantity)) {
        return fallback;
    }
    return Math.max(0, Math.trunc(quantity));
};
const getCart = async (req, res) => {
    try {
        const cart = await Cart_1.default.findOne({ user: req.user?._id }).populate('items.product');
        if (cart) {
            res.json(cart);
        }
        else {
            res.json({ items: [] });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getCart = getCart;
const addToCart = async (req, res) => {
    try {
        const productId = typeof req.body?.productId === 'string' ? req.body.productId : '';
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
        let cart = await Cart_1.default.findOne({ user: req.user?._id });
        if (!cart) {
            cart = await Cart_1.default.create({
                user: req.user?._id,
                items: [{ product: new mongoose_1.default.Types.ObjectId(resolvedProductId), quantity }],
            });
        }
        else {
            const itemIndex = cart.items.findIndex((item) => item.product.toString() === resolvedProductId);
            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += quantity;
            }
            else {
                cart.items.push({
                    product: new mongoose_1.default.Types.ObjectId(resolvedProductId),
                    quantity,
                });
            }
            await cart.save();
        }
        const updatedCart = await Cart_1.default.findOne({ user: req.user?._id }).populate('items.product');
        res.status(201).json(updatedCart);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.addToCart = addToCart;
const updateCartItem = async (req, res) => {
    try {
        const productId = String(req.params.productId ?? '');
        const quantity = normalizeQuantity(req.body?.quantity, 0);
        const cart = await Cart_1.default.findOne({ user: req.user?._id });
        if (!cart) {
            res.status(404).json({ message: 'Cart not found' });
            return;
        }
        const resolvedProductId = await resolveProductId(productId);
        const targetProductId = resolvedProductId ?? productId;
        const itemIndex = cart.items.findIndex((item) => item.product.toString() === targetProductId);
        if (itemIndex === -1) {
            res.status(404).json({ message: 'Item not found in cart' });
            return;
        }
        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        }
        else {
            cart.items[itemIndex].quantity = quantity;
        }
        await cart.save();
        const updatedCart = await Cart_1.default.findOne({ user: req.user?._id }).populate('items.product');
        res.json(updatedCart);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateCartItem = updateCartItem;
const removeFromCart = async (req, res) => {
    try {
        const productId = String(req.params.productId ?? '');
        const cart = await Cart_1.default.findOne({ user: req.user?._id });
        const resolvedProductId = await resolveProductId(productId);
        const targetProductId = resolvedProductId ?? productId;
        if (cart) {
            cart.items = cart.items.filter((item) => item.product.toString() !== targetProductId);
            await cart.save();
            const updatedCart = await Cart_1.default.findOne({ user: req.user?._id }).populate('items.product');
            res.json(updatedCart);
        }
        else {
            res.status(404).json({ message: 'Cart not found' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.removeFromCart = removeFromCart;
const clearCart = async (req, res) => {
    try {
        const cart = await Cart_1.default.findOne({ user: req.user?._id });
        if (cart) {
            cart.items = [];
            await cart.save();
            res.json({ message: 'Cart cleared' });
        }
        else {
            res.status(404).json({ message: 'Cart not found' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.clearCart = clearCart;
