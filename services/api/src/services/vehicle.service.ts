import { prisma } from "../config/prisma";
import type { Vehicle, Driver, User } from "@prisma/client";
import { AppError } from "../utils/AppError";
import { setVehicleLocation, getVehicleLocation, getVehicleLocations } from "../utils/geo";
import { serializeVehicle } from "../utils/serializers";
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  PaginationInput,
  VehicleDTO,
  Paginated,
} from "@smart-lorry/shared";

type VehicleWithDriver = Vehicle & { driver: (Driver & { user: User }) | null };

export async function createVehicle(ownerId: string, input: CreateVehicleInput): Promise<VehicleDTO> {
  const { currentLocation, ...rest } = input;

  const vehicle = await prisma.vehicle.create({
    data: { ...rest, ownerId },
  });

  if (currentLocation) {
    await setVehicleLocation(vehicle.id, currentLocation);
  }

  const location = currentLocation ?? null;
  return serializeVehicle(vehicle, location);
}

export async function listVehiclesForOwner(
  ownerId: string,
  pagination: PaginationInput
): Promise<Paginated<VehicleDTO>> {
  const { page, limit } = pagination;
  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { driver: { include: { user: true } } },
    }),
    prisma.vehicle.count({ where: { ownerId } }),
  ]);

  const locations = await getVehicleLocations(vehicles.map((v: VehicleWithDriver) => v.id));

  return {
    data: vehicles.map((v: VehicleWithDriver) => serializeVehicle(v, locations.get(v.id) ?? null, v.driver)),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getVehicleById(vehicleId: string): Promise<VehicleDTO> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { driver: { include: { user: true } } },
  });
  if (!vehicle) throw AppError.notFound("Vehicle not found");

  const location = await getVehicleLocation(vehicleId);
  return serializeVehicle(vehicle, location, vehicle.driver);
}

export async function updateVehicle(
  vehicleId: string,
  ownerId: string,
  input: UpdateVehicleInput
): Promise<VehicleDTO> {
  await assertOwnsVehicle(vehicleId, ownerId);

  const { currentLocation, ...rest } = input;
  const vehicle = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: rest,
  });

  if (currentLocation) {
    await setVehicleLocation(vehicleId, currentLocation);
  }

  const location = currentLocation ?? (await getVehicleLocation(vehicleId));
  return serializeVehicle(vehicle, location);
}

export async function updateVehicleLocation(
  vehicleId: string,
  requesterId: string,
  requesterRole: string,
  location: { lat: number; lng: number }
): Promise<VehicleDTO> {
  await assertCanOperateVehicle(vehicleId, requesterId, requesterRole);
  await setVehicleLocation(vehicleId, location);

  const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
  return serializeVehicle(vehicle, location);
}

export async function updateVehicleStatus(
  vehicleId: string,
  requesterId: string,
  requesterRole: string,
  status: "available" | "busy" | "offline"
): Promise<VehicleDTO> {
  await assertCanOperateVehicle(vehicleId, requesterId, requesterRole);

  const vehicle = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status },
  });
  const location = await getVehicleLocation(vehicleId);
  return serializeVehicle(vehicle, location);
}

export async function deleteVehicle(vehicleId: string, ownerId: string): Promise<void> {
  await assertOwnsVehicle(vehicleId, ownerId);
  await prisma.vehicle.delete({ where: { id: vehicleId } });
}

// ---------- internal guards ----------

async function assertOwnsVehicle(vehicleId: string, ownerId: string): Promise<void> {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw AppError.notFound("Vehicle not found");
  if (vehicle.ownerId !== ownerId) throw AppError.forbidden("You don't own this vehicle");
}

// Owners can operate any of their vehicles; drivers can only operate the
// vehicle they're currently linked to (location pings, status toggles).
async function assertCanOperateVehicle(
  vehicleId: string,
  requesterId: string,
  requesterRole: string
): Promise<void> {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw AppError.notFound("Vehicle not found");

  if (requesterRole === "owner" && vehicle.ownerId === requesterId) return;

  if (requesterRole === "driver") {
    const driver = await prisma.driver.findUnique({ where: { userId: requesterId } });
    if (driver?.vehicleId === vehicleId) return;
  }

  throw AppError.forbidden("You don't have permission to operate this vehicle");
}
