import type { LoadDTO } from "@smart-lorry/shared";
import {
  VEHICLE_TYPE_LABELS, LOAD_STATUS_LABELS, LOAD_STATUS_COLORS,
  formatCurrency, formatWeight, formatDate,
} from "../lib/labels";

interface LoadCardProps {
  load: LoadDTO;
  showAcceptButton?: boolean;
  onAccept?: (loadId: string) => void;
  onClick?: (loadId: string) => void;
}

export function LoadCard({ load, showAcceptButton, onAccept, onClick }: LoadCardProps) {
  return (
    <div
      className="rounded-xl border border-charcoal/10 bg-white p-4 shadow-sm transition hover:shadow-md cursor-pointer"
      onClick={() => onClick?.(load.id)}
    >
      {/* Header: material + status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-charcoal">{load.materialType}</h3>
          <p className="text-xs text-charcoal/60">{formatWeight(load.weightKg)} · {VEHICLE_TYPE_LABELS[load.vehicleTypeReq]}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${LOAD_STATUS_COLORS[load.status]}`}
        >
          {LOAD_STATUS_LABELS[load.status]}
        </span>
      </div>

      {/* Route */}
      <div className="mt-3 flex items-center gap-2 text-sm text-charcoal/70">
        <div className="flex flex-col items-center">
          <span className="h-2 w-2 rounded-full bg-neem"></span>
          <span className="h-6 w-px bg-charcoal/20"></span>
          <span className="h-2 w-2 rounded-full bg-vermilion"></span>
        </div>
        <div className="flex-1">
          <p className="truncate font-medium">{load.pickupAddress}</p>
          <p className="mt-2 truncate font-medium">{load.dropAddress}</p>
        </div>
      </div>

      {/* Rate + timeline */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-lg font-bold text-neem">
          {formatCurrency(load.offeredRate)}
        </span>
        <span className="text-xs text-charcoal/50">
          {formatDate(load.availableFrom)} – {formatDate(load.availableUntil)}
        </span>
      </div>

      {/* Posted by */}
      <p className="mt-2 text-xs text-charcoal/50">Posted by {load.millName}</p>

      {/* Accept button for owners */}
      {showAcceptButton && load.status === "open" && (
        <button
          className="mt-3 w-full rounded-lg bg-neem px-4 py-2 text-sm font-semibold text-white transition hover:bg-neem/90"
          onClick={(e) => {
            e.stopPropagation();
            onAccept?.(load.id);
          }}
        >
          Accept Load
        </button>
      )}
    </div>
  );
}
