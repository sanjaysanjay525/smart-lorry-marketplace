// Phase 2 (Module 1 — Lorry rental end-to-end) adds the transparent pricing
// engine here:
//
//   total = baseFare
//         + (distanceKm * ratePerKm * vehicleMultiplier)
//         + (hours * ratePerHour)
//         + weightFactor
//         + demandSurcharge
//
// distance/duration come from Google Distance Matrix; demandSurcharge is a
// placeholder ratio (active bookings / available vehicles in radius) until
// Phase 5 swaps in the AI-scored version. The full breakdown is persisted to
// trips.price_breakdown so customers see exactly what they're paying for.
export {};
