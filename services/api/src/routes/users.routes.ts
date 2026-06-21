import { Router } from "express";
import { updateProfileSchema, userLookupSchema } from "@smart-lorry/shared";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { serializeUser } from "../utils/serializers";
import { AppError } from "../utils/AppError";

export const usersRouter = Router();

usersRouter.use(authenticate);

/**
 * GET /api/v1/users/lookup?email=...  (or ?phone=...)
 * Owner-only. Resolves a driver-role user's id/name so they can be linked
 * via POST /drivers. Returns 404 rather than leaking whether an email/phone
 * belongs to a non-driver account.
 */
usersRouter.get(
  "/lookup",
  requireRole("owner"),
  validate(userLookupSchema, "query"),
  asyncHandler(async (req, res) => {
    const { email, phone } = req.query as unknown as { email?: string; phone?: string };
    const user = await prisma.user.findFirst({
      where: { role: "driver", ...(email ? { email } : { phone }) },
    });
    if (!user) throw AppError.notFound("No driver account found with that email or phone");
    res.json({ id: user.id, name: user.name });
  })
);

/** GET /api/v1/users/me */
usersRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw AppError.notFound("User not found");
    res.json(serializeUser(user));
  })
);

/** PATCH /api/v1/users/me */
usersRouter.patch(
  "/me",
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: req.body,
    });
    res.json(serializeUser(user));
  })
);
