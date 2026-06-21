import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../utils/AppError";

type Target = "body" | "query" | "params";

export function validate(schema: ZodSchema, target: Target = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(AppError.badRequest("Validation failed", result.error.flatten()));
    }
    // Replace with the parsed (and coerced/defaulted) value.
    (req as Record<Target, unknown>)[target] = result.data;
    next();
  };
}
