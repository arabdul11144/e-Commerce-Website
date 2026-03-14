import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User';
import { AuthRequest } from '../middlewares/auth.middleware';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkey', {
    expiresIn: '30d',
  });
};

function getNewsletterSubscriptionsCollection() {
  return mongoose.connection.collection('newsletterSubscriptions');
}

export const registerUser = async (req: Request, res: Response) => {
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

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const cleanFirstName = String(firstName).trim();
    const cleanLastName = String(lastName).trim();
    const name = `${cleanFirstName} ${cleanLastName}`.trim();

    const user = await User.create({
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
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Please provide email and password' });
      return;
    }

    const user = await User.findOne({ email });

    if (user && user.password && (await bcrypt.compare(password, user.password))) {
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
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const subscribeToNewsletter = async (req: Request, res: Response) => {
  try {
    const normalizedEmail =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
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

    const user = await User.findById(req.user._id);

    if (!user || !user.password) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(400).json({ message: 'Current password is incorrect' });
      return;
    }

    const cleanEmail = String(email).trim();

    const existingUserWithEmail = await User.findOne({
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    const { avatar, removeAvatar } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (removeAvatar) {
      user.avatar = '';
    } else {
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
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

    const user = await User.findById(req.user._id);
    if (!user || !user.password) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({ message: 'Current password is incorrect' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
