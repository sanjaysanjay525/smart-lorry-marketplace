import { Router } from "express";
import {
  paginationSchema,
  createKycDocSchema,
  reviewKycSchema,
  createDisputeSchema,
  resolveDisputeSchema,
  banUserSchema,
} from "@smart-lorry/shared";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import * as adminService from "../services/admin.service";

export const adminRouter = Router();

adminRouter.use(authenticate);

// ─── Admin Stats ───────────────────────────────────────────────────

adminRouter.get(
  "/stats",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const stats = await adminService.getStats();
    res.json(stats);
  })
);

// ─── Admin User Management ────────────────────────────────────────

adminRouter.get(
  "/users",
  requireRole("admin"),
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as any;
    const role = req.query.role as string | undefined;
    const result = await adminService.listUsers(role, page, limit);
    res.json(result);
  })
);

adminRouter.patch(
  "/users/:id/ban",
  requireRole("admin"),
  validate(banUserSchema),
  asyncHandler(async (req, res) => {
    const dto = await adminService.banUser(req.params.id, req.body);
    res.json(dto);
  })
);

// ─── KYC ───────────────────────────────────────────────────────────

/** POST /api/v1/admin/kyc — any auth user uploads KYC doc */
adminRouter.post(
  "/kyc",
  validate(createKycDocSchema),
  asyncHandler(async (req, res) => {
    const { prisma } = await import("../config/prisma");
    const doc = await prisma.kycDocument.create({
      data: { userId: req.user!.id, docType: req.body.docType, docUrl: req.body.docUrl },
      include: { user: true, reviewer: true },
    });
    const { serializeKycDoc } = await import("../utils/serializers");
    res.status(201).json(serializeKycDoc(doc as any));
  })
);

adminRouter.get(
  "/kyc",
  requireRole("admin"),
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as any;
    const status = req.query.status as string | undefined;
    const result = await adminService.listKycDocs(status, page, limit);
    res.json(result);
  })
);

adminRouter.patch(
  "/kyc/:id/review",
  requireRole("admin"),
  validate(reviewKycSchema),
  asyncHandler(async (req, res) => {
    const dto = await adminService.reviewKycDoc(req.params.id, req.user!.id, req.body);
    res.json(dto);
  })
);

// ─── Disputes ──────────────────────────────────────────────────────

adminRouter.post(
  "/disputes",
  validate(createDisputeSchema),
  asyncHandler(async (req, res) => {
    const dto = await adminService.createDispute(req.user!.id, req.user!.role, req.body);
    res.status(201).json(dto);
  })
);

adminRouter.get(
  "/disputes",
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as any;
    const result = await adminService.listDisputes(req.user!.id, req.user!.role, page, limit);
    res.json(result);
  })
);

adminRouter.patch(
  "/disputes/:id/resolve",
  requireRole("admin"),
  validate(resolveDisputeSchema),
  asyncHandler(async (req, res) => {
    const dto = await adminService.resolveDispute(req.params.id, req.user!.id, req.body);
    res.json(dto);
  })
);
