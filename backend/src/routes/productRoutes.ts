import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  uploadDocument, deleteDocument, getProductTimeline,
  productValidation,
} from '../controllers/productController';

const router = Router();

router.use(authMiddleware);

router.get('/', getProducts);
router.get('/:id/timeline', getProductTimeline);
router.get('/:id', getProduct);
router.post('/', upload.single('image'), validate(productValidation), createProduct);
router.put('/:id', upload.single('image'), updateProduct);
router.delete('/:id', deleteProduct);
router.post('/:id/documents', upload.single('file'), uploadDocument);
router.delete('/:id/documents/:docId', deleteDocument);

export default router;
