import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User, { type IUserSavedAddress } from '../models/User';
import Order from '../models/Order';
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

function normalizeSavedAddress(value: unknown): Omit<IUserSavedAddress, '_id'> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const address = value as Record<string, unknown>;
  const fullName = String(address.fullName || '').trim();
  const street = String(address.street || '').trim();
  const city = String(address.city || '').trim();
  const state = String(address.state || '').trim();
  const zip = String(address.zip || '').trim();
  const country = String(address.country || '').trim();
  const phone = String(address.phone || '').trim();

  if (!street || !city || !state || !zip) {
    return null;
  }

  return {
    fullName,
    street,
    city,
    state,
    zip,
    country,
    phone,
  };
}

function buildSavedAddressKey(address: Omit<IUserSavedAddress, '_id'> | IUserSavedAddress) {
  return [
    address.fullName || '',
    address.street,
    address.city,
    address.state,
    address.zip,
    address.country || '',
    address.phone || '',
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .join('|');
}

function formatSavedAddress(address: IUserSavedAddress) {
  return {
    id: address._id?.toString() || '',
    fullName: address.fullName || '',
    street: address.street,
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: address.country || '',
    phone: address.phone || '',
    isDefault: false,
  };
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

export const getSavedAddresses = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.savedAddresses || user.savedAddresses.length === 0) {
      const orders = await Order.find({ user: req.user._id })
        .select('shippingAddress')
        .sort({ createdAt: -1 });

      const uniqueAddresses = new Map<string, Omit<IUserSavedAddress, '_id'>>();

      orders.forEach((order) => {
        const normalizedAddress = normalizeSavedAddress(order.shippingAddress);

        if (!normalizedAddress) {
          return;
        }

        const addressKey = buildSavedAddressKey(normalizedAddress);

        if (!uniqueAddresses.has(addressKey)) {
          uniqueAddresses.set(addressKey, normalizedAddress);
        }
      });

      if (uniqueAddresses.size > 0) {
        user.savedAddresses = Array.from(uniqueAddresses.values()) as IUserSavedAddress[];
        await user.save();
      }
    }

    res.json(user.savedAddresses.map(formatSavedAddress));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSavedAddress = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const hasSavedAddress = user.savedAddresses.some(
      (savedAddress) => savedAddress._id?.toString() === req.params.id
    );

    if (!hasSavedAddress) {
      res.status(404).json({ message: 'Saved address not found' });
      return;
    }

    user.savedAddresses = user.savedAddresses.filter(
      (savedAddress) => savedAddress._id?.toString() !== req.params.id
    ) as IUserSavedAddress[];
    await user.save();

    res.json({ message: 'Saved address removed successfully' });
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