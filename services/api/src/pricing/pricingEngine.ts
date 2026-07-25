import { Client } from '@googlemaps/google-maps-services-js';
import { VehicleType } from '@slm/shared';
import { config } from '../config';

const mapsClient = new Client({});

// Multipliers for different vehicle types
const VEHICLE_MULTIPLIERS: Record<VehicleType, number> = {
  [VehicleType.mini_truck]: 1.0,
  [VehicleType.lcv]: 1.25,
  [VehicleType.hcv]: 1.6,
  [VehicleType.trailer]: 2.0,
  [VehicleType.tanker]: 2.2,
  [VehicleType.flatbed]: 1.8,
  [VehicleType.refrigerated]: 2.5,
  [VehicleType.open_body]: 1.3,
};

export interface PricingBreakdown {
  baseFare: number;
  distanceKm: number;
  distanceCharge: number;
  durationHours: number;
  durationCharge: number;
  weightCharge: number;
  demandSurcharge: number;
  totalFare: number;
}

// Calculate Haversine distance between two coordinates in meters
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

interface CalculateTripMetricsResult {
  distanceM: number;
  durationS: number;
}

export async function calculateTripMetrics(
  origin: string | { lat: number; lng: number },
  destination: string | { lat: number; lng: number }
): Promise<CalculateTripMetricsResult> {
  const hasApiKey = !!config.googleMapsApiKey;

  if (hasApiKey) {
    try {
      const originStr = typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`;
      const destStr = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`;

      const res = await mapsClient.distancematrix({
        params: {
          origins: [originStr],
          destinations: [destStr],
          key: config.googleMapsApiKey,
        },
      });

      const element = res.data.rows[0]?.elements[0];
      if (element && element.status === 'OK') {
        return {
          distanceM: element.distance.value,
          durationS: element.duration.value,
        };
      }
    } catch (error) {
      console.warn('⚠️ Google Maps Distance Matrix API request failed, falling back to mock metrics calculations:', error);
    }
  }

  // Fallback / Mock calculations
  if (typeof origin !== 'string' && typeof destination !== 'string') {
    // Coordinate-based mock using straight line + routing factor (1.3x)
    const straightLineM = calculateHaversineDistance(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng
    );
    const distanceM = straightLineM * 1.3;
    // Assume average lorry speed is 40 km/h (11.11 m/s) in dev mock env
    const durationS = distanceM / 11.11;

    return { distanceM, durationS };
  } else {
    // Text-based fallback
    return {
      distanceM: 25000, // 25 km default
      durationS: 2700, // 45 minutes default
    };
  }
}

export function calculateFare(params: {
  vehicleType: VehicleType;
  capacityKg: number;
  baseRatePerKm: number;
  baseRatePerHour: number;
  distanceM: number;
  durationS: number;
  weightKg: number;
  activeBookingsCount?: number;
  availableVehiclesCount?: number;
}): PricingBreakdown {
  const {
    vehicleType,
    baseRatePerKm,
    baseRatePerHour,
    distanceM,
    durationS,
    weightKg,
    activeBookingsCount = 0,
    availableVehiclesCount = 1,
  } = params;

  const baseFare = 150; // Flat baseline fare in Rupees
  const distanceKm = distanceM / 1000;
  const durationHours = durationS / 3600;

  const typeMultiplier = VEHICLE_MULTIPLIERS[vehicleType] || 1.0;

  // Charge formulas
  const distanceCharge = distanceKm * baseRatePerKm * typeMultiplier;
  const durationCharge = durationHours * baseRatePerHour;

  // Weight factor: ₹0.05 per kg of cargo
  const weightCharge = weightKg * 0.05;

  // Surcharge calculation: active bookings divided by available fleet
  // If no available fleet, assume default 1.0 surcharge factor
  let surchargeMultiplier = 1.0;
  if (availableVehiclesCount > 0) {
    const ratio = activeBookingsCount / availableVehiclesCount;
    if (ratio > 1.2) {
      surchargeMultiplier = Math.min(1.5, 1.0 + (ratio - 1.2) * 0.5); // cap at 1.5x
    }
  }

  const rawTotal = baseFare + distanceCharge + durationCharge + weightCharge;
  const totalFare = Math.round(rawTotal * surchargeMultiplier);
  const demandSurcharge = Math.round(rawTotal * (surchargeMultiplier - 1.0));

  return {
    baseFare,
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    distanceCharge: parseFloat(distanceCharge.toFixed(2)),
    durationHours: parseFloat(durationHours.toFixed(2)),
    durationCharge: parseFloat(durationCharge.toFixed(2)),
    weightCharge: parseFloat(weightCharge.toFixed(2)),
    demandSurcharge: parseFloat(demandSurcharge.toFixed(2)),
    totalFare,
  };
}
