import { Router, Request, Response, NextFunction } from 'express';
import { UserRole, TripStatus, disputeCreateSchema } from '@slm/shared';
import * as tripService from '../services/trip.service';
import * as reviewService from '../services/review.service';
import { createDispute } from '../services/admin.service';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Secure all trip routes
router.use(authenticate);

/**
 * @openapi
 * /vehicles/search:
 *   get:
 *     summary: Search for nearby available vehicles in a geographic radius
 *     tags: [Trips]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: radiusKm
 *         schema:
 *           type: number
 *           default: 10
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of nearby vehicles returned successfully
 */
router.get(
  '/search',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm as string) : 10;
      const type = req.query.type as any;

      if (isNaN(lat) || isNaN(lng)) {
        throw new AppError('lat and lng are required query parameters and must be numbers', 400, 'VALIDATION_ERROR');
      }

      const vehicles = await tripService.searchNearbyVehicles(lat, lng, radiusKm, type);
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
 * /trips/estimate:
 *   post:
 *     summary: Request fare estimates for multiple vehicle types
 *     tags: [Trips]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - originAddress
 *               - originCoords
 *               - destinationAddress
 *               - destinationCoords
 *               - weightKg
 *             properties:
 *               originAddress:
 *                 type: string
 *               originCoords:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               destinationAddress:
 *                 type: string
 *               destinationCoords:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               weightKg:
 *                 type: number
 *     responses:
 *       200:
 *         description: List of fare estimates returned successfully
 */
router.post(
  '/estimate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const estimates = await tripService.getTripEstimates(req.body);
      res.status(200).json({
        success: true,
        data: estimates,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /trips:
 *   post:
 *     summary: Create a trip booking order (paid via Razorpay checkout)
 *     tags: [Trips]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Booking and Razorpay payment order generated
 */
router.post(
  '/',
  requireRole(UserRole.customer),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customerId = req.user!.id;
      const result = await tripService.createTripBooking(customerId, req.body);
      res.status(201).json({
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
 * /payments/verify:
 *   post:
 *     summary: Verify Razorpay signature checkout verification
 *     tags: [Trips]
 *     requestBody:
 *       required: true
 *     responses:
 *       200:
 *         description: Payment confirmed and trip booked
 */
router.post(
  '/payments/verify',
  requireRole(UserRole.customer),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customerId = req.user!.id;
      const trip = await tripService.verifyTripPayment(customerId, req.body);
      res.status(200).json({
        success: true,
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /trips/{id}:
 *   get:
 *     summary: Get trip detailed status, coordinates and ETA
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Details returned successfully
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const trip = await tripService.getTripDetails(id);
      res.status(200).json({
        success: true,
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /trips/{id}/accept:
 *   patch:
 *     summary: Accept a pending trip booking request (Driver only)
 *     tags: [Trips]
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
 *         description: Trip accepted and assigned successfully
 */
router.patch(
  '/:id/accept',
  requireRole(UserRole.driver),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const trip = await tripService.acceptTripBooking(id, req.user!.id);
      res.status(200).json({
        success: true,
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /trips/{id}/status:
 *   patch:
 *     summary: Update trip status transition (Driver or Customer)
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch(
  '/:id/status',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !Object.values(TripStatus).includes(status)) {
        throw new AppError('Invalid trip status value', 400, 'VALIDATION_ERROR');
      }

      const trip = await tripService.updateTripStatus(
        id,
        req.user!.id,
        req.user!.role,
        status as TripStatus
      );
      res.status(200).json({
        success: true,
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /trips/{id}/location:
 *   post:
 *     summary: Post a driver location coordinate ping (Driver only)
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *     responses:
 *       200:
 *         description: Location recorded and broadcasted
 */
router.post(
  '/:id/location',
  requireRole(UserRole.driver),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;

      if (latitude === undefined || longitude === undefined) {
        throw new AppError('latitude and longitude are required in request body', 400, 'VALIDATION_ERROR');
      }

      await tripService.addLocationUpdate(id, latitude, longitude);
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
 * /trips/{id}/route-history:
 *   get:
 *     summary: Get full historical coordinates tracking trail
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of tracking points
 */
router.get(
  '/:id/route-history',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const history = await tripService.getTripRouteHistory(id);
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /trips/{id}/reviews:
 *   post:
 *     summary: Create a customer review for the driver or vehicle
 *     tags: [Trips]
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
 *               - targetType
 *               - rating
 *             properties:
 *               targetType:
 *                 type: string
 *                 enum: [driver, vehicle]
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review submitted successfully
 */
router.post(
  '/:id/reviews',
  requireRole(UserRole.customer),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const reviewerId = req.user!.id;
      const review = await reviewService.createReview(reviewerId, id, req.body);
      res.status(201).json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /trips/{id}/reviews:
 *   get:
 *     summary: Get all reviews for a trip
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of reviews returned successfully
 */
router.get(
  '/:id/reviews',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const reviews = await reviewService.getTripReviews(id);
      res.status(200).json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /trips:
 *   get:
 *     summary: List all trips for the authenticated user (Customer, Driver, or Owner)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of trips returned successfully
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trips = await tripService.listUserTrips(req.user!.id, req.user!.role);
      res.status(200).json({
        success: true,
        data: trips,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /trips/:id/disputes — raise a dispute on a trip
router.post(
  '/:id/disputes',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = disputeCreateSchema.parse(req.body);
      const dispute = await createDispute(req.user!.id, id, reason);
      res.status(201).json({ success: true, data: dispute });
    } catch (error) {
      next(error);
    }
  }
);

export default router;


