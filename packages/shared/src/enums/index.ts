// Central enum definitions. Keep these in sync with services/api/prisma/schema.prisma.
// Two-role model: mill (mill owner) + owner (lorry owner). No driver role.

export const UserRole = {
  MILL:  "mill",
  OWNER: "owner",
  ADMIN: "admin",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const VehicleType = {
  MINI_TRUCK: "mini_truck",
  PICKUP:     "pickup",
  LCV:        "lcv",
  TRUCK_14FT: "truck_14ft",
  TRUCK_19FT: "truck_19ft",
  TRAILER:    "trailer",
  CONTAINER:  "container",
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

export const VehicleStatus = {
  AVAILABLE: "available",
  BUSY:      "busy",
  OFFLINE:   "offline",
} as const;
export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus];

export const LoadStatus = {
  OPEN:       "open",
  BOOKED:     "booked",
  IN_TRANSIT: "in_transit",
  DELIVERED:  "delivered",
  CANCELLED:  "cancelled",
} as const;
export type LoadStatus = (typeof LoadStatus)[keyof typeof LoadStatus];

export const TripStatus = {
  PENDING:    "pending",
  PICKED_UP:  "picked_up",
  IN_TRANSIT: "in_transit",
  DELIVERED:  "delivered",
  CANCELLED:  "cancelled",
} as const;
export type TripStatus = (typeof TripStatus)[keyof typeof TripStatus];

export const KycStatus = {
  PENDING:  "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;
export type KycStatus = (typeof KycStatus)[keyof typeof KycStatus];
