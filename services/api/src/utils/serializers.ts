import type { User, Vehicle, Load, Trip, Rating, SmsSendLog, KycDocument, Dispute } from "@prisma/client";
import type {
  UserDTO, VehicleDTO, LoadDTO, TripDTO, TripSummaryDTO,
  RatingDTO, SmsLogDTO, KycDocumentDTO, DisputeDTO,
} from "@smart-lorry/shared";
import type { LatLng } from "./geo";

export function serializeUser(user: User): UserDTO {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    role: user.role as any,
    avatarUrl: user.avatarUrl,
    banned: user.banned,
    preferredLang: user.preferredLang,
    gstin: user.gstin,
    businessName: user.businessName,
    createdAt: user.createdAt.toISOString(),
  };
}

export function serializeVehicle(
  vehicle: Vehicle & { owner?: User },
  location: LatLng | null,
  distanceKm?: number,
): VehicleDTO {
  return {
    id: vehicle.id,
    ownerId: vehicle.ownerId,
    ownerName: vehicle.owner?.name ?? "",
    type: vehicle.type as any,
    capacityKg: Number(vehicle.capacityKg),
    registration: vehicle.registration,
    status: vehicle.status as any,
    ratePerTrip: Number(vehicle.ratePerTrip),
    baseRatePerKm: Number(vehicle.baseRatePerKm),
    kycApproved: vehicle.kycApproved,
    currentLocation: location,
    distanceKm,
    createdAt: vehicle.createdAt.toISOString(),
  };
}

export function serializeTripSummary(trip: Trip & { owner: User; vehicle: Vehicle }): TripSummaryDTO {
  return {
    id: trip.id,
    status: trip.status as any,
    ownerName: trip.owner.name,
    vehicleRegistration: trip.vehicle.registration,
    agreedRate: Number(trip.agreedRate),
  };
}

export function serializeLoad(
  load: Load & { mill: User; trip?: (Trip & { owner: User; vehicle: Vehicle }) | null }
): LoadDTO {
  return {
    id: load.id,
    millId: load.millId,
    millName: load.mill.name,
    materialType: load.materialType,
    weightKg: Number(load.weightKg),
    vehicleTypeReq: load.vehicleTypeReq as any,
    pickupAddress: load.pickupAddress,
    pickupLat: Number(load.pickupLat),
    pickupLng: Number(load.pickupLng),
    dropAddress: load.dropAddress,
    dropLat: Number(load.dropLat),
    dropLng: Number(load.dropLng),
    offeredRate: Number(load.offeredRate),
    availableFrom: load.availableFrom.toISOString(),
    availableUntil: load.availableUntil.toISOString(),
    status: load.status as any,
    notes: load.notes,
    trip: load.trip ? serializeTripSummary(load.trip) : null,
    createdAt: load.createdAt.toISOString(),
    updatedAt: load.updatedAt.toISOString(),
  };
}

export function serializeRating(rating: Rating): RatingDTO {
  return {
    id: rating.id,
    tripId: rating.tripId,
    raterId: rating.raterId,
    rateeId: rating.rateeId,
    score: rating.score,
    comment: rating.comment,
    createdAt: rating.createdAt.toISOString(),
  };
}

export function serializeSmsLog(log: SmsSendLog): SmsLogDTO {
  return {
    id: log.id,
    tripId: log.tripId,
    toPhone: log.toPhone,
    messageType: log.messageType,
    messageBody: log.messageBody,
    sentAt: log.sentAt.toISOString(),
    success: log.success,
    providerRef: log.providerRef,
  };
}

type TripFull = Trip & {
  load: Load & { mill: User };
  vehicle: Vehicle;
  owner: User;
  mill: User;
  ratings: Rating[];
  smsLogs?: SmsSendLog[];
  payment?: any;
  proofOfDelivery?: any;
  invoice?: any;
};

export function serializeTrip(trip: TripFull): TripDTO {
  return {
    id: trip.id,
    loadId: trip.loadId,
    vehicleId: trip.vehicleId,
    ownerId: trip.ownerId,
    ownerName: trip.owner.name,
    millId: trip.millId,
    millName: trip.mill.name,
    vehicleRegistration: trip.vehicle.registration,
    vehicleType: trip.vehicle.type as any,
    agreedRate: Number(trip.agreedRate),
    status: trip.status as any,
    pickedUpAt: trip.pickedUpAt?.toISOString() ?? null,
    deliveredAt: trip.deliveredAt?.toISOString() ?? null,
    cancelledAt: trip.cancelledAt?.toISOString() ?? null,
    cancelReason: trip.cancelReason,
    lastSmsSentAt: trip.lastSmsSentAt?.toISOString() ?? null,
    load: serializeLoad(trip.load as any),
    ratings: trip.ratings.map(serializeRating),
    smsLogs: trip.smsLogs?.map(serializeSmsLog),
    payment: trip.payment ? serializePayment(trip.payment) : null,
    proofOfDelivery: trip.proofOfDelivery ? serializeProofOfDelivery(trip.proofOfDelivery) : null,
    invoice: trip.invoice ? serializeInvoice(trip.invoice) : null,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
  };
}

export function serializeKycDoc(
  doc: KycDocument & { user: User; reviewer?: User | null }
): KycDocumentDTO {
  return {
    id: doc.id,
    userId: doc.userId,
    userName: doc.user.name,
    docType: doc.docType,
    docUrl: doc.docUrl,
    status: doc.status as any,
    reviewNote: doc.reviewNote,
    reviewedBy: doc.reviewer?.name ?? null,
    reviewedAt: doc.reviewedAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

export function serializeDispute(
  dispute: Dispute & { raisedBy: User; resolver?: User | null }
): DisputeDTO {
  return {
    id: dispute.id,
    tripId: dispute.tripId,
    raisedById: dispute.raisedById,
    raisedByName: dispute.raisedBy.name,
    reason: dispute.reason,
    status: dispute.status,
    resolution: dispute.resolution,
    resolvedBy: dispute.resolver?.name ?? null,
    resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
    createdAt: dispute.createdAt.toISOString(),
  };
}

export function serializePayment(p: any): any {
  if (!p) return null;
  return {
    id: p.id,
    tripId: p.tripId,
    millId: p.millId,
    ownerId: p.ownerId,
    amount: Number(p.amount),
    platformFee: Number(p.platformFee),
    ownerPayout: Number(p.ownerPayout),
    currency: p.currency,
    status: p.status,
    razorpayOrderId: p.razorpayOrderId,
    razorpayPaymentId: p.razorpayPaymentId,
    razorpaySignature: p.razorpaySignature,
    paidAt: p.paidAt?.toISOString() ?? null,
    releasedAt: p.releasedAt?.toISOString() ?? null,
    refundedAt: p.refundedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeProofOfDelivery(pod: any): any {
  if (!pod) return null;
  return {
    id: pod.id,
    tripId: pod.tripId,
    photoUrls: pod.photoUrls,
    signatureUrl: pod.signatureUrl,
    receiverName: pod.receiverName,
    receiverPhone: pod.receiverPhone,
    deliveredAt: pod.deliveredAt.toISOString(),
    notes: pod.notes,
    createdAt: pod.createdAt.toISOString(),
  };
}

export function serializeInvoice(inv: any): any {
  if (!inv) return null;
  return {
    id: inv.id,
    tripId: inv.tripId,
    invoiceNo: inv.invoiceNo,
    millGstin: inv.millGstin,
    ownerGstin: inv.ownerGstin,
    baseAmount: Number(inv.baseAmount),
    cgstRate: Number(inv.cgstRate),
    sgstRate: Number(inv.sgstRate),
    cgstAmount: Number(inv.cgstAmount),
    sgstAmount: Number(inv.sgstAmount),
    totalAmount: Number(inv.totalAmount),
    pdfUrl: inv.pdfUrl,
    issuedAt: inv.issuedAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  };
}

export function serializeChatMessage(msg: any): any {
  if (!msg) return null;
  return {
    id: msg.id,
    tripId: msg.tripId,
    senderId: msg.senderId,
    senderName: msg.sender?.name ?? "",
    senderRole: msg.senderRole,
    body: msg.body,
    readAt: msg.readAt?.toISOString() ?? null,
    createdAt: msg.createdAt.toISOString(),
  };
}
