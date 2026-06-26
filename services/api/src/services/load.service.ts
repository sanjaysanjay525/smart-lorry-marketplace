import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { serializeLoad } from "../utils/serializers";
import { findVehicleIdsWithinRadius } from "../utils/geo";
import {
  sendSms, smsLoadPostedNotify, smsLoadAccepted,
} from "./sms.service";
import type {
  CreateLoadInput, UpdateLoadInput, LoadSearchInput, AcceptLoadInput,
  LoadDTO, TripDTO, Paginated,
} from "@smart-lorry/shared";
import type { Load, User, Trip, Vehicle } from "@prisma/client";
import { serializeTrip } from "../utils/serializers";

type LoadFull = Load & {
  mill: User;
  trip: (Trip & { owner: User; vehicle: Vehicle }) | null;
};

const LOAD_INCLUDE = {
  mill: true,
  trip: { include: { owner: true, vehicle: true } },
} as const;

// ─── Create ─────────────────────────────────────────────────────────

export async function createLoad(millId: string, input: CreateLoadInput): Promise<LoadDTO> {
  const load = await prisma.load.create({
    data: {
      millId,
      materialType: input.materialType,
      weightKg: input.weightKg,
      vehicleTypeReq: input.vehicleTypeReq,
      pickupAddress: input.pickupAddress,
      pickupLat: input.pickupLat,
      pickupLng: input.pickupLng,
      dropAddress: input.dropAddress,
      dropLat: input.dropLat,
      dropLng: input.dropLng,
      offeredRate: input.offeredRate,
      availableFrom: new Date(input.availableFrom),
      availableUntil: new Date(input.availableUntil),
      notes: input.notes,
    },
    include: LOAD_INCLUDE,
  });

  // Fire-and-forget: notify nearby lorry owners via SMS
  notifyNearbyOwners(load).catch(() => {});

  return serializeLoad(load as LoadFull);
}

async function notifyNearbyOwners(load: Load): Promise<void> {
  // Find vehicles with matching type within 100km of pickup
  const nearbyVehicleIds = await findVehicleIdsWithinRadius(
    { lat: Number(load.pickupLat), lng: Number(load.pickupLng) },
    100
  );
  if (nearbyVehicleIds.length === 0) return;

  // Get distinct owner phone numbers
  const owners = await prisma.user.findMany({
    where: {
      vehiclesOwned: {
        some: {
          id: { in: nearbyVehicleIds },
          type: load.vehicleTypeReq,
          status: "available",
          kycApproved: true,
        },
      },
    },
    select: { phone: true },
    distinct: ["id"],
  });

  const pickupCity = load.pickupAddress.split(",")[0]?.trim() ?? load.pickupAddress;
  const dropCity   = load.dropAddress.split(",")[0]?.trim()   ?? load.dropAddress;
  const body = smsLoadPostedNotify(
    load.materialType, Number(load.weightKg),
    pickupCity, dropCity, Number(load.offeredRate)
  );

  for (const owner of owners) {
    sendSms(owner.phone, "load_posted_notify", body).catch(() => {});
  }
}

// ─── Read ────────────────────────────────────────────────────────────

export async function getLoadById(id: string): Promise<LoadDTO> {
  const load = await prisma.load.findUnique({ where: { id }, include: LOAD_INCLUDE });
  if (!load) throw AppError.notFound("Load not found");
  return serializeLoad(load as LoadFull);
}

export async function searchLoads(input: LoadSearchInput): Promise<Paginated<LoadDTO>> {
  const { status, vehicleType, fromCity, toCity, page = 1, limit = 20 } = input;

  const where: any = {};
  if (status) where.status = status;
  else where.status = "open"; // default to open only
  if (vehicleType) where.vehicleTypeReq = vehicleType;
  if (fromCity) where.pickupAddress = { contains: fromCity, mode: "insensitive" };
  if (toCity) where.dropAddress = { contains: toCity, mode: "insensitive" };

  const [loads, total] = await Promise.all([
    prisma.load.findMany({
      where,
      include: LOAD_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.load.count({ where }),
  ]);

  return {
    data: loads.map((l) => serializeLoad(l as LoadFull)),
    page, limit, total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getMyLoads(millId: string, page: number, limit: number): Promise<Paginated<LoadDTO>> {
  const [loads, total] = await Promise.all([
    prisma.load.findMany({
      where: { millId },
      include: LOAD_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.load.count({ where: { millId } }),
  ]);

  return {
    data: loads.map((l) => serializeLoad(l as LoadFull)),
    page, limit, total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

// ─── Update ──────────────────────────────────────────────────────────

export async function updateLoad(id: string, millId: string, input: UpdateLoadInput): Promise<LoadDTO> {
  const load = await prisma.load.findUnique({ where: { id } });
  if (!load) throw AppError.notFound("Load not found");
  if (load.millId !== millId) throw AppError.forbidden("You don't own this load");
  if (load.status !== "open") throw AppError.badRequest(`Cannot update a load in ${load.status} status`);

  const updated = await prisma.load.update({
    where: { id },
    data: {
      ...(input.materialType && { materialType: input.materialType }),
      ...(input.weightKg && { weightKg: input.weightKg }),
      ...(input.pickupAddress && { pickupAddress: input.pickupAddress }),
      ...(input.pickupLat && { pickupLat: input.pickupLat }),
      ...(input.pickupLng && { pickupLng: input.pickupLng }),
      ...(input.dropAddress && { dropAddress: input.dropAddress }),
      ...(input.dropLat && { dropLat: input.dropLat }),
      ...(input.dropLng && { dropLng: input.dropLng }),
      ...(input.offeredRate && { offeredRate: input.offeredRate }),
      ...(input.availableFrom && { availableFrom: new Date(input.availableFrom) }),
      ...(input.availableUntil && { availableUntil: new Date(input.availableUntil) }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    include: LOAD_INCLUDE,
  });

  return serializeLoad(updated as LoadFull);
}

// ─── Cancel ──────────────────────────────────────────────────────────

export async function cancelLoad(id: string, millId: string): Promise<LoadDTO> {
  const load = await prisma.load.findUnique({ where: { id } });
  if (!load) throw AppError.notFound("Load not found");
  if (load.millId !== millId) throw AppError.forbidden("You don't own this load");
  if (load.status !== "open") throw AppError.badRequest(`Cannot cancel a ${load.status} load`);

  const updated = await prisma.load.update({
    where: { id },
    data: { status: "cancelled" },
    include: LOAD_INCLUDE,
  });
  return serializeLoad(updated as LoadFull);
}

// ─── Accept ──────────────────────────────────────────────────────────

export async function acceptLoad(
  loadId: string, ownerId: string, input: AcceptLoadInput
): Promise<TripDTO> {
  const { vehicleId } = input;

  // Validate vehicle
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { owner: true },
  });
  if (!vehicle) throw AppError.notFound("Vehicle not found");
  if (vehicle.ownerId !== ownerId)     throw AppError.forbidden("You don't own this vehicle");
  if (vehicle.status !== "available")  throw AppError.badRequest("Vehicle is not available");
  if (!vehicle.kycApproved)           throw AppError.badRequest("Vehicle KYC not yet approved by admin");

  // Load validation + Trip creation in transaction
  const { trip, smsDetails } = await prisma.$transaction(async (tx) => {
    const load = await tx.load.findUnique({
      where: { id: loadId },
      include: { mill: true },
    });
    if (!load) throw AppError.notFound("Load not found");
    if (load.status !== "open") throw AppError.conflict("Load is already " + load.status);
    if (load.vehicleTypeReq !== vehicle.type)
      throw AppError.badRequest(`Load requires ${load.vehicleTypeReq}, your vehicle is ${vehicle.type}`);
    if (vehicle.capacityKg < load.weightKg)
      throw AppError.badRequest(`Load needs ${load.weightKg}kg capacity, your vehicle has ${vehicle.capacityKg}kg`);

    const trip = await tx.trip.create({
      data: {
        loadId,
        vehicleId,
        ownerId,
        millId: load.millId,
        agreedRate: load.offeredRate,
        status: "pending",
      },
      include: {
        load: { include: { mill: true } },
        vehicle: true,
        owner: true,
        mill: true,
        ratings: true,
        smsLogs: true,
      },
    });

    await tx.load.update({ where: { id: loadId }, data: { status: "booked" } });
    await tx.vehicle.update({ where: { id: vehicleId }, data: { status: "busy" } });

    return {
      trip,
      smsDetails: {
        phone: load.mill.phone,
        ownerName: vehicle.owner.name,
        registration: vehicle.registration,
        type: vehicle.type,
        pickupAddress: load.pickupAddress,
        dropAddress: load.dropAddress,
      }
    };
  });

  // SMS to mill owner (safe, post-commit)
  const body = smsLoadAccepted(
    smsDetails.ownerName,
    smsDetails.registration,
    smsDetails.type.replace(/_/g, " "),
    smsDetails.pickupAddress,
    smsDetails.dropAddress
  );
  sendSms(smsDetails.phone, "load_accepted", body, trip.id).catch(() => {});

  return serializeTrip(trip as any);
}
