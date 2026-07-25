import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { VehicleStatus } from '@slm/shared';
import { api } from '../../lib/api';

export const VehicleList: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: vehicles, isLoading, error } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data.data;
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VehicleStatus }) => {
      const res = await api.patch(`/vehicles/${id}/status`, { status });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  const handleStatusChange = (id: string, currentStatus: VehicleStatus) => {
    let nextStatus: VehicleStatus;
    if (currentStatus === VehicleStatus.offline) nextStatus = VehicleStatus.available;
    else if (currentStatus === VehicleStatus.available) nextStatus = VehicleStatus.busy;
    else nextStatus = VehicleStatus.offline;
    
    toggleStatusMutation.mutate({ id, status: nextStatus });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/15 border border-destructive/20 p-4 text-destructive-foreground">
        Failed to load vehicles.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Vehicle Fleet</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage your trucks, lorry types, and statuses</p>
        </div>
        <Link
          to="/vehicles/new"
          className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground shadow-md shadow-brand/10 hover:opacity-95 transition-all"
        >
          + Add Vehicle
        </Link>
      </div>

      {vehicles?.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center text-muted-foreground space-y-4">
          <div className="text-4xl">🚛</div>
          <p className="text-sm font-medium">No vehicles registered yet.</p>
          <Link
            to="/vehicles/new"
            className="inline-block text-xs font-semibold text-brand hover:underline"
          >
            Register your first truck
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {vehicles?.map((vehicle: any) => {
            const statusColors = {
              [VehicleStatus.available]: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              [VehicleStatus.busy]: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              [VehicleStatus.offline]: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
            };

            return (
              <div key={vehicle.id} className="glass-card rounded-xl p-6 relative overflow-hidden flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {vehicle.type.replace('_', ' ')}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{vehicle.registration}</h3>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${statusColors[vehicle.status as VehicleStatus]}`}>
                    {vehicle.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4 mb-5 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Capacity</span>
                    <span className="font-semibold text-white">{vehicle.capacityKg.toLocaleString()} kg</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Base Rate / Km</span>
                    <span className="font-semibold text-white">₹{vehicle.baseRatePerKm}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-auto">
                  <button
                    onClick={() => handleStatusChange(vehicle.id, vehicle.status)}
                    disabled={toggleStatusMutation.isPending}
                    className="text-xs text-brand hover:text-brand/80 font-semibold transition-colors disabled:opacity-50"
                  >
                    🔄 Toggle Status
                  </button>
                  <Link
                    to={`/vehicles/${vehicle.id}/edit`}
                    className="text-xs text-muted-foreground hover:text-white font-semibold transition-colors"
                  >
                    Edit Details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
