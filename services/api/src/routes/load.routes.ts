import { Router } from "express";
import {
  createLoadSchema,
  updateLoadSchema,
  loadSearchSchema,
  acceptLoadSchema,
  paginationSchema,
} from "@smart-lorry/shared";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import * as loadService from "../services/load.service";

export const loadRouter = Router();

loadRouter.use(authenticate);

/** POST /api/v1/loads — mill: post a new load */
loadRouter.post(
  "/",
  requireRole("mill"),
  validate(createLoadSchema),
  asyncHandler(async (req, res) => {
    const dto = await loadService.createLoad(req.user!.id, req.body);
    res.status(201).json(dto);
  })
);

/** GET /api/v1/loads/mine — mill: my own loads */
loadRouter.get(
  "/mine",
  requireRole("mill"),
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as any;
    const result = await loadService.getMyLoads(req.user!.id, page, limit);
    res.json(result);
  })
);

/** GET /api/v1/loads — load board (search/filter) */
loadRouter.get(
  "/",
  validate(loadSearchSchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await loadService.searchLoads(req.query as any);
    res.json(result);
  })
);

/** GET /api/v1/loads/:id — single load detail */
loadRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const dto = await loadService.getLoadById(req.params.id);
    res.json(dto);
  })
);

/** PATCH /api/v1/loads/:id — mill: update own load (only if open) */
loadRouter.patch(
  "/:id",
  requireRole("mill"),
  validate(updateLoadSchema),
  asyncHandler(async (req, res) => {
    const dto = await loadService.updateLoad(req.params.id, req.user!.id, req.body);
    res.json(dto);
  })
);

/** DELETE /api/v1/loads/:id — mill: cancel own load */
loadRouter.delete(
  "/:id",
  requireRole("mill"),
  asyncHandler(async (req, res) => {
    const dto = await loadService.cancelLoad(req.params.id, req.user!.id);
    res.json(dto);
  })
);

/** POST /api/v1/loads/:id/accept — owner: accept a load with a vehicle */
loadRouter.post(
  "/:id/accept",
  requireRole("owner"),
  validate(acceptLoadSchema),
  asyncHandler(async (req, res) => {
    const dto = await loadService.acceptLoad(req.params.id, req.user!.id, req.body);
    res.status(201).json(dto);
  })
);
