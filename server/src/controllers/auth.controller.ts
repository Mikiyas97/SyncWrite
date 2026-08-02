import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AppError } from '../utils/AppError';
import {
  generateTokensAndSetCookies,
  clearAuthCookies,
  setAccessTokenCookie,
  verifyRefreshToken,
} from '../utils/jwt';
import { isStrongPassword } from '../utils/password';
import { verifyFirebaseIdToken } from '../config/firebase';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    if (!isStrongPassword(password)) {
      return next(
        new AppError(
          'Weak password. Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character (@$!%*?&)',
          400,
          'WEAK_PASSWORD'
        )
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email already in use', 400));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      authProvider: 'local',
    });

    generateTokensAndSetCookies(res, user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return next(new AppError('Invalid email or password', 401));
    }

    generateTokensAndSetCookies(res, user._id);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    const decodedToken = await verifyFirebaseIdToken(token);
    const email = decodedToken.email;
    const googleId = decodedToken.uid;

    if (!email) {
      return next(new AppError('Google account email is not available', 400));
    }

    const name = decodedToken.name || email.split('@')[0];

    let user = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { googleId }],
    });

    if (!user) {
      const randomPassword = `${crypto.randomBytes(16).toString('base64url')}aA1!`;
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      user = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        authProvider: 'google',
        googleId,
      });
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
      }
      await user.save();
    }

    generateTokensAndSetCookies(res, user._id);

    res.status(200).json({
      success: true,
      message: 'Logged in with Google successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AppError('Google authentication failed', 401));
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return next(new AppError('Refresh token missing. Please log in again.', 401));
    }

    let decoded;

    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      clearAuthCookies(res);

      if (error instanceof jwt.TokenExpiredError) {
        return next(new AppError('Refresh token expired. Please log in again.', 401));
      }

      return next(new AppError('Invalid refresh token. Please log in again.', 401));
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      clearAuthCookies(res);
      return next(new AppError('The user belonging to this token does no longer exist.', 401));
    }

    setAccessTokenCookie(res, user._id);

    res.status(200).json({
      success: true,
      message: 'Access token refreshed successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req: Request, res: Response) => {
  clearAuthCookies(res);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const getMe = (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
};
