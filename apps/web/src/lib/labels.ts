import type { VehicleType, LoadStatus, TripStatus } from "@smart-lorry/shared";

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  mini_truck: "Mini Truck",
  pickup: "Pickup",
  lcv: "LCV",
  truck_14ft: "14 ft Truck",
  truck_19ft: "19 ft Truck",
  trailer: "Trailer",
  container: "Container",
};

export const LOAD_STATUS_LABELS: Record<LoadStatus, string> = {
  open: "Open",
  booked: "Booked",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  pending: "Pending",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const LOAD_STATUS_COLORS: Record<LoadStatus, string> = {
  open: "bg-sky/10 text-sky",
  booked: "bg-turmeric/10 text-turmeric",
  in_transit: "bg-orange-100 text-orange-600",
  delivered: "bg-neem/10 text-neem",
  cancelled: "bg-vermilion/10 text-vermilion",
};

export const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  pending: "bg-turmeric/10 text-turmeric",
  picked_up: "bg-sky/10 text-sky",
  in_transit: "bg-orange-100 text-orange-600",
  delivered: "bg-neem/10 text-neem",
  cancelled: "bg-vermilion/10 text-vermilion",
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

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}
