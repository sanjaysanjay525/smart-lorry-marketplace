import { Router, Request, Response, NextFunction } from 'express';
import { UserRole, vehicleCreateSchema, vehicleUpdateSchema, vehicleLocationSchema, VehicleStatus } from '@slm/shared';
import * as vehicleService from '../services/vehicle.service';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Secure all vehicle routes
router.use(authenticate);

/**
 * @openapi
 * /vehicles:
 *   get:
 *     summary: List vehicles owned by current user (Owner role only)
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List returned successfully
 */
router.get(
  '/',
  requireRole(UserRole.owner),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ownerId = req.user!.id;
      const vehicles = await vehicleService.listOwnerVehicles(ownerId);
      res.status(200).json({
        success: true,
        data: vehicles,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /vehicles:
 *   post:
 *     summary: Create a new vehicle (Owner role only)
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VehicleCreateRequest'
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 */
router.post(
  '/',
  requireRole(UserRole.owner),
  validate(vehicleCreateSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ownerId = req.user!.id;
      const vehicle = await vehicleService.createVehicle(ownerId, req.body);
      res.status(201).json({
        success: true,
        data: vehicle,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /vehicles/{id}:
 *   get:
 *     summary: Get vehicle by ID
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle details returned successfully
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const vehicle = await vehicleService.getVehicleById(id);
      res.status(200).json({
        success: true,
        data: vehicle,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /vehicles/{id}:
 *   patch:
 *     summary: Update vehicle properties (Owner role only)
 *     tags: [Vehicles]
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
 *             $ref: '#/components/schemas/VehicleUpdateRequest'
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 */
router.patch(
  '/:id',
  requireRole(UserRole.owner),
  validate(vehicleUpdateSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const ownerId = req.user!.id;
      const vehicle = await vehicleService.updateVehicle(id, ownerId, req.body);
      res.status(200).json({
        success: true,
        data: vehicle,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /vehicles/{id}/location:
 *   patch:
 *     summary: Update vehicle GPS location (Owner or Driver only)
 *     tags: [Vehicles]
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
 *             $ref: '#/components/schemas/VehicleLocationRequest'
 *     responses:
 *       200:
 *         description: Location updated successfully
 */
router.patch(
  '/:id/location',
  requireRole(UserRole.owner, UserRole.driver),
  validate(vehicleLocationSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;
      const vehicle = await vehicleService.updateVehicleLocation(
        id,
        req.user!.id,
        req.user!.role,
        latitude,
        longitude
      );
      res.status(200).json({
        success: true,
        data: vehicle,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /vehicles/{id}/status:
 *   patch:
 *     summary: Update vehicle status (Owner or Driver only)
 *     tags: [Vehicles]
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
 *           type: object
 *           required:
 *             - status
 *           properties:
 *             status:
 *               type: string
 *               enum: [available, busy, offline]
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch(
  '/:id/status',
  requireRole(UserRole.owner, UserRole.driver),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !Object.values(VehicleStatus).includes(status)) {
        throw new AppError('Invalid status value', 400, 'VALIDATION_ERROR');
      }

      const vehicle = await vehicleService.updateVehicleStatus(
        id,
        req.user!.id,
        req.user!.role,
        status as VehicleStatus
      );
      res.status(200).json({
        success: true,
        data: vehicle,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
