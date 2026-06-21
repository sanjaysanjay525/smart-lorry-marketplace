import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@smart-lorry/shared";
import { AppError } from "../utils/AppError";

// Usage: router.post("/vehicles", authenticate, requireRole("owner"), handler)
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden(`This action requires one of these roles: ${roles.join(", ")}`));
    }
    next();
  };
}
