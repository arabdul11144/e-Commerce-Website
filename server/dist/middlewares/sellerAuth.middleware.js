"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sellerProtect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Seller_1 = __importDefault(require("../models/Seller"));
const sellerProtect = async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Not authorized, no seller token' });
        return;
    }
    try {
        const token = authorization.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, process.env.SELLER_JWT_SECRET || process.env.JWT_SECRET || 'supersecretjwtkey');
        if (!decoded.id || (decoded.role !== 'seller' && decoded.type !== 'seller')) {
            res.status(401).json({ message: 'Not authorized as seller' });
            return;
        }
        const seller = await Seller_1.default.findById(decoded.id).select('-password');
        if (!seller) {
            res.status(401).json({ message: 'Not authorized, seller not found' });
            return;
        }
        if (seller.status === 'blocked') {
            res.status(403).json({ message: 'Seller account is blocked' });
            return;
        }
        req.seller = seller;
        next();
    }
    catch {
        res.status(401).json({ message: 'Not authorized, seller token failed' });
    }
};
exports.sellerProtect = sellerProtect;
