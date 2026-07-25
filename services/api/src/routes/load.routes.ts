import { Router, Request, Response, NextFunction } from 'express';
import { UserRole, loadPostingCreateSchema } from '@slm/shared';
import * as loadService from '../services/load.service';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /loads:
 *   post:
 *     summary: Post a new cargo load (Customer role only)
 *     tags: [Loads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoadPostingCreateRequest'
 *     responses:
 *       201:
 *         description: Load posted successfully
 */
router.post(
  '/',
  requireRole(UserRole.customer),
  validate(loadPostingCreateSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customerId = req.user!.id;
      const load = await loadService.createLoadPosting(customerId, req.body);
      res.status(201).json({
        success: true,
        data: load,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /loads:
 *   get:
 *     summary: Get all open cargo loads
 *     tags: [Loads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of loads returned successfully
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const loads = await loadService.getOpenLoads();
      res.status(200).json({
        success: true,
        data: loads,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /loads/trips/{id}/return-loads:
 *   get:
 *     summary: Get matched return loads for a given trip (Owner/Driver roles)
 *     tags: [Loads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: radiusKm
 *         in: query
 *         required: false
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Matched return loads returned successfully
 */
router.get(
  '/trips/:id/return-loads',
  requireRole(UserRole.owner, UserRole.driver),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tripId = req.params.id;
      const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm as string) : 50;
      const matches = await loadService.matchReturnLoadsForTrip(tripId, radiusKm);
      res.status(200).json({
        success: true,
        data: matches,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /loads/trips/{id}/return-loads/{loadId}/accept:
 *   post:
 *     summary: Accept a matching return load (Owner/Driver roles)
 *     tags: [Loads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: loadId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Load accepted and return trip created successfully
 */
router.post(
  '/trips/:id/return-loads/:loadId/accept',
  requireRole(UserRole.owner, UserRole.driver),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tripId = req.params.id;
      const loadId = req.params.loadId;
      const userId = req.user!.id;
      const result = await loadService.acceptReturnLoad(tripId, loadId, userId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /loads/owners/earnings/return-loads:
 *   get:
 *     summary: Get owner return-trip analytics data (Owner role only)
 *     tags: [Loads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Owner return trip metrics returned successfully
 */
router.get(
  '/owners/earnings/return-loads',
  requireRole(UserRole.owner),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ownerId = req.user!.id;
      const earnings = await loadService.getOwnerEarningsWidget(ownerId);
      res.status(200).json({
        success: true,
        data: earnings,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
