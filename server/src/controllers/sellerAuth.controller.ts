import { type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Seller from '../models/Seller';
import { type SellerAuthRequest } from '../middlewares/sellerAuth.middleware';
import { isDataImage, saveDataImage } from '../utils/imageUpload';

function generateSellerToken(id: string) {
  return jwt.sign(
    { id, role: 'seller', type: 'seller' },
    process.env.SELLER_JWT_SECRET || process.env.JWT_SECRET || 'supersecretjwtkey',
    { expiresIn: '30d' }
  );
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildSellerResponse(seller: {
  _id: { toString(): string };
  businessName: string;
  activeBankAccount: string;
  profileImage?: string;
  validEmail: string;
  mobileNumber: string;
  pickupAddress: string;
  username: string;
  status?: string;
}) {
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
    role: 'seller' as const,
  };
}

export const registerSeller = async (req: Request, res: Response) => {
  try {
    const {
      businessName,
      activeBankAccount,
      profileImage,
      validEmail,
      mobileNumber,
      pickupAddress,
      username,
      password,
    } = req.body;

    if (
      !businessName ||
      !activeBankAccount ||
      !validEmail ||
      !mobileNumber ||
      !pickupAddress ||
      !username ||
      !password
    ) {
      res.status(400).json({
        message:
          'Please provide business name, bank account, email, mobile number, pickup address, username, and password',
      });
      return;
    }

    const cleanEmail = String(validEmail).trim().toLowerCase();
    const cleanUsername = String(username).trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      res.status(400).json({ message: 'Please provide a valid email address' });
      return;
    }

    const existingSeller = await Seller.findOne({
      $or: [{ username: cleanUsername }, { validEmail: cleanEmail }],
    });

    if (existingSeller) {
      res.status(400).json({ message: 'Seller username or email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const seller = await Seller.create({
      businessName: String(businessName).trim(),
      activeBankAccount: String(activeBankAccount).trim(),
      validEmail: cleanEmail,
      mobileNumber: String(mobileNumber).trim(),
      pickupAddress: String(pickupAddress).trim(),
      username: cleanUsername,
      password: hashedPassword,
      profileImage: '',
    });

    if (isDataImage(profileImage)) {
      const uploadedImage = await saveDataImage(
        profileImage,
        ['sellers', seller._id.toString(), 'profile'],
        'profile'
      );

      seller.profileImage = uploadedImage.url;
      await seller.save();
    }

    res.status(201).json({
      ...buildSellerResponse(seller),
      token: generateSellerToken(seller._id.toString()),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const loginSeller = async (req: Request, res: Response) => {
  try {
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email
        : typeof req.body?.validEmail === 'string'
          ? req.body.validEmail
          : '';
    const { password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Please provide email and password' });
      return;
    }

    const seller = await Seller.findOne({
      validEmail: String(email).trim().toLowerCase(),
    });

    if (!seller || !seller.password || !(await bcrypt.compare(password, seller.password))) {
      res.status(401).json({ message: 'Invalid seller email or password' });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSellerMe = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    res.json(buildSellerResponse(req.seller));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
