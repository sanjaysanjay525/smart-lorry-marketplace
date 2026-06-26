import type { UserRole, VehicleType, VehicleStatus, LoadStatus, TripStatus, KycStatus } from "../enums";

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserDTO {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  banned: boolean;
  preferredLang: string | null;
  gstin: string | null;
  businessName: string | null;
  createdAt: string;
}

export interface VehicleDTO {
  id: string;
  ownerId: string;
  ownerName: string;
  type: VehicleType;
  capacityKg: number;
  registration: string;
  status: VehicleStatus;
  ratePerTrip: number;
  baseRatePerKm: number;
  kycApproved: boolean;
  currentLocation: { lat: number; lng: number } | null;
  distanceKm?: number;
  createdAt: string;
}

// ─────────────── Loads ───────────────

export interface TripSummaryDTO {
  id: string;
  status: TripStatus;
  ownerName: string;
  vehicleRegistration: string;
  agreedRate: number;
}

export interface LoadDTO {
  id: string;
  millId: string;
  millName: string;
  materialType: string;
  weightKg: number;
  vehicleTypeReq: VehicleType;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropAddress: string;
  dropLat: number;
  dropLng: number;
  offeredRate: number;
  availableFrom: string;
  availableUntil: string;
  status: LoadStatus;
  notes: string | null;
  trip?: TripSummaryDTO | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────── Trips ───────────────

export interface SmsLogDTO {
  id: string;
  tripId: string;
  toPhone: string;
  messageType: string;
  messageBody: string;
  sentAt: string;
  success: boolean;
  providerRef: string | null;
}

export interface RatingDTO {
  id: string;
  tripId: string;
  raterId: string;
  rateeId: string;
  score: number;
  comment: string | null;
  createdAt: string;
}

export interface TripDTO {
  id: string;
  loadId: string;
  vehicleId: string;
  ownerId: string;
  ownerName: string;
  millId: string;
  millName: string;
  vehicleRegistration: string;
  vehicleType: VehicleType;
  agreedRate: number;
  status: TripStatus;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  lastSmsSentAt: string | null;
  load: LoadDTO;
  ratings: RatingDTO[];
  smsLogs?: SmsLogDTO[];
  payment?: PaymentDTO | null;
  proofOfDelivery?: ProofOfDeliveryDTO | null;
  invoice?: InvoiceDTO | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────── Admin ───────────────

export interface KycDocumentDTO {
  id: string;
  userId: string;
  userName: string;
  docType: string;
  docUrl: string;
  status: KycStatus;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface DisputeDTO {
  id: string;
  tripId: string;
  raisedById: string;
  raisedByName: string;
  reason: string;
  status: string;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AdminStatsDTO {
  totalOwners: number;
  totalMills: number;
  openLoads: number;
  activeTrips: number;
  pendingKyc: number;
  openDisputes: number;
}

// ─────────────── Payments ───────────────

export interface PaymentDTO {
  id: string;
  tripId: string;
  millId: string;
  ownerId: string;
  amount: number;
  platformFee: number;
  ownerPayout: number;
  currency: string;
  status: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  paidAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────── Proof Of Delivery ───────────────

export interface ProofOfDeliveryDTO {
  id: string;
  tripId: string;
  photoUrls: string[];
  signatureUrl: string | null;
  receiverName: string;
  receiverPhone: string;
  deliveredAt: string;
  notes: string | null;
  createdAt: string;
}

// ─────────────── GST Invoice ───────────────

export interface InvoiceDTO {
  id: string;
  tripId: string;
  invoiceNo: string;
  millGstin: string | null;
  ownerGstin: string | null;
  baseAmount: number;
  cgstRate: number;
  sgstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  pdfUrl: string | null;
  issuedAt: string;
  createdAt: string;
}

// ─────────────── Chat ───────────────

export interface ChatMessageDTO {
  id: string;
  tripId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}
