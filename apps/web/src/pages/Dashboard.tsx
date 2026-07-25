import React from 'react';
import { useAuth } from '../lib/auth';
import { UserRole } from '@slm/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const isOwner = user?.role === UserRole.owner;

  // Query vehicles for owner statistics
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data.data;
    },
    enabled: isOwner,
  });

  // Query drivers for owner statistics
  const { data: driversData } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await api.get('/drivers');
      return res.data.data;
    },
    enabled: isOwner,
  });

  const totalVehicles = vehiclesData?.length || 0;
  const activeVehicles = vehiclesData?.filter((v: any) => v.status === 'available').length || 0;
  const totalDrivers = driversData?.length || 0;

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-xl font-bold text-white mb-2">Hello, {user?.name}!</h2>
        <p className="text-sm text-muted-foreground">
          Welcome to your Smart Lorry Marketplace control center. Here you can monitor operations and manage your logistics.
        </p>
      </div>

      {isOwner && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="glass-card p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Fleet</p>
              <h3 className="text-3xl font-extrabold text-white mt-2">{totalVehicles}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">Vehicles registered</p>
            </div>
            <div className="text-3xl">🚛</div>
          </div>

          {/* Card 2 */}
          <div className="glass-card p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Vehicles</p>
              <h3 className="text-3xl font-extrabold text-emerald-400 mt-2">{activeVehicles}</h3>
              <p className="text-[10px] text-emerald-400/80 mt-1">Status set to Available</p>
            </div>
            <div className="text-3xl">🟢</div>
          </div>

          {/* Card 3 */}
          <div className="glass-card p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Linked Drivers</p>
              <h3 className="text-3xl font-extrabold text-blue-400 mt-2">{totalDrivers}</h3>
              <p className="text-[10px] text-blue-400/80 mt-1">Managed personnel</p>
            </div>
            <div className="text-3xl">🪪</div>
          </div>
        </div>
      )}

      {user?.role === UserRole.customer && (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-4">
          <div className="text-5xl">📦</div>
          <h3 className="text-lg font-bold text-white">Lorry Rental Engine (Phase 2)</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Our lorry booking & bidding engine will unlock in the next phase! You will be able to search trucks, view rates, get live quotes, and hire drivers.
          </p>
        </div>
      )}

      {user?.role === UserRole.driver && (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-4">
          <div className="text-5xl">🧭</div>
          <h3 className="text-lg font-bold text-white">Driver Navigation Center</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You are registered as an active driver. Your employer can assign you to a vehicle. Head to "My Profile" to update your schedule and licensing data.
          </p>
        </div>
      )}
    </div>
  );
};
