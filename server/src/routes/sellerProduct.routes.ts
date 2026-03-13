import express from 'express';
import {
  createSellerProduct,
  deleteSellerProduct,
  listSellerProducts,
  updateSellerProduct,
  uploadSellerProductImage,
} from '../controllers/sellerProduct.controller';
import { sellerProtect } from '../middlewares/sellerAuth.middleware';

const router = express.Router();

router.get('/', sellerProtect, listSellerProducts);
router.post('/', sellerProtect, createSellerProduct);
router.post('/upload-image', sellerProtect, uploadSellerProductImage);
router.put('/:id', sellerProtect, updateSellerProduct);
router.delete('/:id', sellerProtect, deleteSellerProduct);

export default router;
