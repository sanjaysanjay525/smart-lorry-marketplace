import { z } from "zod";
import { UserRole, VehicleType, VehicleStatus, LoadStatus, TripStatus } from "../enums";

// ─────────────────────────────── Auth ───────────────────────────────

export const registerSchema = z.object({
  name:     z.string().min(2).max(120),
  email:    z.string().email(),
  phone:    z.string().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
  password: z.string().min(8).max(128),
  role:     z.enum([UserRole.MILL, UserRole.OWNER]),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

// ─────────────────────────────── Users ───────────────────────────────

export const updateProfileSchema = z.object({
  name:          z.string().min(2).max(120).optional(),
  phone:         z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
  avatarUrl:     z.string().url().optional(),
  preferredLang: z.enum(["en", "ta"]).optional(),
  gstin:         z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Enter a valid 15-character GSTIN").optional().nullable(),
  businessName:  z.string().min(2).max(120).optional().nullable(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ─────────────────────────────── Geo ───────────────────────────────

export const pointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type PointInput = z.infer<typeof pointSchema>;

// ─────────────────────────────── Vehicles ───────────────────────────────

const vehicleTypeEnum = z.enum([
  VehicleType.MINI_TRUCK,
  VehicleType.PICKUP,
  VehicleType.LCV,
  VehicleType.TRUCK_14FT,
  VehicleType.TRUCK_19FT,
  VehicleType.TRAILER,
  VehicleType.CONTAINER,
]);

export const createVehicleSchema = z.object({
  type:          vehicleTypeEnum,
  capacityKg:    z.number().positive(),
  registration:  z.string().min(4).max(20).regex(/^[A-Z0-9\- ]+$/i, "Use a valid registration number"),
  ratePerTrip:   z.number().nonnegative(),
  baseRatePerKm: z.number().nonnegative(),
  currentLocation: pointSchema.optional(),
});
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema.partial();
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

export const updateVehicleRateSchema = z.object({
  ratePerTrip:   z.number().positive(),
  baseRatePerKm: z.number().positive(),
});
export type UpdateVehicleRateInput = z.infer<typeof updateVehicleRateSchema>;

export const updateVehicleLocationSchema = z.object({
  location: pointSchema,
});
export type UpdateVehicleLocationInput = z.infer<typeof updateVehicleLocationSchema>;

export const updateVehicleStatusSchema = z.object({
  status: z.enum([VehicleStatus.AVAILABLE, VehicleStatus.BUSY, VehicleStatus.OFFLINE]),
});
export type UpdateVehicleStatusInput = z.infer<typeof updateVehicleStatusSchema>;

export const availableVehiclesSchema = z.object({
  type:         vehicleTypeEnum.optional(),
  minCapacityKg: z.coerce.number().positive().optional(),
  lat:          z.coerce.number().min(-90).max(90).optional(),
  lng:          z.coerce.number().min(-180).max(180).optional(),
  radiusKm:     z.coerce.number().positive().default(50),
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(100).default(20),
});
export type AvailableVehiclesInput = z.infer<typeof availableVehiclesSchema>;

// ─────────────────────────────── Pagination ───────────────────────────────

export const paginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

// ─────────────────────────────── Loads ───────────────────────────────

export const createLoadSchema = z.object({
  materialType:   z.string().min(2).max(100),
  weightKg:       z.number().positive(),
  vehicleTypeReq: vehicleTypeEnum,
  pickupAddress:  z.string().min(5),
  pickupLat:      z.number().min(8).max(14),
  pickupLng:      z.number().min(76).max(81),
  dropAddress:    z.string().min(5),
  dropLat:        z.number().min(8).max(14),
  dropLng:        z.number().min(76).max(81),
  offeredRate:    z.number().positive(),
  availableFrom:  z.string().datetime(),
  availableUntil: z.string().datetime(),
  notes:          z.string().max(500).optional(),
});
export type CreateLoadInput = z.infer<typeof createLoadSchema>;

export const updateLoadSchema = createLoadSchema.partial().omit({ vehicleTypeReq: true });
export type UpdateLoadInput = z.infer<typeof updateLoadSchema>;

export const acceptLoadSchema = z.object({
  vehicleId: z.string().uuid(),
});
export type AcceptLoadInput = z.infer<typeof acceptLoadSchema>;

export const loadSearchSchema = z.object({
  status:      z.enum(["open", "booked", "in_transit", "delivered", "cancelled"]).optional(),
  vehicleType: vehicleTypeEnum.optional(),
  fromCity:    z.string().optional(),
  toCity:      z.string().optional(),
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
});
export type LoadSearchInput = z.infer<typeof loadSearchSchema>;

// ─────────────────────────────── Trips ───────────────────────────────

export const cancelTripSchema = z.object({
  cancelReason: z.string().min(5).max(300),
});
export type CancelTripInput = z.infer<typeof cancelTripSchema>;

export const rateSchema = z.object({
  score:   z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});
export type RateInput = z.infer<typeof rateSchema>;

// ─────────────────────────────── KYC / Disputes ───────────────────────────────

export const createKycDocSchema = z.object({
  docType: z.enum(["rc_book", "insurance", "fitness_cert", "aadhar"]),
  docUrl:  z.string().url(),
});
export type CreateKycDocInput = z.infer<typeof createKycDocSchema>;

export const reviewKycSchema = z.object({
  status:     z.enum(["approved", "rejected"]),
  reviewNote: z.string().max(500).optional(),
});
export type ReviewKycInput = z.infer<typeof reviewKycSchema>;

export const createDisputeSchema = z.object({
  tripId: z.string().uuid(),
  reason: z.string().min(10).max(1000),
});
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;

export const resolveDisputeSchema = z.object({
  resolution: z.string().min(5).max(1000),
});
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;

export const banUserSchema = z.object({
  banned: z.boolean(),
});
export type BanUserInput = z.infer<typeof banUserSchema>;

// ─────────────────────────────── Additional Features ───────────────────────────────

export const verifyPaymentSchema = z.object({
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export const createPodSchema = z.object({
  photoUrls:     z.array(z.string().url()).min(1).max(3),
  signatureUrl:  z.string().url().optional().nullable(),
  receiverName:  z.string().min(2).max(100),
  receiverPhone: z.string().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
  notes:         z.string().max(500).optional().nullable(),
});
export type CreatePodInput = z.infer<typeof createPodSchema>;

export const sendChatMessageSchema = z.object({
  body: z.string().min(1).max(1000),
});
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
