import { Router } from "express";
import {
  createVehicleSchema,
  updateVehicleSchema,
  updateVehicleLocationSchema,
  updateVehicleStatusSchema,
  paginationSchema,
} from "@smart-lorry/shared";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import * as vehicleService from "../services/vehicle.service";

export const vehiclesRouter = Router();

vehiclesRouter.use(authenticate);

/** POST /api/v1/vehicles — owner creates a vehicle */
vehiclesRouter.post(
  "/",
  requireRole("owner"),
  validate(createVehicleSchema),
  asyncHandler(async (req, res) => {
    const vehicle = await vehicleService.createVehicle(req.user!.id, req.body);
    res.status(201).json(vehicle);
  })
);

/** GET /api/v1/vehicles — owner lists their own fleet, paginated */
vehiclesRouter.get(
  "/",
  requireRole("owner"),
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await vehicleService.listVehiclesForOwner(req.user!.id, req.query as never);
    res.json(result);
  })
);

/** GET /api/v1/vehicles/:id */
vehiclesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const vehicle = await vehicleService.getVehicleById(req.params.id);
    res.json(vehicle);
  })
);

/** PATCH /api/v1/vehicles/:id — owner updates vehicle details */
vehiclesRouter.patch(
  "/:id",
  requireRole("owner"),
  validate(updateVehicleSchema),
  asyncHandler(async (req, res) => {
    const vehicle = await vehicleService.updateVehicle(req.params.id, req.user!.id, req.body);
    res.json(vehicle);
  })
);

/** PATCH /api/v1/vehicles/:id/location — owner or assigned driver pings GPS */
vehiclesRouter.patch(
  "/:id/location",
  requireRole("owner", "driver"),
  validate(updateVehicleLocationSchema),
  asyncHandler(async (req, res) => {
    const vehicle = await vehicleService.updateVehicleLocation(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.body.location
    );
    res.json(vehicle);
  })
);

/** PATCH /api/v1/vehicles/:id/status — owner or assigned driver toggles availability */
vehiclesRouter.patch(
  "/:id/status",
  requireRole("owner", "driver"),
  validate(updateVehicleStatusSchema),
  asyncHandler(async (req, res) => {
    const vehicle = await vehicleService.updateVehicleStatus(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.body.status
    );
    res.json(vehicle);
  })
);

/** DELETE /api/v1/vehicles/:id — owner removes a vehicle from their fleet */
vehiclesRouter.delete(
  "/:id",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    await vehicleService.deleteVehicle(req.params.id, req.user!.id);
    res.status(204).send();
  })
);
