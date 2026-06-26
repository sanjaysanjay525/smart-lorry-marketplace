import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import {
  setVehicleLocation, getVehicleLocation, getVehicleLocations, findVehicleIdsWithinRadius,
} from "../utils/geo";
import { serializeVehicle } from "../utils/serializers";
import { reverseGeocode } from "../utils/reverseGeocode";
import {
  sendSms, smsInTransit,
} from "./sms.service";
import type {
  CreateVehicleInput, UpdateVehicleInput, UpdateVehicleRateInput,
  PaginationInput, VehicleDTO, Paginated, AvailableVehiclesInput,
} from "@smart-lorry/shared";
import type { Vehicle, User } from "@prisma/client";

type VehicleWithOwner = Vehicle & { owner: User };

// ─── CRUD ───────────────────────────────────────────────────────────

export async function createVehicle(ownerId: string, input: CreateVehicleInput): Promise<VehicleDTO> {
  const { currentLocation, ...rest } = input;
  const vehicle = await prisma.vehicle.create({
    data: { ...rest, ownerId },
    include: { owner: true },
  });
  if (currentLocation) await setVehicleLocation(vehicle.id, currentLocation);
  return serializeVehicle(vehicle as VehicleWithOwner, currentLocation ?? null);
}

export async function listVehiclesForOwner(
  ownerId: string,
  pagination: PaginationInput
): Promise<Paginated<VehicleDTO>> {
  const { page, limit } = pagination;
  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where: { ownerId },
      include: { owner: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vehicle.count({ where: { ownerId } }),
  ]);

  const locations = await getVehicleLocations(vehicles.map((v) => v.id));

  return {
    data: vehicles.map((v) =>
      serializeVehicle(v as VehicleWithOwner, locations.get(v.id) ?? null)
    ),
    page, limit, total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getVehicleById(vehicleId: string): Promise<VehicleDTO> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { owner: true },
  });
  if (!vehicle) throw AppError.notFound("Vehicle not found");
  const location = await getVehicleLocation(vehicleId);
  return serializeVehicle(vehicle as VehicleWithOwner, location);
}

export async function updateVehicle(
  vehicleId: string, ownerId: string, input: UpdateVehicleInput
): Promise<VehicleDTO> {
  await assertOwnsVehicle(vehicleId, ownerId);
  const { currentLocation, ...rest } = input;
  const vehicle = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: rest,
    include: { owner: true },
  });
  if (currentLocation) await setVehicleLocation(vehicleId, currentLocation);
  const location = currentLocation ?? (await getVehicleLocation(vehicleId));
  return serializeVehicle(vehicle as VehicleWithOwner, location);
}

export async function updateVehicleRate(
  vehicleId: string, ownerId: string, input: UpdateVehicleRateInput
): Promise<VehicleDTO> {
  await assertOwnsVehicle(vehicleId, ownerId);
  const vehicle = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { ratePerTrip: input.ratePerTrip, baseRatePerKm: input.baseRatePerKm },
    include: { owner: true },
  });
  const location = await getVehicleLocation(vehicleId);
  return serializeVehicle(vehicle as VehicleWithOwner, location);
}

export async function updateVehicleLocation(
  vehicleId: string, requesterId: string,
  location: { lat: number; lng: number }
): Promise<VehicleDTO> {
  await assertOwnsVehicle(vehicleId, requesterId);
  await setVehicleLocation(vehicleId, location);

  const vehicle = await prisma.vehicle.findUniqueOrThrow({
    where: { id: vehicleId },
    include: { owner: true },
  });

  // SMS trigger: if vehicle has an active in_transit / picked_up trip, notify mill owner
  // Rate-limit: at most 1 SMS per 30 minutes per trip
  try {
    const activeTrip = await prisma.trip.findFirst({
      where: { vehicleId, status: { in: ["in_transit", "picked_up"] } },
      include: { mill: true, load: true },
    });

    if (activeTrip) {
      const thirtyMin = 30 * 60 * 1000;
      const shouldSend =
        !activeTrip.lastSmsSentAt ||
        Date.now() - activeTrip.lastSmsSentAt.getTime() > thirtyMin;

      if (shouldSend) {
        const cityName = await reverseGeocode(location.lat, location.lng);
        const body = smsInTransit(
          vehicle.registration, cityName, activeTrip.load.dropAddress
        );
        // fire-and-forget
        sendSms(activeTrip.mill.phone, "in_transit", body, activeTrip.id).catch(() => {});
        // update lastSmsSentAt
        await prisma.trip.update({
          where: { id: activeTrip.id },
          data: { lastSmsSentAt: new Date() },
        });
      }
    }
  } catch {
    // SMS errors never block location updates
  }

  return serializeVehicle(vehicle as VehicleWithOwner, location);
}

export async function updateVehicleStatus(
  vehicleId: string, requesterId: string, status: "available" | "busy" | "offline"
): Promise<VehicleDTO> {
  await assertOwnsVehicle(vehicleId, requesterId);
  const vehicle = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status },
    include: { owner: true },
  });
  const location = await getVehicleLocation(vehicleId);
  return serializeVehicle(vehicle as VehicleWithOwner, location);
}

export async function deleteVehicle(vehicleId: string, ownerId: string): Promise<void> {
  await assertOwnsVehicle(vehicleId, ownerId);
  await prisma.vehicle.delete({ where: { id: vehicleId } });
}

// ─── Available Vehicles (public/mill browsing) ──────────────────────

export async function getAvailableVehicles(
  input: AvailableVehiclesInput
): Promise<Paginated<VehicleDTO>> {
  const { type, minCapacityKg, lat, lng, radiusKm = 50, page = 1, limit = 20 } = input;

  let vehicleIds: string[] | undefined;
  if (lat !== undefined && lng !== undefined) {
    vehicleIds = await findVehicleIdsWithinRadius({ lat, lng }, radiusKm);
    if (vehicleIds.length === 0) {
      return { data: [], page, limit, total: 0, totalPages: 1 };
    }
  }

  const where: any = { status: "available", kycApproved: true };
  if (vehicleIds) where.id = { in: vehicleIds };
  if (type) where.type = type;
  if (minCapacityKg) where.capacityKg = { gte: minCapacityKg };

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: { owner: true },
      orderBy: { ratePerTrip: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vehicle.count({ where }),
  ]);

  const locations = await getVehicleLocations(vehicles.map((v) => v.id));

  // If a lat/lng was given, calculate distance for each vehicle
  const data = vehicles.map((v) => {
    const loc = locations.get(v.id) ?? null;
    let distanceKm: number | undefined;
    if (lat !== undefined && lng !== undefined && loc) {
      const R = 6371;
      const dLat = ((loc.lat - lat) * Math.PI) / 180;
      const dLng = ((loc.lng - lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat * Math.PI) / 180) * Math.cos((loc.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
      distanceKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
    }
    return serializeVehicle(v as VehicleWithOwner, loc, distanceKm);
  });

  return { data, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// ─── Internal guards ────────────────────────────────────────────────

async function assertOwnsVehicle(vehicleId: string, ownerId: string): Promise<void> {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw AppError.notFound("Vehicle not found");
  if (vehicle.ownerId !== ownerId) throw AppError.forbidden("You don't own this vehicle");
}
