import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { config } from '../config';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // Handle Prisma Database Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Unique constraint violation
      statusCode = 409;
      code = 'CONFLICT_ERROR';
      const fields = (err.meta?.target as string[]) || [];
      message = `${fields.join(', ')} already exists`;
    } else if (err.code === 'P2025') {
      // Record not found
      statusCode = 404;
      code = 'NOT_FOUND';
      message = err.meta?.cause as string || 'Requested record not found';
    }
  }

  // Hide internal error details in production
  if (statusCode === 500 && config.nodeEnv === 'production') {
    message = 'Internal server error';
    details = null;
  }

  // Log error (for debugging)
  if (config.nodeEnv !== 'test') {
    console.error(`[Error] ${req.method} ${req.url} - Status ${statusCode} - Code ${code} - ${err.message}`);
    if (err.stack) {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}
