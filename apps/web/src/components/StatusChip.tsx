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
