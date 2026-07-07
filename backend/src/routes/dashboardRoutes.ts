import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getDashboardStats, getCategories } from '../controllers/dashboardController';

const router = Router();

router.use(authMiddleware);

router.get('/stats', getDashboardStats);
router.get('/categories', getCategories);

export default router;
