"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.updateAvatar = exports.updateProfile = exports.getMe = exports.subscribeToNewsletter = exports.loginUser = exports.registerUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkey', {
        expiresIn: '30d',
    });
};
function getNewsletterSubscriptionsCollection() {
    return mongoose_1.default.connection.collection('newsletterSubscriptions');
}
const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password } = req.body;
        if (!firstName || !lastName || !email || !phone || !password) {
            res.status(400).json({
                message: 'Please provide first name, last name, email, phone, and password',
            });
            return;
        }
        if (!String(phone).startsWith('+94')) {
            res.status(400).json({
                message: 'Phone number must start with +94',
            });
            return;
        }
        const userExists = await User_1.default.findOne({ email });
        if (userExists) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        const cleanFirstName = String(firstName).trim();
        const cleanLastName = String(lastName).trim();
        const name = `${cleanFirstName} ${cleanLastName}`.trim();
        const user = await User_1.default.create({
            name,
            firstName: cleanFirstName,
            lastName: cleanLastName,
            email: String(email).trim(),
            phone: String(phone).trim(),
            password: hashedPassword,
            avatar: '',
        });
        if (user) {
            res.status(201).json({
                id: user._id,
                name: user.name,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar: user.avatar || '',
                token: generateToken(user._id.toString()),
            });
        }
        else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.registerUser = registerUser;
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: 'Please provide email and password' });
            return;
        }
        const user = await User_1.default.findOne({ email });
        if (user && user.password && (await bcryptjs_1.default.compare(password, user.password))) {
            res.json({
                id: user._id,
                name: user.name,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar: user.avatar || '',
                token: generateToken(user._id.toString()),
            });
        }
        else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.loginUser = loginUser;
const subscribeToNewsletter = async (req, res) => {
    try {
        const normalizedEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        if (!normalizedEmail) {
            res.status(400).json({ message: 'Please provide an email address' });
            return;
        }
        if (!EMAIL_REGEX.test(normalizedEmail)) {
            res.status(400).json({ message: 'Please provide a valid email address' });
            return;
        }
        const subscriptions = getNewsletterSubscriptionsCollection();
        const existingSubscription = await subscriptions.findOne({ email: normalizedEmail });
        if (existingSubscription) {
            res.status(200).json({ message: 'This email is already subscribed.' });
            return;
        }
        const timestamp = new Date();
        await subscriptions.insertOne({
            email: normalizedEmail,
            createdAt: timestamp,
            updatedAt: timestamp,
        });
        res.status(201).json({
            message: 'Subscription successful. Thanks for joining LapLab updates!',
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.subscribeToNewsletter = subscribeToNewsletter;
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'User not found' });
            return;
        }
        const user = await User_1.default.findById(req.user._id).select('-password');
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMe = getMe;
const updateProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'User not found' });
            return;
        }
        const { firstName, lastName, email, phone, password } = req.body;
        if (!firstName || !lastName || !email || !phone || !password) {
            res.status(400).json({
                message: 'Please provide first name, last name, email, phone, and current password',
            });
            return;
        }
        if (!String(phone).startsWith('+94')) {
            res.status(400).json({
                message: 'Phone number must start with +94',
            });
            return;
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user || !user.password) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Current password is incorrect' });
            return;
        }
        const cleanEmail = String(email).trim();
        const existingUserWithEmail = await User_1.default.findOne({
            email: cleanEmail,
            _id: { $ne: user._id },
        });
        if (existingUserWithEmail) {
            res.status(400).json({ message: 'Email is already in use' });
            return;
        }
        const cleanFirstName = String(firstName).trim();
        const cleanLastName = String(lastName).trim();
        user.firstName = cleanFirstName;
        user.lastName = cleanLastName;
        user.name = `${cleanFirstName} ${cleanLastName}`.trim();
        user.email = cleanEmail;
        user.phone = String(phone).trim();
        const updatedUser = await user.save();
        res.json({
            id: updatedUser._id,
            name: updatedUser.name,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            phone: updatedUser.phone,
            role: updatedUser.role,
            avatar: updatedUser.avatar || '',
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateProfile = updateProfile;
const updateAvatar = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'User not found' });
            return;
        }
        const { avatar, removeAvatar } = req.body;
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (removeAvatar) {
            user.avatar = '';
        }
        else {
            if (!avatar || typeof avatar !== 'string') {
                res.status(400).json({ message: 'Please provide a valid avatar image' });
                return;
            }
            if (!avatar.startsWith('data:image/')) {
                res.status(400).json({ message: 'Invalid image format' });
                return;
            }
            user.avatar = avatar;
        }
        const updatedUser = await user.save();
        res.json({
            id: updatedUser._id,
            name: updatedUser.name,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            phone: updatedUser.phone,
            role: updatedUser.role,
            avatar: updatedUser.avatar || '',
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateAvatar = updateAvatar;
const changePassword = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'User not found' });
            return;
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res.status(400).json({ message: 'Please provide current and new password' });
            return;
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user || !user.password) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Current password is incorrect' });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        user.password = await bcryptjs_1.default.hash(newPassword, salt);
        await user.save();
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.changePassword = changePassword;
