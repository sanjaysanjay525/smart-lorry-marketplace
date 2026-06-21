import type { User, Vehicle, Driver } from "@prisma/client";
import type { UserDTO, VehicleDTO, DriverDTO, DriverPublicDTO } from "@smart-lorry/shared";
import type { LatLng } from "./geo";

export function serializeUser(user: User): UserDTO {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

export function serializeVehicle(
  vehicle: Vehicle,
  location: LatLng | null,
  driver?: (Driver & { user: User }) | null
): VehicleDTO {
  return {
    id: vehicle.id,
    ownerId: vehicle.ownerId,
    type: vehicle.type,
    capacityKg: Number(vehicle.capacityKg),
    registration: vehicle.registration,
    status: vehicle.status,
    baseRatePerKm: Number(vehicle.baseRatePerKm),
    baseRatePerHour: Number(vehicle.baseRatePerHour),
    currentLocation: location,
    driver: driver ? serializeDriverPublic(driver) : undefined,
    createdAt: vehicle.createdAt.toISOString(),
  };
}

export function serializeDriverPublic(driver: Driver & { user: User }): DriverPublicDTO {
  return {
    id: driver.id,
    name: driver.user.name,
    avatarUrl: driver.user.avatarUrl,
    ratingAvg: Number(driver.ratingAvg),
    yearsExperience: driver.yearsExperience,
    kycStatus: driver.kycStatus,
  };
}

export function serializeDriver(driver: Driver & { user: User }): DriverDTO {
  return {
    ...serializeDriverPublic(driver),
    userId: driver.userId,
    ownerId: driver.ownerId,
    vehicleId: driver.vehicleId,
    licenseNumber: driver.licenseNumber,
    licenseExpiry: driver.licenseExpiry.toISOString(),
  };
}
