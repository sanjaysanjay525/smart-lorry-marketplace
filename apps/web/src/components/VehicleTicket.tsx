import { Truck, Gauge, MapPin, UserRound, Pencil } from "lucide-react";
import type { VehicleDTO } from "@smart-lorry/shared";
import { VehicleStatusChip } from "./StatusChip";
import { VEHICLE_TYPE_LABELS, formatCurrency, formatWeight } from "../lib/labels";

interface VehicleTicketProps {
  vehicle: VehicleDTO;
  onEdit?: () => void;
  onToggleStatus?: () => void;
  onAssignDriver?: () => void;
}

const STATUS_CYCLE: Record<VehicleDTO["status"], VehicleDTO["status"]> = {
  offline: "available",
  available: "busy",
  busy: "offline",
};

export function VehicleTicket({ vehicle, onEdit, onToggleStatus, onAssignDriver }: VehicleTicketProps) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      {/* Stub */}
      <div className="flex w-20 flex-shrink-0 flex-col items-center justify-between gap-3 bg-night px-2 py-4 text-paper">
        <Truck className="h-6 w-6 text-marigold" strokeWidth={1.75} />
        <span className="rotate-180 text-[10px] font-semibold uppercase tracking-[0.2em] [writing-mode:vertical-rl]">
          Manifest
        </span>
      </div>

      {/* Perforation */}
      <div className="ticket-perforation w-0 flex-shrink-0 border-r border-dashed border-line" />

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate">
              {VEHICLE_TYPE_LABELS[vehicle.type]}
            </p>
            <p className="font-mono text-lg font-semibold tracking-wide text-ink">{vehicle.registration}</p>
          </div>
          <button
            type="button"
            onClick={onToggleStatus}
            title="Click to cycle status"
            className="rounded-full transition-transform hover:scale-105"
          >
            <VehicleStatusChip status={vehicle.status} />
          </button>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink">
          <span className="inline-flex items-center gap-1.5">
            <Gauge className="h-4 w-4 text-slate" /> {formatWeight(Number(vehicle.capacityKg))} capacity
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono">
            {formatCurrency(vehicle.baseRatePerKm)}/km · {formatCurrency(vehicle.baseRatePerHour)}/hr
          </span>
          {vehicle.currentLocation && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate" />
              {vehicle.currentLocation.lat.toFixed(3)}, {vehicle.currentLocation.lng.toFixed(3)}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between border-t border-line pt-3">
          {vehicle.driver ? (
            <span className="inline-flex items-center gap-2 text-sm text-ink">
              <UserRound className="h-4 w-4 text-slate" />
              {vehicle.driver.name}
              <span className="text-xs text-slate">★ {vehicle.driver.ratingAvg.toFixed(1)}</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={onAssignDriver}
              className="text-sm font-semibold text-vermilion underline decoration-dotted underline-offset-4 hover:text-vermilion-dark"
            >
              + Assign a driver
            </button>
          )}

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate hover:text-ink"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        </div>
      </div>
    </div>
  );
}

export { STATUS_CYCLE };
