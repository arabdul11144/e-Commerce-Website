import express from 'express';
import {
  getCustomerMessages,
  getSellerMessages,
  markCustomerMessageRead,
  markSellerMessageRead,
  replyToCustomerMessage,
  sendMessageToSeller,
} from '../controllers/sellerMessage.controller';
import { protect } from '../middlewares/auth.middleware';
import { sellerProtect } from '../middlewares/sellerAuth.middleware';

const router = express.Router();

router.post('/', protect, sendMessageToSeller);
router.get('/customer', protect, getCustomerMessages);
router.put('/customer/:id/read', protect, markCustomerMessageRead);
router.get('/', sellerProtect, getSellerMessages);
router.put('/:id/read', sellerProtect, markSellerMessageRead);
router.post('/:id/reply', sellerProtect, replyToCustomerMessage);

export default router;
