import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import {
  signup, login, getProfile, updateProfile,
  signupValidation, loginValidation,
} from '../controllers/authController';

const router = Router();

router.post('/signup', validate(signupValidation), signup);
router.post('/login', validate(loginValidation), login);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

export default router;
