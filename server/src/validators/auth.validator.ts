import { z } from 'zod';
import { STRONG_PASSWORD_REGEX, STRONG_PASSWORD_MESSAGE } from '../utils/password';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .regex(STRONG_PASSWORD_REGEX, STRONG_PASSWORD_MESSAGE),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const googleLoginSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Google ID token is required'),
  }),
});
