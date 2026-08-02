import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  refresh,
  googleLogin,
} from '../controllers/auth.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  googleLoginSchema,
} from '../validators/auth.validator';
import rateLimit from 'express-rate-limit';

const router = Router();

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in a minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/google-login', loginLimiter, validate(googleLoginSchema), googleLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', protect, getMe);

export default router;
