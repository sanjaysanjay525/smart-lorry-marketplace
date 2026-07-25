import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Mock webhook endpoint called by Fastag gateway
router.post('/deduction', async (req, res, next) => {
  try {
    const { vehicleRegistration, amount, tollPlazaId } = req.body;

    let vehicle = null;
    try {
      vehicle = await prisma.vehicle.findUnique({
        where: { registration: vehicleRegistration },
        include: {
          trips: {
            where: { status: { in: ['en_route', 'in_progress'] } },
            take: 1,
          },
        },
      });
    } catch (dbErr) {
      console.warn('[Fastag Webhook] Database offline, falling back to mock logging.');
      return res.json({
        success: true,
        message: 'Deduction logged, database offline (running mock mode)',
        data: {
          vehicleRegistration,
          addedToll: amount,
          tollPlazaId,
          mock: true
        }
      });
    }

    if (!vehicle || vehicle.trips.length === 0) {
      // Vehicle not found or no active trip, just acknowledge
      return res.json({ success: true, message: 'Deduction logged, no active trip to bill' });
    }

    const trip = vehicle.trips[0];

    // Add toll to trip's tollExpenses
    await prisma.trip.update({
      where: { id: trip.id },
      data: {
        tollExpenses: { increment: amount },
      },
    });

    res.json({
      success: true,
      data: {
        tripId: trip.id,
        addedToll: amount,
        tollPlazaId,
      },
    });
  } catch (err) {
    next(err);
  }
});

export const fastagRoutes = router;
