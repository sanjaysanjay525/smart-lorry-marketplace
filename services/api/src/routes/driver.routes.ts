import { Router } from "express";
import { createDriverSchema, updateDriverSchema, paginationSchema } from "@smart-lorry/shared";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import * as driverService from "../services/driver.service";

export const driversRouter = Router();

/** GET /api/v1/drivers/:id — public-ish profile (rating, photo, experience); requires login per Phase 1 spec */
driversRouter.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const driver = await driverService.getDriverPublicProfile(req.params.id);
    res.json(driver);
  })
);

driversRouter.use(authenticate, requireRole("owner"));

/** POST /api/v1/drivers — owner links a driver-role user to their fleet */
driversRouter.post(
  "/",
  validate(createDriverSchema),
  asyncHandler(async (req, res) => {
    const driver = await driverService.createDriver(req.user!.id, req.body);
    res.status(201).json(driver);
  })
);

/** GET /api/v1/drivers — owner lists drivers they manage */
driversRouter.get(
  "/",
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await driverService.listDriversForOwner(req.user!.id, req.query as never);
    res.json(result);
  })
);

/** PATCH /api/v1/drivers/:id — owner updates license/vehicle assignment */
driversRouter.patch(
  "/:id",
  validate(updateDriverSchema),
  asyncHandler(async (req, res) => {
    const driver = await driverService.updateDriver(req.params.id, req.user!.id, req.body);
    res.json(driver);
  })
);
