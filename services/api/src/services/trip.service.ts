import { 
  VehicleType, 
  VehicleStatus, 
  TripStatus, 
  PricingMode, 
  UserRole,
  LocationGeo,
  ApiResponse,
  KycStatus
} from '@slm/shared';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { calculateTripMetrics, calculateFare, PricingBreakdown } from '../pricing/pricingEngine';
import { createPaymentOrder, verifyPaymentSignature } from '../payments/razorpayAdapter';

export interface TripEstimateResult {
  vehicleType: VehicleType;
  metrics: {
    distanceKm: number;
    durationHours: number;
  };
  fare: PricingBreakdown;
}

export async function searchNearbyVehicles(
  lat: number,
  lng: number,
  radiusKm: number,
  type?: VehicleType
): Promise<any[]> {
  // PostGIS query to find vehicles within ST_DWithin
  const rawVehicles: any[] = await prisma.$queryRaw`
    SELECT v.id, v.owner_id as "ownerId", v.type, v.capacity_kg as "capacityKg", 
           v.registration, v.status,
           ST_X(v.current_location::geometry) as lng, 
           ST_Y(v.current_location::geometry) as lat
    FROM vehicles v
    WHERE v.status = 'available'
      ${type ? Prisma.raw(`AND v.type = '${type}'`) : Prisma.raw('')}
      AND ST_DWithin(v.current_location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusKm * 1000})
    ORDER BY ST_Distance(v.current_location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) ASC
  `;

  return rawVehicles.map(v => ({
    id: v.id,
    ownerId: v.ownerId,
    type: v.type as VehicleType,
    capacityKg: v.capacityKg,
    registration: v.registration,
    status: v.status as VehicleStatus,
    currentLocation: v.lat && v.lng ? { latitude: v.lat, longitude: v.lng } : null,
  }));
}

export async function getTripEstimates(params: {
  originAddress: string;
  originCoords: LocationGeo;
  destinationAddress: string;
  destinationCoords: LocationGeo;
  weightKg: number;
}): Promise<TripEstimateResult[]> {
  const { originCoords, destinationCoords, weightKg } = params;

  // Calculate route metrics
  const metrics = await calculateTripMetrics(
    { lat: originCoords.latitude, lng: originCoords.longitude },
    { lat: destinationCoords.latitude, lng: destinationCoords.longitude }
  );

  // Find active bookings in 10km radius of origin to factor demand
  const activeBookingsCountResult: any[] = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count 
    FROM trips t
    JOIN vehicles v ON t.vehicle_id = v.id
    WHERE t.status IN ('requested', 'accepted', 'en_route', 'in_progress')
      AND ST_DWithin(v.current_location, ST_SetSRID(ST_MakePoint(${originCoords.longitude}, ${originCoords.latitude}), 4326)::geography, 10000)
  `;
  const activeBookingsCount = activeBookingsCountResult[0]?.count || 0;

  // Query unique vehicle types and find rates
  const vehicles = await prisma.vehicle.findMany({
    where: { status: VehicleStatus.available },
  });

  const availableTypes = Array.from(new Set(vehicles.map(v => v.type)));
  
  // If no available vehicles, estimate using all standard vehicle types for user preview
  const typesToEstimate = availableTypes.length > 0 ? availableTypes : Object.values(VehicleType);

  const estimates: TripEstimateResult[] = [];

  for (const type of typesToEstimate) {
    // Find representative vehicle for rate values
    const vehicleForRates = vehicles.find(v => v.type === type) || {
      baseRatePerKm: 15,
      baseRatePerHour: 100,
      capacityKg: 1000,
    };

    const availableCount = vehicles.filter(v => v.type === type).length || 1;

    const fare = calculateFare({
      vehicleType: type as VehicleType,
      capacityKg: vehicleForRates.capacityKg,
      baseRatePerKm: vehicleForRates.baseRatePerKm,
      baseRatePerHour: vehicleForRates.baseRatePerHour,
      distanceM: metrics.distanceM,
      durationS: metrics.durationS,
      weightKg,
      activeBookingsCount,
      availableVehiclesCount: availableCount,
    });

    estimates.push({
      vehicleType: type as VehicleType,
      metrics: {
        distanceKm: parseFloat((metrics.distanceM / 1000).toFixed(2)),
        durationHours: parseFloat((metrics.durationS / 3600).toFixed(2)),
      },
      fare,
    });
  }

  return estimates;
}

export async function createTripBooking(
  customerId: string,
  data: {
    originAddress: string;
    originCoords: LocationGeo;
    destinationAddress: string;
    destinationCoords: LocationGeo;
    scheduledAt: string;
    vehicleId: string;
    weightKg: number;
    pricingMode: PricingMode;
  }
): Promise<{ trip: any; paymentOrder: any }> {
  // Validate vehicle availability
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: data.vehicleId },
    include: { assignedDriver: true },
  });

  if (!vehicle) {
    throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
  }
  if (vehicle.status !== VehicleStatus.available) {
    throw new AppError('Vehicle is busy or offline', 400, 'VEHICLE_UNAVAILABLE');
  }
  if (!vehicle.assignedDriver) {
    throw new AppError('Vehicle does not have an assigned driver', 400, 'NO_DRIVER_ASSIGNED');
  }

  // Calculate pricing breakdown
  const metrics = await calculateTripMetrics(
    { lat: data.originCoords.latitude, lng: data.originCoords.longitude },
    { lat: data.destinationCoords.latitude, lng: data.destinationCoords.longitude }
  );

  const fare = calculateFare({
    vehicleType: vehicle.type as VehicleType,
    capacityKg: vehicle.capacityKg,
    baseRatePerKm: vehicle.baseRatePerKm,
    baseRatePerHour: vehicle.baseRatePerHour,
    distanceM: metrics.distanceM,
    durationS: metrics.durationS,
    weightKg: data.weightKg,
  });

  // Create Razorpay payment order
  const amountPaise = fare.totalFare * 100; // Razorpay takes amounts in paise
  const orderId = `receipt_trip_${Date.now()}`;
  const rzpOrder = await createPaymentOrder(amountPaise, orderId);

  // Perform transaction insertion
  const trip = await prisma.$transaction(async (tx) => {
    // 1. Insert Trip
    const newTrip = await tx.trip.create({
      data: {
        customerId,
        vehicleId: data.vehicleId,
        driverId: vehicle.assignedDriver!.id,
        originAddress: data.originAddress,
        destinationAddress: data.destinationAddress,
        scheduledAt: new Date(data.scheduledAt),
        status: TripStatus.requested, // remains requested until paid
        pricingMode: data.pricingMode,
        priceTotal: fare.totalFare,
        priceBreakdown: fare as any,
      },
    });

    // Write PostGIS origin/destination values using raw SQL
    await tx.$executeRaw`
      UPDATE trips 
      SET origin_location = ST_SetSRID(ST_MakePoint(${data.originCoords.longitude}, ${data.originCoords.latitude}), 4326)::geography,
          destination_location = ST_SetSRID(ST_MakePoint(${data.destinationCoords.longitude}, ${data.destinationCoords.latitude}), 4326)::geography
      WHERE id = ${newTrip.id}
    `;

    // 2. Insert Route polyline
    await tx.route.create({
      data: {
        tripId: newTrip.id,
        waypoints: [] as any,
        distanceM: metrics.distanceM,
        durationS: metrics.durationS,
        polyline: '', // Filled in during routing loop or mocked here
      },
    });

    // 3. Create Payment record
    await tx.payment.create({
      data: {
        tripId: newTrip.id,
        razorpayOrderId: rzpOrder.orderId,
        amount: fare.totalFare,
        status: 'created',
        encryptedPayload: '', // will store encrypted payload upon verification
      },
    });

    return newTrip;
  });

  return {
    trip,
    paymentOrder: rzpOrder,
  };
}

export async function verifyTripPayment(
  customerId: string,
  data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }
): Promise<any> {
  const isValid = verifyPaymentSignature(
    data.razorpayOrderId,
    data.razorpayPaymentId,
    data.razorpaySignature
  );

  if (!isValid) {
    throw new AppError('Invalid payment signature verification failed', 400, 'PAYMENT_VERIFICATION_FAILED');
  }

  // Find payment record
  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: data.razorpayOrderId },
    include: { trip: true },
  });

  if (!payment) {
    throw new AppError('Payment transaction record not found', 404, 'NOT_FOUND');
  }

  // Update payment status and trip paid state
  const updatedTrip = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'captured',
        razorpayPaymentId: data.razorpayPaymentId,
        encryptedPayload: JSON.stringify(data), // Simple payload JSON string
      },
    });

    return tx.trip.update({
      where: { id: payment.tripId },
      data: {
        status: TripStatus.requested, // paid, waiting for driver acceptance
      },
    });
  });

  return updatedTrip;
}

export async function acceptTripBooking(tripId: string, driverUserId: string): Promise<any> {
  // Find driver
  const driver = await prisma.driver.findUnique({
    where: { userId: driverUserId },
  });

  if (!driver) {
    throw new AppError('Driver profile not found', 404, 'NOT_FOUND');
  }

  if (driver.kycStatus !== KycStatus.approved) {
    throw new AppError('Your profile KYC must be approved by an administrator before accepting trips.', 403, 'FORBIDDEN');
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) {
    throw new AppError('Trip not found', 404, 'NOT_FOUND');
  }

  if (trip.driverId !== driver.id) {
    throw new AppError('This trip is not assigned to you', 403, 'FORBIDDEN');
  }

  if (trip.status !== TripStatus.requested) {
    throw new AppError('Trip is already accepted or invalid state', 400, 'INVALID_STATE');
  }

  // Update trip status and set vehicle busy
  return prisma.$transaction(async (tx) => {
    // Set vehicle status to busy
    await tx.vehicle.update({
      where: { id: trip.vehicleId },
      data: { status: VehicleStatus.busy },
    });

    return tx.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.accepted },
    });
  });
}

export async function updateTripStatus(
  tripId: string,
  userId: string,
  userRole: UserRole,
  status: TripStatus
): Promise<any> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) {
    throw new AppError('Trip not found', 404, 'NOT_FOUND');
  }

  // Auth checks
  if (userRole === UserRole.driver) {
    const driver = await prisma.driver.findUnique({
      where: { userId },
    });
    if (!driver || trip.driverId !== driver.id) {
      throw new AppError('You are not the driver for this trip', 403, 'FORBIDDEN');
    }
  } else if (userRole === UserRole.customer) {
    if (trip.customerId !== userId) {
      throw new AppError('You did not book this trip', 403, 'FORBIDDEN');
    }
    // Customers can only cancel
    if (status !== TripStatus.cancelled) {
      throw new AppError('Customers can only cancel requested bookings', 400, 'INVALID_STATE');
    }
  }

  // Validate state transitions
  const validTransitions: Record<TripStatus, TripStatus[]> = {
    [TripStatus.requested]: [TripStatus.accepted, TripStatus.cancelled],
    [TripStatus.accepted]: [TripStatus.en_route, TripStatus.cancelled],
    [TripStatus.en_route]: [TripStatus.in_progress, TripStatus.cancelled],
    [TripStatus.in_progress]: [TripStatus.delivered, TripStatus.cancelled],
    [TripStatus.delivered]: [],
    [TripStatus.cancelled]: [],
  };

  const allowed = validTransitions[trip.status as TripStatus];
  if (!allowed.includes(status)) {
    throw new AppError(
      `Cannot transition trip from status '${trip.status}' to '${status}'`,
      400,
      'INVALID_STATE'
    );
  }

  return prisma.$transaction(async (tx) => {
    // If trip ends (delivered or cancelled), release the vehicle back to available
    if (status === TripStatus.delivered || status === TripStatus.cancelled) {
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: VehicleStatus.available },
      });
    }

    return tx.trip.update({
      where: { id: tripId },
      data: { status },
    });
  });
}

export async function addLocationUpdate(tripId: string, lat: number, lng: number): Promise<void> {
  const update = await prisma.tripLocationUpdate.create({
    data: { tripId },
  });

  // Save spatial location point
  await prisma.$executeRaw`
    UPDATE trip_location_updates 
    SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    WHERE id = ${update.id}
  `;
}

export async function getTripDetails(tripId: string): Promise<any> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      vehicle: true,
      driver: { include: { user: { select: { name: true, phone: true } } } },
      route: true,
    },
  });

  if (!trip) {
    throw new AppError('Trip not found', 404, 'NOT_FOUND');
  }

  // Fetch coordinates for origin/destination
  const rawLocs: any[] = await prisma.$queryRaw`
    SELECT ST_X(origin_location::geometry) as origin_lng, ST_Y(origin_location::geometry) as origin_lat,
           ST_X(destination_location::geometry) as dest_lng, ST_Y(destination_location::geometry) as dest_lat
    FROM trips 
    WHERE id = ${tripId}
  `;

  // Fetch last recorded GPS ping
  const rawLastPing: any[] = await prisma.$queryRaw`
    SELECT ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat
    FROM trip_location_updates
    WHERE trip_id = ${tripId}
    ORDER BY recorded_at DESC
    LIMIT 1
  `;

  const originCoords = rawLocs[0]?.origin_lat && rawLocs[0]?.origin_lng ? {
    latitude: rawLocs[0].origin_lat,
    longitude: rawLocs[0].origin_lng,
  } : null;

  const destCoords = rawLocs[0]?.dest_lat && rawLocs[0]?.dest_lng ? {
    latitude: rawLocs[0].dest_lat,
    longitude: rawLocs[0].dest_lng,
  } : null;

  const lastPing = rawLastPing[0]?.lat && rawLastPing[0]?.lng ? {
    latitude: rawLastPing[0].lat,
    longitude: rawLastPing[0].lng,
  } : null;

  return {
    ...trip,
    originCoords,
    destinationCoords: destCoords,
    currentLocation: lastPing,
  };
}

export async function getTripRouteHistory(tripId: string): Promise<any[]> {
  const result: any[] = await prisma.$queryRaw`
    SELECT id, recorded_at as "recordedAt", 
           ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude
    FROM trip_location_updates
    WHERE trip_id = ${tripId}
    ORDER BY recorded_at ASC
  `;

  return result;
}

export async function listUserTrips(userId: string, role: UserRole): Promise<any[]> {
  if (role === UserRole.customer) {
    return prisma.trip.findMany({
      where: { customerId: userId },
      include: { vehicle: true, driver: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });
  } else if (role === UserRole.driver) {
    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) return [];
    return prisma.trip.findMany({
      where: { driverId: driver.id },
      include: { vehicle: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });
  } else if (role === UserRole.owner) {
    return prisma.trip.findMany({
      where: { vehicle: { ownerId: userId } },
      include: { vehicle: true, driver: { include: { user: true } }, customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  return [];
}

