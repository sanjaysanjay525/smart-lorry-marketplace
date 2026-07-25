import { Review } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export async function createReview(
  reviewerId: string,
  tripId: string,
  data: {
    targetType: 'driver' | 'vehicle';
    rating: number;
    comment?: string;
  }
): Promise<Review> {
  // Find trip
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) {
    throw new AppError('Trip not found', 404, 'NOT_FOUND');
  }

  // Verification checks
  if (trip.customerId !== reviewerId) {
    throw new AppError('You are not authorized to review this trip', 403, 'FORBIDDEN');
  }

  if (trip.status !== 'delivered') {
    throw new AppError('You can only review completed trips', 400, 'INVALID_STATE');
  }

  // Determine targetId based on type
  const targetId = data.targetType === 'driver' ? trip.driverId : trip.vehicleId;

  // Prevent duplicate reviews of same target on same trip
  const existing = await prisma.review.findFirst({
    where: {
      tripId,
      reviewerId,
      targetType: data.targetType,
      targetId,
    },
  });

  if (existing) {
    throw new AppError(`You have already reviewed the ${data.targetType} for this trip`, 409, 'CONFLICT_ERROR');
  }

  // Create review
  const review = await prisma.review.create({
    data: {
      tripId,
      reviewerId,
      targetType: data.targetType,
      targetId,
      rating: data.rating,
      comment: data.comment,
    },
  });

  // If driver review, aggregate and update driver profile stats
  if (data.targetType === 'driver') {
    const stats = await prisma.review.aggregate({
      where: {
        targetType: 'driver',
        targetId,
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.driver.update({
      where: { id: targetId },
      data: {
        ratingAvg: stats._avg.rating || 0,
        ratingCount: stats._count.rating || 0,
      },
    });
  }

  return review;
}

export async function getTripReviews(tripId: string): Promise<Review[]> {
  return prisma.review.findMany({
    where: { tripId },
    include: {
      reviewer: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
