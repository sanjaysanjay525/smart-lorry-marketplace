import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { serializeTrip } from "../utils/serializers";
import {
  sendSms, smsPickedUp, smsDelivered, smsTripCancelled,
} from "./sms.service";
import type { CancelTripInput, RateInput, TripDTO, Paginated } from "@smart-lorry/shared";

const TRIP_INCLUDE = {
  load: { include: { mill: true } },
  vehicle: true,
  owner: true,
  mill: true,
  ratings: true,
  smsLogs: true,
} as const;

function assertInvolved(trip: { ownerId: string; millId: string }, userId: string): void {
  if (trip.ownerId !== userId && trip.millId !== userId) {
    throw AppError.forbidden("You are not involved in this trip");
  }
}

// ─── List ─────────────────────────────────────────────────────────────

export async function listTrips(
  userId: string, role: string, page: number, limit: number
): Promise<Paginated<TripDTO>> {
  const where: any =
    role === "owner" ? { ownerId: userId }
    : role === "mill" ? { millId: userId }
    : {}; // admin sees all

  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      include: TRIP_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.trip.count({ where }),
  ]);

  return {
    data: trips.map((t) => serializeTrip(t as any)),
    page, limit, total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

// ─── Get by ID ────────────────────────────────────────────────────────

export async function getTripById(tripId: string, userId: string, role: string): Promise<TripDTO> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: TRIP_INCLUDE });
  if (!trip) throw AppError.notFound("Trip not found");
  if (role !== "admin") assertInvolved(trip, userId);
  return serializeTrip(trip as any);
}

// ─── Status Transitions ───────────────────────────────────────────────

export async function markPickedUp(tripId: string, ownerId: string): Promise<TripDTO> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: TRIP_INCLUDE });
  if (!trip) throw AppError.notFound("Trip not found");
  if (trip.ownerId !== ownerId) throw AppError.forbidden("Only the lorry owner can mark pickup");
  if (trip.status !== "pending") throw AppError.badRequest(`Trip is ${trip.status}, expected pending`);

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: { status: "picked_up", pickedUpAt: new Date() },
    include: TRIP_INCLUDE,
  });

  const body = smsPickedUp((trip as any).vehicle.registration, (trip as any).load.dropAddress);
  sendSms((trip as any).mill.phone, "picked_up", body, tripId).catch(() => {});

  return serializeTrip(updated as any);
}

export async function markInTransit(tripId: string, ownerId: string): Promise<TripDTO> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: TRIP_INCLUDE });
  if (!trip) throw AppError.notFound("Trip not found");
  if (trip.ownerId !== ownerId) throw AppError.forbidden("Only the lorry owner can mark in transit");
  if (trip.status !== "picked_up") throw AppError.badRequest(`Trip is ${trip.status}, expected picked_up`);

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: { status: "in_transit" },
    include: TRIP_INCLUDE,
  });

  return serializeTrip(updated as any);
}

export async function markDelivered(tripId: string, ownerId: string): Promise<TripDTO> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: TRIP_INCLUDE });
  if (!trip) throw AppError.notFound("Trip not found");
  if (trip.ownerId !== ownerId) throw AppError.forbidden("Only the lorry owner can mark delivery");
  if (trip.status !== "in_transit") throw AppError.badRequest(`Trip is ${trip.status}, expected in_transit`);

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.trip.update({
      where: { id: tripId },
      data: { status: "delivered", deliveredAt: new Date() },
      include: TRIP_INCLUDE,
    });
    await tx.load.update({ where: { id: t.loadId }, data: { status: "delivered" } });
    await tx.vehicle.update({ where: { id: t.vehicleId }, data: { status: "available" } });
    return t;
  });

  const body = smsDelivered((trip as any).load.materialType, (trip as any).load.dropAddress);
  sendSms((trip as any).mill.phone, "delivered", body, tripId).catch(() => {});

  return serializeTrip(updated as any);
}

export async function cancelTrip(
  tripId: string, userId: string, role: string, input: CancelTripInput
): Promise<TripDTO> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: TRIP_INCLUDE });
  if (!trip) throw AppError.notFound("Trip not found");
  if (role !== "admin") assertInvolved(trip, userId);

  const allowed = ["pending", "picked_up"];
  if (!allowed.includes(trip.status)) {
    throw AppError.badRequest(`Cannot cancel a ${trip.status} trip`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.trip.update({
      where: { id: tripId },
      data: { status: "cancelled", cancelledAt: new Date(), cancelReason: input.cancelReason },
      include: TRIP_INCLUDE,
    });
    await tx.load.update({ where: { id: t.loadId }, data: { status: "open" } });
    await tx.vehicle.update({ where: { id: t.vehicleId }, data: { status: "available" } });
    return t;
  });

  // Notify the OTHER party
  const tripData = trip as any;
  const isCancellerOwner = userId === trip.ownerId;
  const recipientPhone = isCancellerOwner ? tripData.mill.phone : tripData.owner.phone;
  const cancelledByName = isCancellerOwner ? tripData.owner.name : tripData.mill.name;
  const body = smsTripCancelled(cancelledByName, input.cancelReason);
  sendSms(recipientPhone, "trip_cancelled", body, tripId).catch(() => {});

  return serializeTrip(updated as any);
}

// ─── Rating ───────────────────────────────────────────────────────────

export async function rateTrip(
  tripId: string, raterId: string, role: string, input: RateInput
): Promise<TripDTO> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: TRIP_INCLUDE });
  if (!trip) throw AppError.notFound("Trip not found");
  if (role !== "admin") assertInvolved(trip, raterId);
  if (trip.status !== "delivered") throw AppError.badRequest("Can only rate delivered trips");

  // mill rates owner, owner rates mill
  const rateeId = raterId === trip.ownerId ? trip.millId : trip.ownerId;

  const existing = await prisma.rating.findUnique({
    where: { tripId_raterId: { tripId, raterId } },
  });
  if (existing) throw AppError.conflict("You have already rated this trip");

  await prisma.rating.create({
    data: { tripId, raterId, rateeId, score: input.score, comment: input.comment },
  });

  // Refresh trip with new rating
  const updated = await prisma.trip.findUniqueOrThrow({ where: { id: tripId }, include: TRIP_INCLUDE });
  return serializeTrip(updated as any);
}
