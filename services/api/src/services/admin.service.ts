import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { serializeUser, serializeKycDoc, serializeDispute } from "../utils/serializers";
import type {
  ReviewKycInput, ResolveDisputeInput, CreateDisputeInput, BanUserInput,
  AdminStatsDTO, UserDTO, KycDocumentDTO, DisputeDTO, Paginated,
} from "@smart-lorry/shared";

// ─── Stats ────────────────────────────────────────────────────────────

export async function getStats(): Promise<AdminStatsDTO> {
  const [totalOwners, totalMills, openLoads, activeTrips, pendingKyc, openDisputes] =
    await Promise.all([
      prisma.user.count({ where: { role: "owner" } }),
      prisma.user.count({ where: { role: "mill" } }),
      prisma.load.count({ where: { status: "open" } }),
      prisma.trip.count({ where: { status: { in: ["pending", "picked_up", "in_transit"] } } }),
      prisma.kycDocument.count({ where: { status: "pending" } }),
      prisma.dispute.count({ where: { status: "open" } }),
    ]);

  return { totalOwners, totalMills, openLoads, activeTrips, pendingKyc, openDisputes };
}

// ─── Users ────────────────────────────────────────────────────────────

export async function listUsers(
  role: string | undefined, page: number, limit: number
): Promise<Paginated<UserDTO>> {
  const where: any = role ? { role } : {};
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  return {
    data: users.map(serializeUser),
    page, limit, total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function banUser(userId: string, input: BanUserInput): Promise<UserDTO> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User not found");
  if (user.role === "admin") throw AppError.forbidden("Cannot ban an admin user");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { banned: input.banned },
  });
  return serializeUser(updated);
}

// ─── KYC ─────────────────────────────────────────────────────────────

export async function listKycDocs(
  status: string | undefined, page: number, limit: number
): Promise<Paginated<KycDocumentDTO>> {
  const where: any = status ? { status } : {};
  const [docs, total] = await Promise.all([
    prisma.kycDocument.findMany({
      where,
      include: { user: true, reviewer: true },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.kycDocument.count({ where }),
  ]);
  return {
    data: docs.map((d) => serializeKycDoc(d as any)),
    page, limit, total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function reviewKycDoc(
  docId: string, reviewerId: string, input: ReviewKycInput
): Promise<KycDocumentDTO> {
  const doc = await prisma.kycDocument.findUnique({ where: { id: docId } });
  if (!doc) throw AppError.notFound("KYC document not found");

  const updated = await prisma.kycDocument.update({
    where: { id: docId },
    data: {
      status: input.status,
      reviewNote: input.reviewNote,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    },
    include: { user: true, reviewer: true },
  });

  // If RC book approved, mark vehicle(s) of this owner as kycApproved
  if (input.status === "approved" && doc.docType === "rc_book") {
    await prisma.vehicle.updateMany({
      where: { ownerId: doc.userId },
      data: { kycApproved: true },
    });
  }

  return serializeKycDoc(updated as any);
}

// ─── Disputes ────────────────────────────────────────────────────────

export async function createDispute(
  raisedById: string, role: string, input: CreateDisputeInput
): Promise<DisputeDTO> {
  // Verify the user is involved in the trip
  const trip = await prisma.trip.findUnique({ where: { id: input.tripId } });
  if (!trip) throw AppError.notFound("Trip not found");
  if (role !== "admin" && trip.ownerId !== raisedById && trip.millId !== raisedById) {
    throw AppError.forbidden("You are not involved in this trip");
  }

  const dispute = await prisma.dispute.create({
    data: {
      tripId: input.tripId,
      raisedById,
      reason: input.reason,
    },
    include: { raisedBy: true, resolver: true },
  });

  return serializeDispute(dispute as any);
}

export async function listDisputes(
  userId: string, role: string, page: number, limit: number
): Promise<Paginated<DisputeDTO>> {
  const where: any = role === "admin" ? {} : { raisedById: userId };
  const [disputes, total] = await Promise.all([
    prisma.dispute.findMany({
      where,
      include: { raisedBy: true, resolver: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.dispute.count({ where }),
  ]);
  return {
    data: disputes.map((d) => serializeDispute(d as any)),
    page, limit, total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function resolveDispute(
  disputeId: string, resolvedById: string, input: ResolveDisputeInput
): Promise<DisputeDTO> {
  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
  if (!dispute) throw AppError.notFound("Dispute not found");

  const updated = await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      status: "resolved",
      resolution: input.resolution,
      resolvedBy: resolvedById,
      resolvedAt: new Date(),
    },
    include: { raisedBy: true, resolver: true },
  });

  return serializeDispute(updated as any);
}
