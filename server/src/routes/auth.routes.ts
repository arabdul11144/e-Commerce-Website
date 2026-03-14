import express from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  updateAvatar,
  changePassword,
  subscribeToNewsletter,
} from '../controllers/auth.controller';
import { protect } from '../middlewares/auth.middleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/newsletter/subscribe', subscribeToNewsletter);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/profile/avatar', protect, updateAvatar);
router.put('/password', protect, changePassword);

export default router;
