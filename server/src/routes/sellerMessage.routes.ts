import express from 'express';
import {
  getSellerMessages,
  markSellerMessageRead,
  sendMessageToSeller,
} from '../controllers/sellerMessage.controller';
import { protect } from '../middlewares/auth.middleware';
import { sellerProtect } from '../middlewares/sellerAuth.middleware';

const router = express.Router();

router.post('/', protect, sendMessageToSeller);
router.get('/', sellerProtect, getSellerMessages);
router.put('/:id/read', sellerProtect, markSellerMessageRead);

export default router;
