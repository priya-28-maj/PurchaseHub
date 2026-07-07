import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { scanReceipt, getOcrStatus } from '../controllers/ocrController';

const router = Router();

router.use(authMiddleware);
router.get('/status', getOcrStatus);
router.post('/scan', upload.single('file'), scanReceipt);

export default router;
