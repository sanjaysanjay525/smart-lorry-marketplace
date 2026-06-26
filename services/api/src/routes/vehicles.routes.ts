import { Router } from "express";
import {
  createVehicleSchema,
  updateVehicleSchema,
  updateVehicleRateSchema,
  updateVehicleLocationSchema,
  updateVehicleStatusSchema,
  availableVehiclesSchema,
  paginationSchema,
} from "@smart-lorry/shared";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import * as vehicleService from "../services/vehicle.service";

export const vehiclesRouter = Router();

/** GET /api/v1/vehicles/available — public: browse available lorries */
vehiclesRouter.get(
  "/available",
  validate(availableVehiclesSchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await vehicleService.getAvailableVehicles(req.query as any);
    res.json(result);
  })
);

vehiclesRouter.use(authenticate);

/** POST /api/v1/vehicles — owner: add a vehicle */
vehiclesRouter.post(
  "/",
  requireRole("owner"),
  validate(createVehicleSchema),
  asyncHandler(async (req, res) => {
    const dto = await vehicleService.createVehicle(req.user!.id, req.body);
    res.status(201).json(dto);
  })
);

/** GET /api/v1/vehicles — owner: list own vehicles */
vehiclesRouter.get(
  "/",
  requireRole("owner", "admin"),
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await vehicleService.listVehiclesForOwner(req.user!.id, req.query as any);
    res.json(result);
  })
);

/** GET /api/v1/vehicles/:id */
vehiclesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const dto = await vehicleService.getVehicleById(req.params.id);
    res.json(dto);
  })
);

/** PATCH /api/v1/vehicles/:id */
vehiclesRouter.patch(
  "/:id",
  requireRole("owner"),
  validate(updateVehicleSchema),
  asyncHandler(async (req, res) => {
    const dto = await vehicleService.updateVehicle(req.params.id, req.user!.id, req.body);
    res.json(dto);
  })
);

/** PATCH /api/v1/vehicles/:id/rate — owner: update trip rate */
vehiclesRouter.patch(
  "/:id/rate",
  requireRole("owner"),
  validate(updateVehicleRateSchema),
  asyncHandler(async (req, res) => {
    const dto = await vehicleService.updateVehicleRate(req.params.id, req.user!.id, req.body);
    res.json(dto);
  })
);

/** PATCH /api/v1/vehicles/:id/location */
vehiclesRouter.patch(
  "/:id/location",
  requireRole("owner"),
  validate(updateVehicleLocationSchema),
  asyncHandler(async (req, res) => {
    const dto = await vehicleService.updateVehicleLocation(
      req.params.id, req.user!.id, req.body.location
    );
    res.json(dto);
  })
);

/** PATCH /api/v1/vehicles/:id/status */
vehiclesRouter.patch(
  "/:id/status",
  requireRole("owner"),
  validate(updateVehicleStatusSchema),
  asyncHandler(async (req, res) => {
    const dto = await vehicleService.updateVehicleStatus(
      req.params.id, req.user!.id, req.body.status
    );
    res.json(dto);
  })
);

/** DELETE /api/v1/vehicles/:id */
vehiclesRouter.delete(
  "/:id",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    await vehicleService.deleteVehicle(req.params.id, req.user!.id);
    res.status(204).send();
  })
);
