import { Router, Request, Response, NextFunction } from 'express';
import { UserRole, disputeResolveSchema } from '@slm/shared';
import * as adminService from '../services/admin.service';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Secure all admin routes to only admins
router.use(authenticate);
router.use(requireRole(UserRole.admin));

/**
 * @openapi
 * /admin/kyc/pending:
 *   get:
 *     summary: List all pending KYC documents
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending documents returned successfully
 */
router.get(
  '/kyc/pending',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const docs = await adminService.getPendingKycDocuments();
      res.status(200).json({
        success: true,
        data: docs,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /admin/kyc/{id}:
 *   patch:
 *     summary: Approve or reject a specific KYC document
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *     responses:
 *       200:
 *         description: Document reviewed successfully
 */
router.patch(
  '/kyc/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (status !== 'approved' && status !== 'rejected') {
        res.status(400).json({ success: false, error: 'Status must be approved or rejected' });
        return;
      }
      const doc = await adminService.reviewKycDocument(id, req.user!.id, status);
      res.status(200).json({
        success: true,
        data: doc,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /admin/drivers/{driverId}/kyc-status:
 *   patch:
 *     summary: Update driver overall KYC status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - kycStatus
 *             properties:
 *               kycStatus:
 *                 type: string
 *                 enum: [approved, rejected, pending]
 *     responses:
 *       200:
 *         description: Driver KYC status updated successfully
 */
router.patch(
  '/drivers/:driverId/kyc-status',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { driverId } = req.params;
      const { kycStatus } = req.body;
      if (kycStatus !== 'approved' && kycStatus !== 'rejected' && kycStatus !== 'pending') {
        res.status(400).json({ success: false, error: 'kycStatus must be approved, rejected, or pending' });
        return;
      }
      const driver = await adminService.updateDriverKycStatus(driverId, req.user!.id, kycStatus);
      res.status(200).json({
        success: true,
        data: driver,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /admin/analytics:
 *   get:
 *     summary: Get admin analytics overview
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics returned successfully
 */
router.get(
  '/analytics',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const analytics = await adminService.getAnalytics();
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /admin/disputes:
 *   get:
 *     summary: Get all disputes
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disputes returned successfully
 */
router.get(
  '/disputes',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const disputes = await adminService.getDisputes();
      res.status(200).json({
        success: true,
        data: disputes,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /admin/disputes/{id}/resolve:
 *   patch:
 *     summary: Resolve a dispute
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resolution
 *             properties:
 *               resolution:
 *                 type: string
 *     responses:
 *       200:
 *         description: Dispute resolved successfully
 */
router.patch(
  '/disputes/:id/resolve',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { resolution } = disputeResolveSchema.parse(req.body);
      const dispute = await adminService.resolveDispute(id, req.user!.id, resolution);
      res.status(200).json({
        success: true,
        data: dispute,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
