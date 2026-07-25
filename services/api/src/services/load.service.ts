import { LoadPosting, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { LoadPostingCreateRequest, OwnerEarningsWidgetResponse, VehicleType } from '@slm/shared';
import { AppError } from '../middleware/errorHandler';
import { calculateFare } from '../pricing/pricingEngine';

export async function createLoadPosting(
  customerId: string,
  data: LoadPostingCreateRequest
): Promise<LoadPosting> {
  const load = await prisma.loadPosting.create({
    data: {
      customerId,
      weightKg: data.weightKg,
      preferredDate: new Date(data.preferredDate),
      status: 'open',
      originAddress: data.originAddress,
      destinationAddress: data.destinationAddress,
    },
  });

  await prisma.$executeRaw`
    UPDATE load_postings
    SET origin_location = ST_SetSRID(ST_MakePoint(${data.originCoords.longitude}, ${data.originCoords.latitude}), 4326)::geography,
        destination_location = ST_SetSRID(ST_MakePoint(${data.destinationCoords.longitude}, ${data.destinationCoords.latitude}), 4326)::geography,
        direction_bearing = degrees(ST_Azimuth(
          ST_SetSRID(ST_MakePoint(${data.originCoords.longitude}, ${data.originCoords.latitude}), 4326),
          ST_SetSRID(ST_MakePoint(${data.destinationCoords.longitude}, ${data.destinationCoords.latitude}), 4326)
        ))
    WHERE id = ${load.id}::uuid
  `;

  const updatedLoad = await prisma.loadPosting.findUnique({
    where: { id: load.id },
  });

  if (!updatedLoad) {
    throw new AppError('Failed to create load posting', 500, 'DATABASE_ERROR');
  }

  return updatedLoad;
}

export async function getOpenLoads(): Promise<any[]> {
  const loads = await prisma.loadPosting.findMany({
    where: { status: 'open' },
    orderBy: { createdAt: 'desc' },
  });

  const list: any[] = [];
  for (const load of loads) {
    const rawCoords: any[] = await prisma.$queryRaw`
      SELECT ST_X(origin_location::geometry) as origin_lng, ST_Y(origin_location::geometry) as origin_lat,
             ST_X(destination_location::geometry) as dest_lng, ST_Y(destination_location::geometry) as dest_lat
      FROM load_postings
      WHERE id = ${load.id}::uuid
    `;
    list.push({
      ...load,
      originCoords: rawCoords[0] ? { latitude: rawCoords[0].origin_lat, longitude: rawCoords[0].origin_lng } : undefined,
      destinationCoords: rawCoords[0] ? { latitude: rawCoords[0].dest_lat, longitude: rawCoords[0].dest_lng } : undefined,
    });
  }

  return list;
}

export async function matchReturnLoadsForTrip(
  tripId: string,
  radiusKm: number = 50
): Promise<any[]> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { vehicle: true },
  });

  if (!trip) {
    throw new AppError('Trip not found', 404, 'NOT_FOUND');
  }

  const rawTripLocs: any[] = await prisma.$queryRaw`
    SELECT ST_X(origin_location::geometry) as origin_lng, ST_Y(origin_location::geometry) as origin_lat,
           ST_X(destination_location::geometry) as dest_lng, ST_Y(destination_location::geometry) as dest_lat
    FROM trips 
    WHERE id = ${tripId}::uuid
  `;

  if (rawTripLocs.length === 0 || !rawTripLocs[0].dest_lat || !rawTripLocs[0].dest_lng) {
    throw new AppError('Trip does not have valid coordinates', 400, 'INVALID_COORDINATES');
  }

  const { origin_lng, origin_lat, dest_lng, dest_lat } = rawTripLocs[0];

  const queryResult: any[] = await prisma.$queryRaw`
    WITH return_trip AS (
      SELECT 
        ST_SetSRID(ST_MakePoint(${dest_lng}, ${dest_lat}), 4326)::geography as dropoff_loc,
        degrees(ST_Azimuth(
          ST_SetSRID(ST_MakePoint(${dest_lng}, ${dest_lat}), 4326),
          ST_SetSRID(ST_MakePoint(${origin_lng}, ${origin_lat}), 4326)
        )) as return_bearing
    )
    SELECT 
      l.id, l.customer_id as "customerId", l.weight_kg as "weightKg", 
      l.preferred_date as "preferredDate", l.status, l.origin_address as "originAddress", 
      l.destination_address as "destinationAddress", l.direction_bearing as "directionBearing",
      ST_Distance(l.origin_location, rt.dropoff_loc) as distance_m,
      ST_Distance(l.origin_location, l.destination_location) as load_distance_m,
      ST_X(l.origin_location::geometry) as origin_lng, ST_Y(l.origin_location::geometry) as origin_lat,
      ST_X(l.destination_location::geometry) as dest_lng, ST_Y(l.destination_location::geometry) as dest_lat,
      ABS(rt.return_bearing - l.direction_bearing) as raw_bearing_diff
    FROM load_postings l, return_trip rt
    WHERE l.status = 'open'
      AND l.weight_kg <= ${trip.vehicle.capacityKg}
      AND ST_DWithin(l.origin_location, rt.dropoff_loc, ${radiusKm * 1000})
    ORDER BY distance_m ASC
  `;

  const matches = queryResult.map(row => {
    let bearingDiff = row.raw_bearing_diff ?? 0;
    if (bearingDiff > 180) {
      bearingDiff = 360 - bearingDiff;
    }

    if (bearingDiff > 45) {
      return null;
    }

    const distanceM = row.distance_m ?? 0;
    const proximityScore = Math.max(0, 100 * (1 - distanceM / (radiusKm * 1000)));

    const bearingScore = Math.max(0, 100 * (1 - bearingDiff / 45));

    const weightScore = 100 * (row.weightKg / trip.vehicle.capacityKg);

    const matchScore = Math.round(0.3 * proximityScore + 0.4 * bearingScore + 0.3 * weightScore);

    const loadDistanceKm = row.load_distance_m / 1000;
    const durationS = row.load_distance_m / 11.11;

    const pricing = calculateFare({
      vehicleType: trip.vehicle.type as unknown as VehicleType,
      capacityKg: trip.vehicle.capacityKg,
      baseRatePerKm: trip.vehicle.baseRatePerKm,
      baseRatePerHour: trip.vehicle.baseRatePerHour,
      distanceM: row.load_distance_m,
      durationS,
      weightKg: row.weightKg,
    });

    const extraEarnings = pricing.totalFare;
    const fuelSavingsEstimate = Math.round(loadDistanceKm * 15.0);

    return {
      loadPosting: {
        id: row.id,
        customerId: row.customerId,
        weightKg: row.weightKg,
        preferredDate: row.preferredDate.toISOString(),
        status: row.status,
        originAddress: row.originAddress,
        destinationAddress: row.destinationAddress,
        directionBearing: row.directionBearing,
        originCoords: { latitude: row.origin_lat, longitude: row.origin_lng },
        destinationCoords: { latitude: row.dest_lat, longitude: row.dest_lng },
      },
      matchScore,
      fuelSavingsEstimate,
      extraEarnings,
    };
  }).filter(m => m !== null);

  return matches.sort((a, b) => b!.matchScore - a!.matchScore);
}

export async function acceptReturnLoad(
  tripId: string,
  loadId: string,
  userId: string
): Promise<any> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { vehicle: true, driver: true },
  });
  if (!trip) {
    throw new AppError('Original trip not found', 404, 'NOT_FOUND');
  }

  const isDriver = trip.driver.userId === userId;
  const isOwner = trip.vehicle.ownerId === userId;
  if (!isDriver && !isOwner) {
    throw new AppError('Unauthorized to accept return load for this trip', 403, 'FORBIDDEN');
  }

  const load = await prisma.loadPosting.findUnique({
    where: { id: loadId },
  });
  if (!load) {
    throw new AppError('Load posting not found', 404, 'NOT_FOUND');
  }
  if (load.status !== 'open') {
    throw new AppError('Load posting is no longer open', 400, 'INVALID_STATE');
  }

  const rawLoadCoords: any[] = await prisma.$queryRaw`
    SELECT ST_X(origin_location::geometry) as origin_lng, ST_Y(origin_location::geometry) as origin_lat,
           ST_X(destination_location::geometry) as dest_lng, ST_Y(destination_location::geometry) as dest_lat
    FROM load_postings
    WHERE id = ${loadId}::uuid
  `;
  if (rawLoadCoords.length === 0 || !rawLoadCoords[0].origin_lat) {
    throw new AppError('Load posting coordinates are missing', 400, 'INVALID_COORDINATES');
  }

  const { origin_lat, origin_lng, dest_lat, dest_lng } = rawLoadCoords[0];
  const distanceResult = await prisma.$queryRaw`
    SELECT ST_Distance(origin_location, destination_location) as dist_m
    FROM load_postings
    WHERE id = ${loadId}::uuid
  `;
  const distM = (distanceResult as any[])[0]?.dist_m || 25000;
  const durationS = distM / 11.11;

  const pricing = calculateFare({
    vehicleType: trip.vehicle.type as unknown as VehicleType,
    capacityKg: trip.vehicle.capacityKg,
    baseRatePerKm: trip.vehicle.baseRatePerKm,
    baseRatePerHour: trip.vehicle.baseRatePerHour,
    distanceM: distM,
    durationS,
    weightKg: load.weightKg,
  });

  const extraEarnings = pricing.totalFare;
  const fuelSavingsEstimate = Math.round((distM / 1000) * 15.0);

  return prisma.$transaction(async (tx) => {
    await tx.loadPosting.update({
      where: { id: loadId },
      data: { status: 'matched' },
    });

    const match = await tx.returnLoadMatch.create({
      data: {
        completedTripId: tripId,
        loadPostingId: loadId,
        matchScore: 100,
        fuelSavingsEstimate,
        extraEarnings,
        status: 'accepted',
      },
    });

    const returnTrip = await tx.trip.create({
      data: {
        type: 'return_leg',
        customerId: load.customerId,
        vehicleId: trip.vehicleId,
        driverId: trip.driverId,
        originAddress: load.originAddress,
        destinationAddress: load.destinationAddress,
        scheduledAt: new Date(),
        status: 'accepted',
        pricingMode: 'trip',
        priceTotal: extraEarnings,
        priceBreakdown: pricing as any,
        parentTripId: tripId,
      },
    });

    await tx.$executeRaw`
      UPDATE trips 
      SET origin_location = ST_SetSRID(ST_MakePoint(${origin_lng}, ${origin_lat}), 4326)::geography,
          destination_location = ST_SetSRID(ST_MakePoint(${dest_lng}, ${dest_lat}), 4326)::geography
      WHERE id = ${returnTrip.id}::uuid
    `;

    return {
      match,
      returnTrip,
    };
  });
}

export async function getOwnerEarningsWidget(ownerId: string): Promise<OwnerEarningsWidgetResponse> {
  const trips = await prisma.trip.findMany({
    where: {
      vehicle: { ownerId },
    },
    select: {
      id: true,
      type: true,
      priceTotal: true,
      createdAt: true,
    },
  });

  const returnTrips = trips.filter(t => t.type === 'return_leg');
  const returnTripIds = returnTrips.map(t => t.id);

  const matches = await prisma.returnLoadMatch.findMany({
    where: {
      completedTripId: { in: returnTripIds },
      status: 'accepted',
    },
    select: {
      fuelSavingsEstimate: true,
    },
  });

  const totalReturnTrips = returnTrips.length;
  const totalReturnEarnings = returnTrips.reduce((sum: number, t: any) => sum + t.priceTotal, 0);
  const totalFuelSavings = matches.reduce((sum: number, m: any) => sum + m.fuelSavingsEstimate, 0);
  const totalTrips = trips.length;
  const efficiencyGainPercent = totalTrips > 0 ? Math.round((totalReturnTrips / totalTrips) * 100) : 0;

  const monthlyEarningsMap: Record<string, number> = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`;
    monthlyEarningsMap[label] = 0;
  }

  returnTrips.forEach(t => {
    const date = new Date(t.createdAt);
    const label = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().substr(-2)}`;
    if (label in monthlyEarningsMap) {
      monthlyEarningsMap[label] += t.priceTotal;
    }
  });

  const monthlyEarningsTrend = Object.entries(monthlyEarningsMap).map(([month, amount]) => ({
    month,
    amount,
  }));

  return {
    totalReturnTrips,
    totalReturnEarnings,
    totalFuelSavings,
    efficiencyGainPercent,
    monthlyEarningsTrend,
  };
}
