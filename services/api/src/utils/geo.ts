import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export interface LatLng {
  lat: number;
  lng: number;
}

// Prisma's query engine can't model `geography(Point,4326)` columns, so the
// schema declares `currentLocation` as Unsupported(...) and we read/write it
// here with raw SQL. Every call is parameterized — never string-interpolate
// caller-supplied coordinates.

export async function setVehicleLocation(vehicleId: string, point: LatLng): Promise<void> {
  await prisma.$executeRaw`
    UPDATE vehicles
    SET current_location = ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326)::geography,
        updated_at = now()
    WHERE id = ${vehicleId}::uuid
  `;
}

export async function getVehicleLocation(vehicleId: string): Promise<LatLng | null> {
  const rows = await prisma.$queryRaw<{ lat: number; lng: number }[]>`
    SELECT ST_Y(current_location::geometry) AS lat, ST_X(current_location::geometry) AS lng
    FROM vehicles
    WHERE id = ${vehicleId}::uuid AND current_location IS NOT NULL
  `;
  return rows[0] ?? null;
}

// Bulk version used by list/search endpoints to avoid N+1 raw queries.
export async function getVehicleLocations(vehicleIds: string[]): Promise<Map<string, LatLng>> {
  if (vehicleIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<{ id: string; lat: number; lng: number }[]>`
    SELECT id, ST_Y(current_location::geometry) AS lat, ST_X(current_location::geometry) AS lng
    FROM vehicles
    WHERE id IN (${Prisma.join(vehicleIds)}) AND current_location IS NOT NULL
  `;
  return new Map(
    rows.map((r: { id: string; lat: number; lng: number }) => [r.id, { lat: r.lat, lng: r.lng }] as const)
  );
}

// Phase 2 will add ST_DWithin-based radius search here (GET /vehicles/search).
export async function findVehicleIdsWithinRadius(center: LatLng, radiusKm: number): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM vehicles
    WHERE current_location IS NOT NULL
      AND ST_DWithin(
        current_location,
        ST_SetSRID(ST_MakePoint(${center.lng}, ${center.lat}), 4326)::geography,
        ${radiusKm * 1000}
      )
  `;
  return rows.map((r: { id: string }) => r.id);
}
