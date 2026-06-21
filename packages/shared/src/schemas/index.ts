import { z } from "zod";
import { UserRole, VehicleType, VehicleStatus, KycStatus } from "../enums";

// ---------- Auth ----------

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
  password: z.string().min(8).max(128),
  role: z.enum([UserRole.CUSTOMER, UserRole.OWNER, UserRole.DRIVER]),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

// ---------- Users ----------

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/)
    .optional(),
  avatarUrl: z.string().url().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Owner-side lookup to find a driver-role user by email or phone before
// linking them via POST /drivers (which needs their userId). Not part of the
// original Phase 1 route table, but linking a driver isn't usable without
// some way to resolve "this person" -> userId, so it's added here, scoped
// tightly (owner-only, driver-role-only, exact match) to avoid becoming a
// general user directory.
export const userLookupSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  })
  .refine((data) => Boolean(data.email) !== Boolean(data.phone), {
    message: "Provide exactly one of email or phone",
  });
export type UserLookupInput = z.infer<typeof userLookupSchema>;

// ---------- Geo ----------

export const pointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type PointInput = z.infer<typeof pointSchema>;

// ---------- Vehicles ----------

export const createVehicleSchema = z.object({
  type: z.enum([
    VehicleType.MINI_TRUCK,
    VehicleType.PICKUP,
    VehicleType.LCV,
    VehicleType.TRUCK_14FT,
    VehicleType.TRUCK_19FT,
    VehicleType.TRAILER,
    VehicleType.CONTAINER,
  ]),
  capacityKg: z.number().positive(),
  registration: z
    .string()
    .min(4)
    .max(20)
    .regex(/^[A-Z0-9- ]+$/i, "Use a valid registration number"),
  baseRatePerKm: z.number().nonnegative(),
  baseRatePerHour: z.number().nonnegative(),
  currentLocation: pointSchema.optional(),
});
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema.partial();
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

export const updateVehicleLocationSchema = z.object({
  location: pointSchema,
});
export type UpdateVehicleLocationInput = z.infer<typeof updateVehicleLocationSchema>;

export const updateVehicleStatusSchema = z.object({
  status: z.enum([VehicleStatus.AVAILABLE, VehicleStatus.BUSY, VehicleStatus.OFFLINE]),
});
export type UpdateVehicleStatusInput = z.infer<typeof updateVehicleStatusSchema>;

// ---------- Drivers ----------

export const createDriverSchema = z.object({
  userId: z.string().uuid(),
  vehicleId: z.string().uuid().optional(),
  licenseNumber: z.string().min(4).max(30),
  licenseExpiry: z.coerce.date(),
  yearsExperience: z.number().int().min(0).max(60),
});
export type CreateDriverInput = z.infer<typeof createDriverSchema>;

export const updateDriverSchema = z.object({
  vehicleId: z.string().uuid().nullable().optional(),
  licenseNumber: z.string().min(4).max(30).optional(),
  licenseExpiry: z.coerce.date().optional(),
  yearsExperience: z.number().int().min(0).max(60).optional(),
  kycStatus: z
    .enum([KycStatus.PENDING, KycStatus.APPROVED, KycStatus.REJECTED])
    .optional(),
});
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;

export const driverAvailabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6), // 0 = Sunday
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:mm format"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:mm format"),
});
export type DriverAvailabilityInput = z.infer<typeof driverAvailabilitySchema>;

// ---------- Pagination ----------

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationInput = z.infer<typeof paginationSchema>;
