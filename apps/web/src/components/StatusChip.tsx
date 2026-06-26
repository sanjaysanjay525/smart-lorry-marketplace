import type { VehicleStatus, KycStatus } from "@smart-lorry/shared";

const VEHICLE_STATUS_STYLES: Record<VehicleStatus, string> = {
  available: "bg-highway-green/15 text-highway-green border-highway-green/40",
  busy: "bg-marigold/15 text-marigold-dark border-marigold/40",
  offline: "bg-slate/15 text-slate border-slate/30",
};

const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  available: "Available",
  busy: "On a trip",
  offline: "Offline",
};

export function VehicleStatusChip({ status }: { status: VehicleStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${VEHICLE_STATUS_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {VEHICLE_STATUS_LABEL[status]}
    </span>
  );
}

const KYC_STATUS_STYLES: Record<KycStatus, string> = {
  pending: "bg-marigold/15 text-marigold-dark border-marigold/40",
  approved: "bg-highway-green/15 text-highway-green border-highway-green/40",
  rejected: "bg-vermilion/15 text-vermilion border-vermilion/40",
};

const KYC_STATUS_LABEL: Record<KycStatus, string> = {
  pending: "KYC pending",
  approved: "KYC verified",
  rejected: "KYC rejected",
};

export function KycStatusChip({ status }: { status: KycStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${KYC_STATUS_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {KYC_STATUS_LABEL[status]}
    </span>
  );
}

const TRIP_STATUS_STYLES: Record<string, string> = {
  requested: "bg-marigold/15 text-marigold-dark border-marigold/40",
  accepted: "bg-night/15 text-night border-night/40",
  en_route: "bg-night/15 text-night border-night/40",
  in_progress: "bg-night/15 text-night border-night/40",
  delivered: "bg-highway-green/15 text-highway-green border-highway-green/40",
  cancelled: "bg-vermilion/15 text-vermilion border-vermilion/40",
};

const TRIP_STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  accepted: "Accepted",
  en_route: "En Route",
  in_progress: "In Progress",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function TripStatusChip({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
        TRIP_STATUS_STYLES[status] || "bg-slate/15 text-slate border-slate/30"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {TRIP_STATUS_LABEL[status] || status}
    </span>
  );
}

