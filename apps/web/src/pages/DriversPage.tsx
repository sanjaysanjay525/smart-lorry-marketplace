import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Star } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { LinkDriverModal } from "../components/LinkDriverModal";
import { KycStatusChip } from "../components/StatusChip";
import { Button } from "../components/Button";
import { listDrivers, createDriver } from "../lib/drivers";
import { listVehicles } from "../lib/vehicles";
import type { CreateDriverInput } from "@smart-lorry/shared";

export function DriversPage() {
  const queryClient = useQueryClient();
  const [isLinkOpen, setIsLinkOpen] = useState(false);

  const driversQuery = useQuery({ queryKey: ["drivers"], queryFn: () => listDrivers(1, 50) });
  const vehiclesQuery = useQuery({ queryKey: ["vehicles"], queryFn: () => listVehicles(1, 50) });

  const linkMutation = useMutation({
    mutationFn: (input: CreateDriverInput) => createDriver(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  const drivers = driversQuery.data?.data ?? [];
  const unassignedVehicles = (vehiclesQuery.data?.data ?? []).filter((v) => !v.driver);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-8 py-10">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-ink">Drivers</h1>
            <p className="mt-1 text-sm text-slate">
              {driversQuery.data
                ? `${driversQuery.data.total} driver${driversQuery.data.total === 1 ? "" : "s"} linked to your fleet`
                : "Drivers you manage"}
            </p>
          </div>
          <Button onClick={() => setIsLinkOpen(true)}>
            <Plus className="h-4 w-4" /> Link a driver
          </Button>
        </div>

        {driversQuery.isLoading && <p className="text-sm text-slate">Loading drivers…</p>}

        {!driversQuery.isLoading && drivers.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line py-16 text-center">
            <Users className="h-8 w-8 text-slate" />
            <p className="text-sm text-slate">
              No drivers linked yet. They'll need their own account first — ask them to register with the
              "Driver" role, then link them here.
            </p>
            <Button onClick={() => setIsLinkOpen(true)} size="sm">
              <Plus className="h-4 w-4" /> Link a driver
            </Button>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-line bg-white">
          {drivers.map((driver, i) => (
            <div
              key={driver.id}
              className={`flex items-center justify-between gap-4 px-5 py-4 ${
                i !== drivers.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium text-ink">{driver.name}</p>
                <p className="font-mono text-xs text-slate">{driver.licenseNumber}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate">
                <Star className="h-3.5 w-3.5 fill-marigold text-marigold" />
                {driver.ratingAvg.toFixed(1)}
              </div>
              <span className="text-sm text-slate">{driver.yearsExperience} yrs exp.</span>
              <span className="text-sm text-slate">
                {driver.vehicleId ? "Assigned" : <em className="not-italic text-vermilion">Unassigned</em>}
              </span>
              <KycStatusChip status={driver.kycStatus} />
            </div>
          ))}
        </div>
      </div>

      {isLinkOpen && (
        <LinkDriverModal
          unassignedVehicles={unassignedVehicles}
          onClose={() => setIsLinkOpen(false)}
          onSubmit={async (input) => {
            await linkMutation.mutateAsync(input);
          }}
        />
      )}
    </AppShell>
  );
}
