import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import User from '../models/User';
import { verifyAccessToken } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const extractAccessToken = (req: Request): string | undefined => {
  if (req.cookies.access_token) {
    return req.cookies.access_token;
  }

  // Legacy cookie support during migration
  if (req.cookies.jwt) {
    return req.cookies.jwt;
  }

  if (req.headers.authorization?.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }

  return undefined;
};

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractAccessToken(req);

    if (!token) {
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    let decoded: { userId: string };

    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return next(
          new AppError('Access token expired. Please refresh your session.', 401, 'TOKEN_EXPIRED')
        );
      }
      return next(new AppError('Invalid token or authorization failed.', 401));
    }

    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token does no longer exist.', 401));
    }

    req.user = currentUser;
    next();
  } catch (error) {
    return next(new AppError('Invalid token or authorization failed.', 401));
  }
};
