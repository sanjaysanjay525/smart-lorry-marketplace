import { VehicleCreateRequest, VehicleUpdateRequest, VehicleResponse, VehicleStatus, UserRole, LocationGeo } from '@slm/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

function formatVehicleResponse(vehicle: any, location: LocationGeo | null): VehicleResponse {
  return {
    id: vehicle.id,
    ownerId: vehicle.ownerId,
    type: vehicle.type,
    capacityKg: vehicle.capacityKg,
    registration: vehicle.registration,
    status: vehicle.status as VehicleStatus,
    currentLocation: location,
    baseRatePerKm: vehicle.baseRatePerKm,
    baseRatePerHour: vehicle.baseRatePerHour,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

async function getVehicleLocation(vehicleId: string): Promise<LocationGeo | null> {
  const result: any[] = await prisma.$queryRaw`
    SELECT ST_X(current_location::geometry) as lng, ST_Y(current_location::geometry) as lat 
    FROM vehicles 
    WHERE id = ${vehicleId}
  `;
  if (result.length > 0 && result[0].lat !== null && result[0].lng !== null) {
    return {
      latitude: result[0].lat,
      longitude: result[0].lng,
    };
  }
  return null;
}

export async function listOwnerVehicles(ownerId: string): Promise<VehicleResponse[]> {
  const vehicles = await prisma.vehicle.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
  });

  const responses = await Promise.all(
    vehicles.map(async (v) => {
      const loc = await getVehicleLocation(v.id);
      return formatVehicleResponse(v, loc);
    })
  );

  return responses;
}

export async function createVehicle(ownerId: string, data: VehicleCreateRequest): Promise<VehicleResponse> {
  // Check registration uniqueness
  const existing = await prisma.vehicle.findUnique({
    where: { registration: data.registration },
  });

  if (existing) {
    throw new AppError(`Vehicle with registration '${data.registration}' already exists`, 409, 'CONFLICT_ERROR');
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      ownerId,
      type: data.type,
      capacityKg: data.capacityKg,
      registration: data.registration,
      status: VehicleStatus.offline,
      baseRatePerKm: data.baseRatePerKm,
      baseRatePerHour: data.baseRatePerHour,
    },
  });

  return formatVehicleResponse(vehicle, null);
}

export async function getVehicleById(id: string): Promise<VehicleResponse> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  });

  if (!vehicle) {
    throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
  }

  const loc = await getVehicleLocation(vehicle.id);
  return formatVehicleResponse(vehicle, loc);
}

export async function updateVehicle(id: string, ownerId: string, data: VehicleUpdateRequest): Promise<VehicleResponse> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  });

  if (!vehicle) {
    throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
  }

  if (vehicle.ownerId !== ownerId) {
    throw new AppError('You do not own this vehicle', 403, 'FORBIDDEN');
  }

  if (data.registration) {
    const existing = await prisma.vehicle.findFirst({
      where: {
        registration: data.registration,
        id: { not: id },
      },
    });
    if (existing) {
      throw new AppError(`Vehicle with registration '${data.registration}' already exists`, 409, 'CONFLICT_ERROR');
    }
  }

  const updated = await prisma.vehicle.update({
    where: { id },
    data: {
      type: data.type,
      capacityKg: data.capacityKg,
      registration: data.registration,
      status: data.status as any,
      baseRatePerKm: data.baseRatePerKm,
      baseRatePerHour: data.baseRatePerHour,
    },
  });

  const loc = await getVehicleLocation(updated.id);
  return formatVehicleResponse(updated, loc);
}

export async function updateVehicleLocation(
  id: string,
  userId: string,
  userRole: UserRole,
  lat: number,
  lng: number
): Promise<VehicleResponse> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  });

  if (!vehicle) {
    throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
  }

  // Auth check: If owner, must own it. If driver, must be assigned to it.
  if (userRole === UserRole.owner && vehicle.ownerId !== userId) {
    throw new AppError('You do not own this vehicle', 403, 'FORBIDDEN');
  }

  if (userRole === UserRole.driver) {
    const driver = await prisma.driver.findUnique({
      where: { userId },
    });
    if (!driver || driver.vehicleId !== id) {
      throw new AppError('You are not assigned to this vehicle', 403, 'FORBIDDEN');
    }
  }

  // Update location using raw PostGIS query
  await prisma.$executeRaw`
    UPDATE vehicles 
    SET current_location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    WHERE id = ${id}
  `;

  // Fetch updated vehicle
  const updated = await prisma.vehicle.findUnique({
    where: { id },
  });

  return formatVehicleResponse(updated, { latitude: lat, longitude: lng });
}

export async function updateVehicleStatus(
  id: string,
  userId: string,
  userRole: UserRole,
  status: VehicleStatus
): Promise<VehicleResponse> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  });

  if (!vehicle) {
    throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
  }

  // Auth check
  if (userRole === UserRole.owner && vehicle.ownerId !== userId) {
    throw new AppError('You do not own this vehicle', 403, 'FORBIDDEN');
  }

  if (userRole === UserRole.driver) {
    const driver = await prisma.driver.findUnique({
      where: { userId },
    });
    if (!driver || driver.vehicleId !== id) {
      throw new AppError('You are not assigned to this vehicle', 403, 'FORBIDDEN');
    }
  }

  const updated = await prisma.vehicle.update({
    where: { id },
    data: { status: status as any },
  });

  const loc = await getVehicleLocation(updated.id);
  return formatVehicleResponse(updated, loc);
}
