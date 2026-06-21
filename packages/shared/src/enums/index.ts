// Central enum definitions. Keep these in sync with services/api/prisma/schema.prisma —
// Prisma enums are the source of truth for the DB; these mirror them for the web client
// and for runtime validation (zod) on the API boundary.

export const UserRole = {
  CUSTOMER: "customer",
  OWNER: "owner",
  DRIVER: "driver",
  ADMIN: "admin",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const VehicleType = {
  MINI_TRUCK: "mini_truck",
  PICKUP: "pickup",
  LCV: "lcv", // light commercial vehicle
  TRUCK_14FT: "truck_14ft",
  TRUCK_19FT: "truck_19ft",
  TRAILER: "trailer",
  CONTAINER: "container",
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

export const VehicleStatus = {
  AVAILABLE: "available",
  BUSY: "busy",
  OFFLINE: "offline",
} as const;
export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus];

export const KycStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;
export type KycStatus = (typeof KycStatus)[keyof typeof KycStatus];

// Phase 2+ — referenced now so the shared package doesn't need a breaking change later.
export const TripType = {
  RENTAL: "rental",
  RETURN_LEG: "return_leg",
  SHARED: "shared",
} as const;
export type TripType = (typeof TripType)[keyof typeof TripType];

export const TripStatus = {
  REQUESTED: "requested",
  ACCEPTED: "accepted",
  EN_ROUTE: "en_route",
  IN_PROGRESS: "in_progress",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;
export type TripStatus = (typeof TripStatus)[keyof typeof TripStatus];

export const PricingMode = {
  HOURLY: "hourly",
  TRIP: "trip",
} as const;
export type PricingMode = (typeof PricingMode)[keyof typeof PricingMode];
