import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.issues.map(e => ({ field: e.path.join('.'), message: e.message }));
  } else if ((err as any).name === 'MongoServerError' && (err as any).code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value entered';
  } else {
    // In production, we don't want to leak internal error details
    console.error('ERROR 💥', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err instanceof AppError && err.code && { code: err.code }),
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && !errors && { stack: err.stack }),
  });
};
