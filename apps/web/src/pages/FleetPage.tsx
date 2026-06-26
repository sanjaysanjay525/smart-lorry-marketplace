import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { VehicleTicket, STATUS_CYCLE } from "../components/VehicleTicket";
import { VehicleFormModal } from "../components/VehicleFormModal";
import { Button } from "../components/Button";
import { listVehicles, createVehicle, updateVehicle, updateVehicleStatus } from "../lib/vehicles";
import { formatCurrency } from "../lib/labels";
import type { VehicleDTO, CreateVehicleInput } from "@smart-lorry/shared";

export function FleetPage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleDTO | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => listVehicles(1, 50),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateVehicleInput) => createVehicle(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateVehicleInput }) => updateVehicle(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VehicleDTO["status"] }) => updateVehicleStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });

  const vehicles = data?.data ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-8 py-10">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-ink">My Fleet</h1>
            <p className="mt-1 text-sm text-slate">
              {data ? `${data.total} vehicle${data.total === 1 ? "" : "s"} registered` : "Your lorries, at a glance"}
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add vehicle
          </Button>
        </div>

        {isLoading && <p className="text-sm text-slate">Loading your fleet…</p>}
        {isError && (
          <p className="rounded-md bg-vermilion/10 px-3 py-2 text-sm text-vermilion">
            Couldn't load your fleet. Try refreshing the page.
          </p>
        )}

        {!isLoading && vehicles.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line py-16 text-center">
            <Truck className="h-8 w-8 text-slate" />
            <p className="text-sm text-slate">
              No vehicles yet. Add your first one to start accepting loads.
            </p>
            <Button onClick={() => setIsAddOpen(true)} size="sm">
              <Plus className="h-4 w-4" /> Add vehicle
            </Button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {vehicles.map((vehicle) => (
            <VehicleTicket
              key={vehicle.id}
              vehicle={vehicle}
              onEdit={() => setEditingVehicle(vehicle)}
              onToggleStatus={() =>
                statusMutation.mutate({ id: vehicle.id, status: STATUS_CYCLE[vehicle.status] })
              }
            />
          ))}
        </div>
      </div>

      {isAddOpen && (
        <VehicleFormModal
          onClose={() => setIsAddOpen(false)}
          onSubmit={async (input) => {
            await createMutation.mutateAsync(input);
          }}
        />
      )}

      {editingVehicle && (
        <VehicleFormModal
          initial={editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSubmit={async (input) => {
            await updateMutation.mutateAsync({ id: editingVehicle.id, input });
          }}
        />
      )}
    </AppShell>
  );
}
