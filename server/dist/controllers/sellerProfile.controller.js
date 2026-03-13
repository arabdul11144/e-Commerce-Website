"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeSellerPassword = exports.updateSellerProfileImage = exports.updateSellerProfile = exports.getSellerProfile = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Seller_1 = __importDefault(require("../models/Seller"));
const imageUpload_1 = require("../utils/imageUpload");
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function buildSellerProfileResponse(seller) {
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
const getSellerProfile = async (req, res) => {
    try {
        if (!req.seller) {
            res.status(401).json({ message: 'Seller not found' });
            return;
        }
        res.json(buildSellerProfileResponse(req.seller));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getSellerProfile = getSellerProfile;
const updateSellerProfile = async (req, res) => {
    try {
        if (!req.seller) {
            res.status(401).json({ message: 'Seller not found' });
            return;
        }
        const { businessName, activeBankAccount, profileImage, validEmail, mobileNumber, pickupAddress, username, } = req.body;
        if (!businessName ||
            !activeBankAccount ||
            !validEmail ||
            !mobileNumber ||
            !pickupAddress ||
            !username) {
            res.status(400).json({
                message: 'Please provide business name, bank account, email, mobile number, pickup address, and username',
            });
            return;
        }
        const seller = await Seller_1.default.findById(req.seller._id);
        if (!seller) {
            res.status(404).json({ message: 'Seller not found' });
            return;
        }
        const cleanEmail = String(validEmail).trim().toLowerCase();
        const cleanUsername = String(username).trim().toLowerCase();
        if (!isValidEmail(cleanEmail)) {
            res.status(400).json({ message: 'Please provide a valid email address' });
            return;
        }
        const existingSeller = await Seller_1.default.findOne({
            _id: { $ne: seller._id },
            $or: [{ username: cleanUsername }, { validEmail: cleanEmail }],
        });
        if (existingSeller) {
            res.status(400).json({ message: 'Seller username or email already exists' });
            return;
        }
        seller.businessName = String(businessName).trim();
        seller.activeBankAccount = String(activeBankAccount).trim();
        seller.validEmail = cleanEmail;
        seller.mobileNumber = String(mobileNumber).trim();
        seller.pickupAddress = String(pickupAddress).trim();
        seller.username = cleanUsername;
        if (typeof profileImage === 'string') {
            const normalizedProfileImage = profileImage.trim();
            if ((0, imageUpload_1.isDataImage)(profileImage)) {
                const uploadedImage = await (0, imageUpload_1.saveDataImage)(profileImage, ['sellers', seller._id.toString(), 'profile'], 'profile');
                seller.profileImage = uploadedImage.url;
            }
            else if ((0, imageUpload_1.isStoredImagePath)(normalizedProfileImage) || normalizedProfileImage === '') {
                seller.profileImage = normalizedProfileImage;
            }
        }
        const updatedSeller = await seller.save();
        res.json(buildSellerProfileResponse(updatedSeller));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateSellerProfile = updateSellerProfile;
const updateSellerProfileImage = async (req, res) => {
    try {
        if (!req.seller) {
            res.status(401).json({ message: 'Seller not found' });
            return;
        }
        const { image, removeImage } = req.body;
        const seller = await Seller_1.default.findById(req.seller._id);
        if (!seller) {
            res.status(404).json({ message: 'Seller not found' });
            return;
        }
        if (removeImage) {
            seller.profileImage = '';
        }
        else if ((0, imageUpload_1.isDataImage)(image)) {
            const uploadedImage = await (0, imageUpload_1.saveDataImage)(image, ['sellers', seller._id.toString(), 'profile'], 'profile');
            seller.profileImage = uploadedImage.url;
        }
        else {
            res.status(400).json({ message: 'Invalid image upload' });
            return;
        }
        const updatedSeller = await seller.save();
        res.json(buildSellerProfileResponse(updatedSeller));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateSellerProfileImage = updateSellerProfileImage;
const changeSellerPassword = async (req, res) => {
    try {
        if (!req.seller) {
            res.status(401).json({ message: 'Seller not found' });
            return;
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res.status(400).json({ message: 'Please provide current and new password' });
            return;
        }
        const seller = await Seller_1.default.findById(req.seller._id);
        if (!seller || !seller.password) {
            res.status(404).json({ message: 'Seller not found' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(currentPassword, seller.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Current password is incorrect' });
            return;
        }
        seller.password = await bcryptjs_1.default.hash(String(newPassword), 10);
        await seller.save();
        res.json({ message: 'Seller password updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.changeSellerPassword = changeSellerPassword;
