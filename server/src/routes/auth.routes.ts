import express from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  getSavedAddresses,
  deleteSavedAddress,
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
router.get('/addresses', protect, getSavedAddresses);
router.delete('/addresses/:id', protect, deleteSavedAddress);
router.put('/profile', protect, updateProfile);
router.put('/profile/avatar', protect, updateAvatar);
router.put('/password', protect, changePassword);

export default router;