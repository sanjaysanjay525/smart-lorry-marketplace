import { Router } from "express";
import { registerSchema, loginSchema, refreshSchema } from "@smart-lorry/shared";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import * as authService from "../services/auth.service";

export const authRouter = Router();

/**
 * POST /api/v1/auth/register
 * Public. Creates a user with the given role (customer | owner | driver).
 * Admin accounts are never self-registered — see Phase 6 admin provisioning.
 */
authRouter.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  })
);

/**
 * POST /api/v1/auth/login
 * Public. Returns an access + refresh token pair.
 */
authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  })
);

/**
 * POST /api/v1/auth/refresh
 * Rotates the refresh token and returns a new token pair.
 */
authRouter.post(
  "/refresh",
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const tokens = await authService.refresh(req.body.refreshToken);
    res.status(200).json({ tokens });
  })
);

/**
 * POST /api/v1/auth/logout
 * Revokes the given refresh token. Idempotent.
 */
authRouter.post(
  "/logout",
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    await authService.logout(req.body.refreshToken);
    res.status(204).send();
  })
);
