import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { serializeDriver, serializeDriverPublic } from "../utils/serializers";
import type {
  CreateDriverInput,
  UpdateDriverInput,
  PaginationInput,
  DriverDTO,
  DriverPublicDTO,
  Paginated,
} from "@smart-lorry/shared";

const withUser = { include: { user: true } } as const;

/**
 * Owner links an existing `driver`-role user account to themselves, with
 * license details. If `vehicleId` is provided it's validated as owned by
 * the same owner before the link is made (a driver can't be assigned to
 * someone else's vehicle).
 */
export async function createDriver(ownerId: string, input: CreateDriverInput): Promise<DriverDTO> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw AppError.notFound("User not found");
  if (user.role !== "driver") {
    throw AppError.badRequest("Target user must have the 'driver' role");
  }

  const alreadyLinked = await prisma.driver.findUnique({ where: { userId: input.userId } });
  if (alreadyLinked) throw AppError.conflict("This user is already linked as a driver");

  if (input.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!vehicle) throw AppError.notFound("Vehicle not found");
    if (vehicle.ownerId !== ownerId) throw AppError.forbidden("You don't own this vehicle");
  }

  const driver = await prisma.driver.create({
    data: {
      userId: input.userId,
      ownerId,
      vehicleId: input.vehicleId,
      licenseNumber: input.licenseNumber,
      licenseExpiry: input.licenseExpiry,
      yearsExperience: input.yearsExperience,
    },
    ...withUser,
  });

  return serializeDriver(driver);
}

export async function listDriversForOwner(
  ownerId: string,
  pagination: PaginationInput
): Promise<Paginated<DriverDTO>> {
  const { page, limit } = pagination;
  const [drivers, total] = await Promise.all([
    prisma.driver.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      ...withUser,
    }),
    prisma.driver.count({ where: { ownerId } }),
  ]);

  return {
    data: drivers.map(serializeDriver),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function updateDriver(
  driverId: string,
  ownerId: string,
  input: UpdateDriverInput
): Promise<DriverDTO> {
  const existing = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!existing) throw AppError.notFound("Driver not found");
  if (existing.ownerId !== ownerId) throw AppError.forbidden("You don't manage this driver");

  if (input.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!vehicle) throw AppError.notFound("Vehicle not found");
    if (vehicle.ownerId !== ownerId) throw AppError.forbidden("You don't own this vehicle");
  }

  // kycStatus is intentionally accepted here for Phase 1 convenience; from
  // Phase 6 onward it's admin-only and this field gets stripped for owners
  // at the route layer.
  const driver = await prisma.driver.update({
    where: { id: driverId },
    data: input,
    ...withUser,
  });

  return serializeDriver(driver);
}

/** Public driver profile — what a customer sees when browsing a vehicle listing. */
export async function getDriverPublicProfile(driverId: string): Promise<DriverPublicDTO> {
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, ...withUser });
  if (!driver) throw AppError.notFound("Driver not found");
  return serializeDriverPublic(driver);
}
