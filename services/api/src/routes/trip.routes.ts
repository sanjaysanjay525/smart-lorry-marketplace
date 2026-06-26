import { Router } from "express";
import { cancelTripSchema, rateSchema, paginationSchema } from "@smart-lorry/shared";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import * as tripService from "../services/trip.service";

export const tripRouter = Router();

tripRouter.use(authenticate);

/** GET /api/v1/trips — list trips for current user */
tripRouter.get(
  "/",
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as any;
    const result = await tripService.listTrips(req.user!.id, req.user!.role, page, limit);
    res.json(result);
  })
);

/** GET /api/v1/trips/:id — single trip detail */
tripRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const dto = await tripService.getTripById(req.params.id, req.user!.id, req.user!.role);
    res.json(dto);
  })
);

/** PATCH /api/v1/trips/:id/pickup — owner: mark goods picked up */
tripRouter.patch(
  "/:id/pickup",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const dto = await tripService.markPickedUp(req.params.id, req.user!.id);
    res.json(dto);
  })
);

/** PATCH /api/v1/trips/:id/transit — owner: mark in transit */
tripRouter.patch(
  "/:id/transit",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const dto = await tripService.markInTransit(req.params.id, req.user!.id);
    res.json(dto);
  })
);

/** PATCH /api/v1/trips/:id/deliver — owner: mark delivered */
tripRouter.patch(
  "/:id/deliver",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const dto = await tripService.markDelivered(req.params.id, req.user!.id);
    res.json(dto);
  })
);

/** PATCH /api/v1/trips/:id/cancel — owner or mill: cancel trip */
tripRouter.patch(
  "/:id/cancel",
  validate(cancelTripSchema),
  asyncHandler(async (req, res) => {
    const dto = await tripService.cancelTrip(
      req.params.id, req.user!.id, req.user!.role, req.body
    );
    res.json(dto);
  })
);

/** POST /api/v1/trips/:id/rate — rate after delivery */
tripRouter.post(
  "/:id/rate",
  validate(rateSchema),
  asyncHandler(async (req, res) => {
    const dto = await tripService.rateTrip(
      req.params.id, req.user!.id, req.user!.role, req.body
    );
    res.json(dto);
  })
);
