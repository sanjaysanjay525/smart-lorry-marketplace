import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { decrypt } from '../utils/encryption';
import {
  KycDocumentType,
  KycDocumentStatus,
  KycDocumentResponse,
  DisputeResponse,
  AdminAnalyticsResponse
} from '@slm/shared';

export async function getPendingKycDocuments(): Promise<KycDocumentResponse[]> {
  const docs = await prisma.kycDocument.findMany({
    where: { status: 'pending' },
    include: {
      driver: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return docs.map(doc => {
    let decryptedData = '';
    try {
      decryptedData = decrypt(doc.storageKey);
    } catch (e) {
      decryptedData = '[Decryption Failed]';
    }

    return {
      id: doc.id,
      driverId: doc.driverId,
      docType: doc.docType as KycDocumentType,
      storageKey: doc.storageKey,
      decryptedData, // Included for administrative convenience/display
      status: doc.status as KycDocumentStatus,
      reviewedBy: doc.reviewedBy,
      reviewedAt: doc.reviewedAt ? doc.reviewedAt.toISOString() : null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      driver: {
        id: doc.driver.id,
        licenseNumber: doc.driver.licenseNumber,
        user: doc.driver.user ? {
          name: doc.driver.user.name,
          email: doc.driver.user.email,
        } : undefined,
      },
    };
  });
}

export async function reviewKycDocument(
  documentId: string,
  adminId: string,
  status: 'approved' | 'rejected'
): Promise<any> {
  const doc = await prisma.kycDocument.findUnique({
    where: { id: documentId },
    include: { driver: true },
  });

  if (!doc) {
    throw new AppError('Document not found', 404, 'NOT_FOUND');
  }

  const updatedDoc = await prisma.kycDocument.update({
    where: { id: documentId },
    data: {
      status: status as any,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  });

  // Log action
  await prisma.auditLog.create({
    data: {
      adminId,
      action: 'REVIEW_KYC_DOCUMENT',
      details: `Reviewed document ${documentId} (Type: ${doc.docType}) for driver ${doc.driverId}. Status: ${status}`,
    },
  });

  return updatedDoc;
}

export async function updateDriverKycStatus(
  driverId: string,
  adminId: string,
  kycStatus: 'approved' | 'rejected' | 'pending'
): Promise<any> {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new AppError('Driver not found', 404, 'NOT_FOUND');
  }

  const updatedDriver = await prisma.driver.update({
    where: { id: driverId },
    data: { kycStatus: kycStatus as any },
  });

  // Log action
  await prisma.auditLog.create({
    data: {
      adminId,
      action: 'UPDATE_DRIVER_KYC_STATUS',
      details: `Updated driver ${driverId} KYC status to ${kycStatus}`,
    },
  });

  return updatedDriver;
}

export async function getDisputes(): Promise<DisputeResponse[]> {
  const disputes = await prisma.dispute.findMany({
    include: {
      trip: {
        select: {
          id: true,
          type: true,
          priceTotal: true,
        },
      },
      raiser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return disputes.map(d => ({
    id: d.id,
    tripId: d.tripId,
    raisedBy: d.raisedBy,
    reason: d.reason,
    status: d.status,
    resolution: d.resolution,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    trip: d.trip ? {
      id: d.trip.id,
      type: d.trip.type,
      priceTotal: d.trip.priceTotal,
    } : undefined,
    raiser: d.raiser ? {
      name: d.raiser.name,
      email: d.raiser.email,
    } : undefined,
  }));
}

export async function createDispute(
  userId: string,
  tripId: string,
  reason: string
): Promise<DisputeResponse> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) {
    throw new AppError('Trip not found', 404, 'NOT_FOUND');
  }

  const driver = await prisma.driver.findUnique({
    where: { id: trip.driverId },
  });
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: trip.vehicleId },
  });

  const isAuthorized =
    trip.customerId === userId ||
    (driver && driver.userId === userId) ||
    (vehicle && vehicle.ownerId === userId);

  if (!isAuthorized) {
    throw new AppError('You are not authorized to raise a dispute for this trip', 403, 'FORBIDDEN');
  }

  const dispute = await prisma.dispute.create({
    data: {
      tripId,
      raisedBy: userId,
      reason,
      status: 'open',
    },
    include: {
      trip: {
        select: {
          id: true,
          type: true,
          priceTotal: true,
        },
      },
      raiser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    id: dispute.id,
    tripId: dispute.tripId,
    raisedBy: dispute.raisedBy,
    reason: dispute.reason,
    status: dispute.status,
    resolution: dispute.resolution,
    createdAt: dispute.createdAt.toISOString(),
    updatedAt: dispute.updatedAt.toISOString(),
    trip: dispute.trip ? {
      id: dispute.trip.id,
      type: dispute.trip.type,
      priceTotal: dispute.trip.priceTotal,
    } : undefined,
    raiser: dispute.raiser ? {
      name: dispute.raiser.name,
      email: dispute.raiser.email,
    } : undefined,
  };
}

export async function resolveDispute(
  disputeId: string,
  adminId: string,
  resolution: string
): Promise<DisputeResponse> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
  });

  if (!dispute) {
    throw new AppError('Dispute not found', 404, 'NOT_FOUND');
  }

  const updated = await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      status: 'resolved',
      resolution,
    },
    include: {
      trip: {
        select: {
          id: true,
          type: true,
          priceTotal: true,
        },
      },
      raiser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  // Log action
  await prisma.auditLog.create({
    data: {
      adminId,
      action: 'RESOLVE_DISPUTE',
      details: `Resolved dispute ${disputeId} with details: ${resolution}`,
    },
  });

  return {
    id: updated.id,
    tripId: updated.tripId,
    raisedBy: updated.raisedBy,
    reason: updated.reason,
    status: updated.status,
    resolution: updated.resolution,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    trip: updated.trip ? {
      id: updated.trip.id,
      type: updated.trip.type,
      priceTotal: updated.trip.priceTotal,
    } : undefined,
    raiser: updated.raiser ? {
      name: updated.raiser.name,
      email: updated.raiser.email,
    } : undefined,
  };
}

export async function getAnalytics(): Promise<AdminAnalyticsResponse> {
  const totalTrips = await prisma.trip.count();

  const paymentGmv = await prisma.payment.aggregate({
    where: { status: 'captured' },
    _sum: { amount: true },
  });
  const totalGmv = paymentGmv._sum.amount || 0;

  const deliveredTrips = await prisma.trip.count({
    where: { status: 'delivered' },
  });

  const fillRatePercent = totalTrips > 0
    ? Math.round((deliveredTrips / totalTrips) * 100)
    : 0;

  const returnLegTrips = await prisma.trip.count({
    where: { type: 'return_leg' },
  });

  const returnLoadAdoptionPercent = totalTrips > 0
    ? Math.round((returnLegTrips / totalTrips) * 100)
    : 0;

  // Monthly trends for past 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const trips = await prisma.trip.findMany({
    where: {
      createdAt: { gte: twelveMonthsAgo },
    },
    select: {
      createdAt: true,
      priceTotal: true,
      status: true,
      payment: {
        select: {
          status: true,
        },
      },
    },
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData: { [key: string]: { count: number; gmv: number } } = {};

  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - 11 + i);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    monthlyData[key] = { count: 0, gmv: 0 };
  }

  for (const trip of trips) {
    const date = new Date(trip.createdAt);
    const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    if (monthlyData[key]) {
      monthlyData[key].count += 1;
      if (trip.status !== 'cancelled' && (!trip.payment || trip.payment.status === 'captured')) {
        monthlyData[key].gmv += trip.priceTotal;
      }
    }
  }

  const tripsByMonth = Object.keys(monthlyData).map(month => ({
    month,
    count: monthlyData[month].count,
    gmv: Math.round(monthlyData[month].gmv * 100) / 100,
  }));

  return {
    totalTrips,
    totalGmv,
    fillRatePercent,
    returnLoadAdoptionPercent,
    tripsByMonth,
  };
}
