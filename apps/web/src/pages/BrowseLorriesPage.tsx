import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/AppShell";
import { VEHICLE_TYPE_LABELS, formatCurrency, formatWeight } from "../lib/labels";
import { getAvailableVehicles } from "../lib/vehicles";
import type { VehicleType, VehicleDTO } from "@smart-lorry/shared";

export function BrowseLorriesPage() {
  const [type, setType] = useState<VehicleType | "">("");
  const [minCapacity, setMinCapacity] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["available-vehicles", type, minCapacity],
    queryFn: () =>
      getAvailableVehicles({
        ...(type ? { type: type as VehicleType } : {}),
        ...(minCapacity ? { minCapacityKg: Number(minCapacity) } : {}),
      }),
  });

  const vehicles = data?.data ?? [];

  return (
    <AppShell>
      <div className="px-6 py-6">
        <h1 className="text-2xl font-bold text-charcoal">Browse Available Lorries</h1>
        <p className="mt-1 text-sm text-charcoal/60">
          Find available lorries for your shipment. Post a load to book one.
        </p>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-3">
          <select
            className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as VehicleType | "")}
          >
            <option value="">All Vehicle Types</option>
            {Object.entries(VEHICLE_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Min capacity (kg)"
            className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
            value={minCapacity}
            onChange={(e) => setMinCapacity(e.target.value)}
          />
        </div>

        {/* Vehicle grid */}
        {isLoading ? (
          <p className="mt-8 text-center text-charcoal/50">Loading available lorries…</p>
        ) : vehicles.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-lg font-medium text-charcoal/60">No lorries available right now</p>
            <p className="mt-1 text-sm text-charcoal/40">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function VehicleCard({ vehicle: v }: { vehicle: VehicleDTO }) {
  return (
    <div className="rounded-xl border border-charcoal/10 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-charcoal">
            {VEHICLE_TYPE_LABELS[v.type]}
          </h3>
          <p className="mt-0.5 font-mono text-sm text-charcoal/60">{v.registration}</p>
        </div>
        <span className="rounded-full bg-neem/10 px-2.5 py-0.5 text-xs font-semibold text-neem">
          Available
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div className="space-y-1 text-sm text-charcoal/70">
          <p>Capacity: <span className="font-medium text-charcoal">{formatWeight(v.capacityKg)}</span></p>
          <p>Owner: <span className="font-medium text-charcoal">{v.ownerName}</span></p>
          {v.distanceKm !== undefined && (
            <p>Distance: <span className="font-medium text-charcoal">{v.distanceKm} km away</span></p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-neem">{formatCurrency(v.ratePerTrip)}</p>
          <p className="text-xs text-charcoal/50">per trip</p>
        </div>
      </div>
    </div>
  );
}
