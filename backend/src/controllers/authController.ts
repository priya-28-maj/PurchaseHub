import { Response } from 'express';
import { body } from 'express-validator';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { generateToken } from '../utils/jwt';
import { AppError, sendError } from '../utils/errors';

export const signupValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export async function signup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id.toString());

    res.status(201).json({
      success: true,
      data: { user, token },
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = generateToken(user._id.toString());

    res.json({
      success: true,
      data: { user, token },
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) throw new AppError('User not found', 404);

    res.json({ success: true, data: user });
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { name },
      { new: true, runValidators: true }
    );

    if (!user) throw new AppError('User not found', 404);

    res.json({ success: true, data: user });
  } catch (error) {
    sendError(res, error);
  }
}
