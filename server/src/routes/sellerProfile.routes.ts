import express from 'express';
import {
  changeSellerPassword,
  getSellerProfile,
  updateSellerProfile,
  updateSellerProfileImage,
} from '../controllers/sellerProfile.controller';
import { sellerProtect } from '../middlewares/sellerAuth.middleware';

const router = express.Router();

router.get('/', sellerProtect, getSellerProfile);
router.put('/', sellerProtect, updateSellerProfile);
router.put('/image', sellerProtect, updateSellerProfileImage);
router.put('/password', sellerProtect, changeSellerPassword);

export default router;
