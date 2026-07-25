import bcrypt from 'bcrypt';
import {
  DriverCreateRequest,
  DriverUpdateRequest,
  DriverResponse,
  DriverAvailabilityRequest,
  DriverAvailabilityResponse,
  UserProfile,
  UserRole,
  KycStatus,
  KycDocumentType,
  KycDocumentStatus,
  KycDocumentResponse
} from '@slm/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { encrypt } from '../utils/encryption';

const BCRYPT_SALT_ROUNDS = 10;

function formatDriverResponse(driver: any): DriverResponse {
  const userProfile: UserProfile | undefined = driver.user ? {
    id: driver.user.id,
    email: driver.user.email,
    phone: driver.user.phone,
    role: driver.user.role as UserRole,
    name: driver.user.name,
    avatarUrl: driver.user.avatarUrl,
    createdAt: driver.user.createdAt.toISOString(),
  } : undefined;

  return {
    id: driver.id,
    userId: driver.userId,
    ownerId: driver.ownerId,
    vehicleId: driver.vehicleId,
    licenseNumber: driver.licenseNumber,
    licenseExpiry: driver.licenseExpiry.toISOString(),
    yearsExperience: driver.yearsExperience,
    kycStatus: driver.kycStatus as KycStatus,
    ratingAvg: driver.ratingAvg,
    ratingCount: driver.ratingCount,
    createdAt: driver.createdAt.toISOString(),
    updatedAt: driver.updatedAt.toISOString(),
    user: userProfile,
    kycDocuments: driver.kycDocuments
      ? driver.kycDocuments.map((doc: any) => ({
          id: doc.id,
          driverId: doc.driverId,
          docType: doc.docType as KycDocumentType,
          storageKey: doc.storageKey,
          status: doc.status as KycDocumentStatus,
          reviewedBy: doc.reviewedBy,
          reviewedAt: doc.reviewedAt ? doc.reviewedAt.toISOString() : null,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        }))
      : undefined,
  };
}

export async function listOwnerDrivers(ownerId: string): Promise<DriverResponse[]> {
  const drivers = await prisma.driver.findMany({
    where: { ownerId },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });

  return drivers.map(formatDriverResponse);
}

export async function createDriver(
  ownerId: string,
  data: DriverCreateRequest & { email: string; phone: string; name: string }
): Promise<DriverResponse> {
  // Check user unique constraints
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: data.email },
        { phone: data.phone },
      ],
    },
  });

  if (existingUser) {
    if (existingUser.email === data.email) {
      throw new AppError('Email is already registered', 409, 'CONFLICT_ERROR');
    }
    if (existingUser.phone === data.phone) {
      throw new AppError('Phone number is already registered', 409, 'CONFLICT_ERROR');
    }
  }

  // Create temporary driver password (e.g. Driver@1234)
  const defaultPassword = 'Driver@123';
  const passwordHash = await bcrypt.hash(defaultPassword, BCRYPT_SALT_ROUNDS);

  // Create User first
  const user = await prisma.user.create({
    data: {
      email: data.email,
      phone: data.phone,
      name: data.name,
      role: UserRole.driver,
      passwordHash,
    },
  });

  // Create Driver profile linked to User
  const driver = await prisma.driver.create({
    data: {
      userId: user.id,
      ownerId,
      licenseNumber: data.licenseNumber,
      licenseExpiry: new Date(data.licenseExpiry),
      yearsExperience: data.yearsExperience,
    },
    include: {
      user: true,
    },
  });

  return formatDriverResponse(driver);
}

export async function getDriverById(id: string): Promise<DriverResponse> {
  let driver = await prisma.driver.findUnique({
    where: { id },
    include: { user: true, kycDocuments: true },
  });

  if (!driver) {
    driver = await prisma.driver.findUnique({
      where: { userId: id },
      include: { user: true, kycDocuments: true },
    });
  }

  if (!driver) {
    throw new AppError('Driver not found', 404, 'NOT_FOUND');
  }

  return formatDriverResponse(driver);
}

export async function updateDriver(
  id: string,
  ownerId: string,
  data: DriverUpdateRequest & { name?: string; vehicleId?: string | null }
): Promise<DriverResponse> {
  const driver = await prisma.driver.findUnique({
    where: { id },
  });

  if (!driver) {
    throw new AppError('Driver not found', 404, 'NOT_FOUND');
  }

  if (driver.ownerId !== ownerId) {
    throw new AppError('You do not manage this driver', 403, 'FORBIDDEN');
  }

  // Check vehicle if assigning
  if (data.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: data.vehicleId },
    });
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
    }
    if (vehicle.ownerId !== ownerId) {
      throw new AppError('You do not own this vehicle', 403, 'FORBIDDEN');
    }

    // Check if vehicle is already assigned to another driver
    const otherDriver = await prisma.driver.findFirst({
      where: {
        vehicleId: data.vehicleId,
        id: { not: id },
      },
    });
    if (otherDriver) {
      throw new AppError('Vehicle is already assigned to another driver', 409, 'CONFLICT_ERROR');
    }
  }

  // Update user name if provided
  if (data.name) {
    await prisma.user.update({
      where: { id: driver.userId },
      data: { name: data.name },
    });
  }

  // Update Driver properties
  const updated = await prisma.driver.update({
    where: { id },
    data: {
      licenseNumber: data.licenseNumber,
      licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : undefined,
      yearsExperience: data.yearsExperience,
      kycStatus: data.kycStatus as any,
      vehicleId: data.vehicleId,
    },
    include: {
      user: true,
    },
  });

  return formatDriverResponse(updated);
}

export async function setDriverAvailability(
  driverId: string,
  userId: string,
  userRole: UserRole,
  data: DriverAvailabilityRequest
): Promise<DriverAvailabilityResponse> {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new AppError('Driver not found', 404, 'NOT_FOUND');
  }

  // Auth check
  if (userRole === UserRole.owner && driver.ownerId !== userId) {
    throw new AppError('You do not manage this driver', 403, 'FORBIDDEN');
  }
  if (userRole === UserRole.driver && driver.userId !== userId) {
    throw new AppError('You can only update your own availability', 403, 'FORBIDDEN');
  }

  const availability = await prisma.driverAvailability.upsert({
    where: {
      driverId_dayOfWeek: {
        driverId,
        dayOfWeek: data.dayOfWeek,
      },
    },
    update: {
      startTime: data.startTime,
      endTime: data.endTime,
    },
    create: {
      driverId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
    },
  });

  return {
    id: availability.id,
    driverId: availability.driverId,
    dayOfWeek: availability.dayOfWeek,
    startTime: availability.startTime,
    endTime: availability.endTime,
  };
}

export async function deleteDriverAvailability(
  driverId: string,
  userId: string,
  userRole: UserRole,
  dayOfWeek: number
): Promise<void> {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new AppError('Driver not found', 404, 'NOT_FOUND');
  }

  // Auth check
  if (userRole === UserRole.owner && driver.ownerId !== userId) {
    throw new AppError('You do not manage this driver', 403, 'FORBIDDEN');
  }
  if (userRole === UserRole.driver && driver.userId !== userId) {
    throw new AppError('You can only update your own availability', 403, 'FORBIDDEN');
  }

  try {
    await prisma.driverAvailability.delete({
      where: {
        driverId_dayOfWeek: {
          driverId,
          dayOfWeek,
        },
      },
    });
  } catch (error: any) {
    // If doesn't exist, ignore
    if (error.code !== 'P2025') {
      throw error;
    }
  }
}

export async function getDriverAvailability(driverId: string): Promise<DriverAvailabilityResponse[]> {
  const list = await prisma.driverAvailability.findMany({
    where: { driverId },
    orderBy: { dayOfWeek: 'asc' },
  });

  return list.map(item => ({
    id: item.id,
    driverId: item.driverId,
    dayOfWeek: item.dayOfWeek,
    startTime: item.startTime,
    endTime: item.endTime,
  }));
}

export async function uploadKycDocument(
  userId: string,
  docType: KycDocumentType,
  documentData: string
): Promise<KycDocumentResponse> {
  const driver = await prisma.driver.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!driver) {
    throw new AppError('Driver profile not found', 404, 'NOT_FOUND');
  }

  // Encrypt document data/URL
  const encryptedKey = encrypt(documentData);

  // Check if a document of this type already exists for this driver
  const existingDoc = await prisma.kycDocument.findFirst({
    where: { driverId: driver.id, docType: docType as any },
  });

  let kycDoc;
  if (existingDoc) {
    kycDoc = await prisma.kycDocument.update({
      where: { id: existingDoc.id },
      data: {
        storageKey: encryptedKey,
        status: 'pending', // reset to pending on re-upload
        reviewedBy: null,
        reviewedAt: null,
      },
      include: {
        driver: {
          include: {
            user: true,
          },
        },
      },
    });
  } else {
    kycDoc = await prisma.kycDocument.create({
      data: {
        driverId: driver.id,
        docType: docType as any,
        storageKey: encryptedKey,
        status: 'pending',
      },
      include: {
        driver: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  // If driver overall status is not approved, or is rejected, reset/set it to pending
  if (driver.kycStatus !== KycStatus.approved) {
    await prisma.driver.update({
      where: { id: driver.id },
      data: { kycStatus: KycStatus.pending },
    });
  }

  return {
    id: kycDoc.id,
    driverId: kycDoc.driverId,
    docType: kycDoc.docType as KycDocumentType,
    storageKey: kycDoc.storageKey,
    status: kycDoc.status as KycDocumentStatus,
    reviewedBy: kycDoc.reviewedBy,
    reviewedAt: kycDoc.reviewedAt ? kycDoc.reviewedAt.toISOString() : null,
    createdAt: kycDoc.createdAt.toISOString(),
    updatedAt: kycDoc.updatedAt.toISOString(),
    driver: {
      id: kycDoc.driver.id,
      licenseNumber: kycDoc.driver.licenseNumber,
      user: kycDoc.driver.user ? {
        name: kycDoc.driver.user.name,
        email: kycDoc.driver.user.email,
      } : undefined,
    },
  };
}
