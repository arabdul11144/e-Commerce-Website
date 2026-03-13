import { type Response } from 'express';
import bcrypt from 'bcryptjs';
import Seller from '../models/Seller';
import { type SellerAuthRequest } from '../middlewares/sellerAuth.middleware';
import { isDataImage, isStoredImagePath, saveDataImage } from '../utils/imageUpload';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildSellerProfileResponse(seller: {
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

export const getSellerProfile = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    res.json(buildSellerProfileResponse(req.seller));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSellerProfile = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const {
      businessName,
      activeBankAccount,
      profileImage,
      validEmail,
      mobileNumber,
      pickupAddress,
      username,
    } = req.body;

    if (
      !businessName ||
      !activeBankAccount ||
      !validEmail ||
      !mobileNumber ||
      !pickupAddress ||
      !username
    ) {
      res.status(400).json({
        message:
          'Please provide business name, bank account, email, mobile number, pickup address, and username',
      });
      return;
    }

    const seller = await Seller.findById(req.seller._id);

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

    const existingSeller = await Seller.findOne({
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

      if (isDataImage(profileImage)) {
        const uploadedImage = await saveDataImage(
          profileImage,
          ['sellers', seller._id.toString(), 'profile'],
          'profile'
        );
        seller.profileImage = uploadedImage.url;
      } else if (isStoredImagePath(normalizedProfileImage) || normalizedProfileImage === '') {
        seller.profileImage = normalizedProfileImage;
      }
    }

    const updatedSeller = await seller.save();

    res.json(buildSellerProfileResponse(updatedSeller));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSellerProfileImage = async (req: SellerAuthRequest, res: Response) => {
  try {
    if (!req.seller) {
      res.status(401).json({ message: 'Seller not found' });
      return;
    }

    const { image, removeImage } = req.body;
    const seller = await Seller.findById(req.seller._id);

    if (!seller) {
      res.status(404).json({ message: 'Seller not found' });
      return;
    }

    if (removeImage) {
      seller.profileImage = '';
    } else if (isDataImage(image)) {
      const uploadedImage = await saveDataImage(
        image,
        ['sellers', seller._id.toString(), 'profile'],
        'profile'
      );
      seller.profileImage = uploadedImage.url;
    } else {
      res.status(400).json({ message: 'Invalid image upload' });
      return;
    }

    const updatedSeller = await seller.save();
    res.json(buildSellerProfileResponse(updatedSeller));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const changeSellerPassword = async (req: SellerAuthRequest, res: Response) => {
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

    const seller = await Seller.findById(req.seller._id);

    if (!seller || !seller.password) {
      res.status(404).json({ message: 'Seller not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, seller.password);

    if (!isMatch) {
      res.status(400).json({ message: 'Current password is incorrect' });
      return;
    }

    seller.password = await bcrypt.hash(String(newPassword), 10);
    await seller.save();

    res.json({ message: 'Seller password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
