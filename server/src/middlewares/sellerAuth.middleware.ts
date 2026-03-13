import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Seller, { type ISeller } from '../models/Seller';

export interface SellerAuthRequest extends Request {
  seller?: ISeller;
}

export const sellerProtect = async (
  req: SellerAuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Not authorized, no seller token' });
    return;
  }

  try {
    const token = authorization.split(' ')[1];
    const decoded = jwt.verify(
      token,
      process.env.SELLER_JWT_SECRET || process.env.JWT_SECRET || 'supersecretjwtkey'
    ) as { id?: string; role?: string; type?: string };

    if (!decoded.id || (decoded.role !== 'seller' && decoded.type !== 'seller')) {
      res.status(401).json({ message: 'Not authorized as seller' });
      return;
    }

    const seller = await Seller.findById(decoded.id).select('-password');

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
  } catch {
    res.status(401).json({ message: 'Not authorized, seller token failed' });
  }
};
