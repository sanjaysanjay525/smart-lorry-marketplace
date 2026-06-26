import { Router } from "express";
import { updateProfileSchema } from "@smart-lorry/shared";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { serializeUser } from "../utils/serializers";
import { AppError } from "../utils/AppError";

export const usersRouter = Router();

usersRouter.use(authenticate);

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
