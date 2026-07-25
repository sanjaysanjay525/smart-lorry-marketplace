import { Router, Request, Response, NextFunction } from 'express';
import { UserRole, driverCreateSchema, driverUpdateSchema, driverAvailabilitySchema, kycUploadSchema } from '@slm/shared';
import * as driverService from '../services/driver.service';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Secure all driver routes
router.use(authenticate);

/**
 * @openapi
 * /drivers:
 *   get:
 *     summary: List drivers managed by current user (Owner role only)
 *     tags: [Drivers]
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
      const drivers = await driverService.listOwnerDrivers(ownerId);
      res.status(200).json({
        success: true,
        data: drivers,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /drivers:
 *   post:
 *     summary: Register a new driver (Owner role only)
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - phone
 *               - name
 *               - licenseNumber
 *               - licenseExpiry
 *               - yearsExperience
 *             properties:
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               name:
 *                 type: string
 *               licenseNumber:
 *                 type: string
 *               licenseExpiry:
 *                 type: string
 *                 format: date-time
 *               yearsExperience:
 *                 type: number
 *     responses:
 *       201:
 *         description: Driver created successfully
 */
router.post(
  '/',
  requireRole(UserRole.owner),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ownerId = req.user!.id;
      const { email, phone, name, licenseNumber, licenseExpiry, yearsExperience } = req.body;
      
      // Basic validation for user fields
      if (!email || !phone || !name) {
        throw new AppError('Email, phone and name are required', 400, 'VALIDATION_ERROR');
      }

      // Zod validation for driver profile fields
      const driverData = driverCreateSchema.parse({
        licenseNumber,
        licenseExpiry,
        yearsExperience,
      });

      const driver = await driverService.createDriver(ownerId, {
        email,
        phone,
        name,
        ...driverData,
      });

      res.status(201).json({
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
 * /drivers/{id}:
 *   get:
 *     summary: Get driver by ID
 *     tags: [Drivers]
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
 *         description: Driver profile returned successfully
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const driver = await driverService.getDriverById(id);
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
 * /drivers/{id}:
 *   patch:
 *     summary: Update driver properties or link vehicle (Owner role only)
 *     tags: [Drivers]
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
 *             properties:
 *               licenseNumber:
 *                 type: string
 *               licenseExpiry:
 *                 type: string
 *                 format: date-time
 *               yearsExperience:
 *                 type: number
 *               name:
 *                 type: string
 *               vehicleId:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Driver updated successfully
 */
router.patch(
  '/:id',
  requireRole(UserRole.owner),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const ownerId = req.user!.id;
      
      const driverData = driverUpdateSchema.parse(req.body);

      const driver = await driverService.updateDriver(id, ownerId, {
        ...driverData,
        name: req.body.name,
        vehicleId: req.body.vehicleId,
      });

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
 * /drivers/{id}/availability:
 *   get:
 *     summary: Get weekly availability slots for a driver
 *     tags: [Drivers]
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
 *         description: Availability slots returned successfully
 */
router.get(
  '/:id/availability',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const availability = await driverService.getDriverAvailability(id);
      res.status(200).json({
        success: true,
        data: availability,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /drivers/{id}/availability:
 *   put:
 *     summary: Upsert a driver availability slot (Owner or Driver only)
 *     tags: [Drivers]
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
 *             $ref: '#/components/schemas/DriverAvailabilityRequest'
 *     responses:
 *       200:
 *         description: Availability updated successfully
 */
router.put(
  '/:id/availability',
  requireRole(UserRole.owner, UserRole.driver),
  validate(driverAvailabilitySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const availability = await driverService.setDriverAvailability(
        id,
        req.user!.id,
        req.user!.role,
        req.body
      );
      res.status(200).json({
        success: true,
        data: availability,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /drivers/{id}/availability/{dayOfWeek}:
 *   delete:
 *     summary: Delete a driver availability slot (Owner or Driver only)
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: dayOfWeek
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *     responses:
 *       200:
 *         description: Availability deleted successfully
 */
router.delete(
  '/:id/availability/:dayOfWeek',
  requireRole(UserRole.owner, UserRole.driver),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id, dayOfWeek } = req.params;
      const day = parseInt(dayOfWeek, 10);
      
      if (isNaN(day) || day < 0 || day > 6) {
        throw new AppError('dayOfWeek must be an integer between 0 and 6', 400, 'VALIDATION_ERROR');
      }

      await driverService.deleteDriverAvailability(
        id,
        req.user!.id,
        req.user!.role,
        day
      );
      
      res.status(200).json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /drivers/kyc/upload:
 *   post:
 *     summary: Upload a driver KYC document
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - docType
 *               - documentData
 *             properties:
 *               docType:
 *                 type: string
 *                 enum: [aadhaar, license, background_check]
 *               documentData:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 */
router.post(
  '/kyc/upload',
  requireRole(UserRole.driver),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { docType, documentData } = kycUploadSchema.parse(req.body);
      const result = await driverService.uploadKycDocument(req.user!.id, docType, documentData);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
