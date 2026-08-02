import jwt from 'jsonwebtoken';
import { Response } from 'express';
import mongoose from 'mongoose';

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const getAccessSecret = () => process.env.JWT_SECRET || 'fallback_secret';
const getRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback_refresh_secret';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

export interface AccessTokenPayload {
  userId: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
}

export const generateAccessToken = (userId: string | mongoose.Types.ObjectId): string => {
  return jwt.sign({ userId: userId.toString(), type: 'access' }, getAccessSecret(), {
    expiresIn: '15m',
  });
};

export const generateRefreshToken = (userId: string | mongoose.Types.ObjectId): string => {
  return jwt.sign({ userId: userId.toString(), type: 'refresh' }, getRefreshSecret(), {
    expiresIn: '30d',
  });
};

export const setAccessTokenCookie = (
  res: Response,
  userId: string | mongoose.Types.ObjectId
): string => {
  const token = generateAccessToken(userId);

  res.cookie('access_token', token, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });

  return token;
};

export const setRefreshTokenCookie = (
  res: Response,
  userId: string | mongoose.Types.ObjectId
): string => {
  const token = generateRefreshToken(userId);

  res.cookie('refresh_token', token, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  });

  return token;
};

/** Issue short-lived access + long-lived refresh tokens as HTTP-only cookies. */
export const generateTokensAndSetCookies = (
  res: Response,
  userId: string | mongoose.Types.ObjectId
) => {
  const accessToken = setAccessTokenCookie(res, userId);
  const refreshToken = setRefreshTokenCookie(res, userId);

  return { accessToken, refreshToken };
};

/** @deprecated Use generateTokensAndSetCookies instead */
export const generateTokenAndSetCookie = (
  res: Response,
  userId: string | mongoose.Types.ObjectId
) => {
  return generateTokensAndSetCookies(res, userId).accessToken;
};

export const clearAuthCookies = (res: Response) => {
  const expired = { ...cookieOptions, expires: new Date(0) };

  res.cookie('access_token', '', expired);
  res.cookie('refresh_token', '', expired);
  // Clear legacy cookie from older sessions
  res.cookie('jwt', '', expired);
};

/** @deprecated Use clearAuthCookies instead */
export const clearCookie = (res: Response) => {
  clearAuthCookies(res);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, getAccessSecret()) as AccessTokenPayload;

  if (decoded.type !== 'access') {
    throw new jwt.JsonWebTokenError('Invalid access token type');
  }

  return decoded;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, getRefreshSecret()) as RefreshTokenPayload;

  if (decoded.type !== 'refresh') {
    throw new jwt.JsonWebTokenError('Invalid refresh token type');
  }

  return decoded;
};
