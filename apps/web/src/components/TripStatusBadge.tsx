import type { TripStatus } from "@smart-lorry/shared";
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from "../lib/labels";

interface TripStatusBadgeProps {
  status: TripStatus;
  className?: string;
}

export function TripStatusBadge({ status, className = "" }: TripStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TRIP_STATUS_COLORS[status]} ${className}`}
    >
      {TRIP_STATUS_LABELS[status]}
    </span>
  );
}
