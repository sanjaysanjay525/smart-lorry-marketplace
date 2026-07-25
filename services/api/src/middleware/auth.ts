import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@slm/shared';
import { config } from '../config';
import { AppError } from './errorHandler';

interface JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new AppError('No token provided', 401, 'UNAUTHORIZED');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new AppError('Invalid authorization header format. Use Bearer <token>', 401, 'UNAUTHORIZED');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      email: decoded.email,
    };
    
    next();
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token has expired', 401, 'TOKEN_EXPIRED'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401, 'UNAUTHORIZED'));
    } else {
      next(error);
    }
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Role '${req.user.role}' is not allowed to access this resource`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}
