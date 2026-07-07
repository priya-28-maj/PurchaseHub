import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  getRepairs, createRepair, updateRepair, deleteRepair,
  repairValidation,
} from '../controllers/repairController';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/', getRepairs);
router.post('/', upload.single('invoice'), validate(repairValidation), createRepair);
router.put('/:id', upload.single('invoice'), updateRepair);
router.delete('/:id', deleteRepair);

export default router;
