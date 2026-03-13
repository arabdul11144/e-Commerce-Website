"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSellerMe = exports.loginSeller = exports.registerSeller = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Seller_1 = __importDefault(require("../models/Seller"));
const imageUpload_1 = require("../utils/imageUpload");
function generateSellerToken(id) {
    return jsonwebtoken_1.default.sign({ id, role: 'seller', type: 'seller' }, process.env.SELLER_JWT_SECRET || process.env.JWT_SECRET || 'supersecretjwtkey', { expiresIn: '30d' });
}
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function buildSellerResponse(seller) {
    return {
        id: seller._id.toString(),
        name: seller.businessName,
        businessName: seller.businessName,
        activeBankAccount: seller.activeBankAccount,
        profileImage: seller.profileImage || '',
        validEmail: seller.validEmail,
        mobileNumber: seller.mobileNumber,
        pickupAddress: seller.pickupAddress,
        username: seller.username,
        status: seller.status || 'active',
        role: 'seller',
    };
}
const registerSeller = async (req, res) => {
    try {
        const { businessName, activeBankAccount, profileImage, validEmail, mobileNumber, pickupAddress, username, password, } = req.body;
        if (!businessName ||
            !activeBankAccount ||
            !validEmail ||
            !mobileNumber ||
            !pickupAddress ||
            !username ||
            !password) {
            res.status(400).json({
                message: 'Please provide business name, bank account, email, mobile number, pickup address, username, and password',
            });
            return;
        }
        const cleanEmail = String(validEmail).trim().toLowerCase();
        const cleanUsername = String(username).trim().toLowerCase();
        if (!isValidEmail(cleanEmail)) {
            res.status(400).json({ message: 'Please provide a valid email address' });
            return;
        }
        const existingSeller = await Seller_1.default.findOne({
            $or: [{ username: cleanUsername }, { validEmail: cleanEmail }],
        });
        if (existingSeller) {
            res.status(400).json({ message: 'Seller username or email already exists' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(String(password), 10);
        const seller = await Seller_1.default.create({
            businessName: String(businessName).trim(),
            activeBankAccount: String(activeBankAccount).trim(),
            validEmail: cleanEmail,
            mobileNumber: String(mobileNumber).trim(),
            pickupAddress: String(pickupAddress).trim(),
            username: cleanUsername,
            password: hashedPassword,
            profileImage: '',
        });
        if ((0, imageUpload_1.isDataImage)(profileImage)) {
            const uploadedImage = await (0, imageUpload_1.saveDataImage)(profileImage, ['sellers', seller._id.toString(), 'profile'], 'profile');
            seller.profileImage = uploadedImage.url;
            await seller.save();
        }
        res.status(201).json({
            ...buildSellerResponse(seller),
            token: generateSellerToken(seller._id.toString()),
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.registerSeller = registerSeller;
const loginSeller = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({ message: 'Please provide username and password' });
            return;
        }
        const seller = await Seller_1.default.findOne({
            username: String(username).trim().toLowerCase(),
        });
        if (!seller || !seller.password || !(await bcryptjs_1.default.compare(password, seller.password))) {
            res.status(401).json({ message: 'Invalid seller username or password' });
            return;
        }
        if (seller.status === 'blocked') {
            res.status(403).json({ message: 'Seller account is blocked' });
            return;
        }
        res.json({
            ...buildSellerResponse(seller),
            token: generateSellerToken(seller._id.toString()),
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.loginSeller = loginSeller;
const getSellerMe = async (req, res) => {
    try {
        if (!req.seller) {
            res.status(401).json({ message: 'Seller not found' });
            return;
        }
        res.json(buildSellerResponse(req.seller));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getSellerMe = getSellerMe;
