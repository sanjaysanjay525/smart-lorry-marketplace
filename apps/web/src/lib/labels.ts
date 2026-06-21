import type { VehicleType } from "@smart-lorry/shared";

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  mini_truck: "Mini Truck",
  pickup: "Pickup",
  lcv: "LCV",
  truck_14ft: "14 ft Truck",
  truck_19ft: "19 ft Truck",
  trailer: "Trailer",
  container: "Container",
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatWeight(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(kg % 1000 === 0 ? 0 : 1)} t`;
  return `${kg} kg`;
}
