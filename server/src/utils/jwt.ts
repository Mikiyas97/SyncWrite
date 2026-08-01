import jwt from 'jsonwebtoken';
import { Response } from 'express';
import mongoose from 'mongoose';

export const generateTokenAndSetCookie = (res: Response, userId: string | mongoose.Types.ObjectId) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  
  const token = jwt.sign({ userId }, secret, {
    expiresIn: '7d',
  });

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return token;
};

export const clearCookie = (res: Response) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
  });
};
