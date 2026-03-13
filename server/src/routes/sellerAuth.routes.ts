import express from 'express';
import {
  getSellerMe,
  loginSeller,
  registerSeller,
} from '../controllers/sellerAuth.controller';
import { sellerProtect } from '../middlewares/sellerAuth.middleware';

const router = express.Router();

router.post('/register', registerSeller);
router.post('/login', loginSeller);
router.get('/me', sellerProtect, getSellerMe);

export default router;
