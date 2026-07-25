import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { KycStatus } from '@slm/shared';
import { api } from '../../lib/api';

export const DriverList: React.FC = () => {
  const { data: drivers, isLoading, error } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await api.get('/drivers');
      return res.data.data;
    },
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data.data;
    },
  });

  const getVehicleRegistration = (vehicleId: string | null) => {
    if (!vehicleId || !vehicles) return 'Unassigned';
    const v = vehicles.find((item: any) => item.id === vehicleId);
    return v ? v.registration : 'Unassigned';
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
        Failed to load drivers.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Drivers Fleet</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage your driver list, assign trucks, and monitor KYC approvals</p>
        </div>
        <Link
          to="/drivers/new"
          className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground shadow-md shadow-brand/10 hover:opacity-95 transition-all"
        >
          + Add Driver
        </Link>
      </div>

      {drivers?.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center text-muted-foreground space-y-4">
          <div className="text-4xl">🪪</div>
          <p className="text-sm font-medium">No drivers registered yet.</p>
          <Link
            to="/drivers/new"
            className="inline-block text-xs font-semibold text-brand hover:underline"
          >
            Create your first driver account
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {drivers?.map((driver: any) => {
            const kycColors = {
              [KycStatus.approved]: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              [KycStatus.pending]: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              [KycStatus.rejected]: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            };

            const registration = getVehicleRegistration(driver.vehicleId);

            return (
              <div key={driver.id} className="glass-card rounded-xl p-6 relative overflow-hidden flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center font-bold text-brand text-sm">
                      {driver.user?.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{driver.user?.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{driver.user?.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${kycColors[driver.kycStatus as KycStatus]}`}>
                    KYC {driver.kycStatus.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4 mb-5 text-xs">
                  <div>
                    <span className="text-muted-foreground block">License Number</span>
                    <span className="font-semibold text-white">{driver.licenseNumber}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Assigned Truck</span>
                    <span className={`font-semibold ${registration === 'Unassigned' ? 'text-slate-500' : 'text-white'}`}>
                      {registration}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Experience</span>
                    <span className="font-semibold text-white">{driver.yearsExperience} Years</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Rating</span>
                    <span className="font-semibold text-white">⭐ {driver.ratingAvg.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-auto text-xs">
                  <Link
                    to={`/drivers/${driver.id}/profile`}
                    className="text-brand hover:underline font-semibold"
                  >
                    View Availability & Info
                  </Link>
                  <Link
                    to={`/drivers/${driver.id}/edit`}
                    className="text-muted-foreground hover:text-white font-semibold transition-colors"
                  >
                    Manage & Link Truck →
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
