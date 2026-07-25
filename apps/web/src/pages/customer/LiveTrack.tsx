import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { TripStatus, type LocationGeo } from '@slm/shared';
import { api } from '../../lib/api';
import { MapView } from '../../components/MapView';

export const LiveTrack: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [currentLocation, setCurrentLocation] = useState<LocationGeo | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  // Fetch initial trip data
  const { data: trip, isLoading, error, refetch } = useQuery({
    queryKey: ['trip', id],
    queryFn: async () => {
      const res = await api.get(`/trips/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  // Keep polling trip status in background in case status changes
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000); // query DB every 10s for state transitions

    return () => clearInterval(interval);
  }, [refetch]);

  // Connect to tracking socket room
  useEffect(() => {
    if (!id) return;

    const socket: Socket = io('http://localhost:3001');

    socket.on('connect', () => {
      socket.emit('join_trip', id);
    });

    socket.on('trip:location_update', (data: {
      latitude: number;
      longitude: number;
      durationS: number;
      distanceM: number;
    }) => {
      setCurrentLocation({ latitude: data.latitude, longitude: data.longitude });
      setEtaMinutes(Math.round(data.durationS / 60));
      setDistanceKm(parseFloat((data.distanceM / 1000).toFixed(1)));
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="rounded-lg bg-destructive/15 border border-destructive/20 p-4 text-destructive-foreground text-center">
        Failed to locate trip routing records.
      </div>
    );
  }

  const statusMap = {
    requested: { label: 'Waiting for Driver', step: 1, desc: 'Your trip order has been sent to nearby drivers' },
    accepted: { label: 'Driver Assigned', step: 2, desc: 'Driver is preparing to head to pickup' },
    en_route: { label: 'Lorry En Route', step: 3, desc: 'Lorry is heading to pickup point' },
    in_progress: { label: 'Cargo In Transit', step: 4, desc: 'Lorry is traveling to dropoff destination' },
    delivered: { label: 'Cargo Delivered', step: 5, desc: 'Cargo has arrived. Please verify and review' },
    cancelled: { label: 'Trip Cancelled', step: 0, desc: 'This trip booking has been cancelled' },
  };

  const currentStep = statusMap[trip.status as TripStatus]?.step || 1;
  const isDelivered = trip.status === 'delivered';
  const isCancelled = trip.status === 'cancelled';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Live Tracking Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time GPS coordinate telemetry feed</p>
        </div>
        {isDelivered && (
          <button
            onClick={() => navigate(`/trips/${id}/reviews`)}
            className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground shadow-md"
          >
            ⭐ Submit Dual Review
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Trip Status Progress Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-5 rounded-xl space-y-5">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Booking ID</span>
              <p className="text-xs font-semibold text-white truncate font-mono mt-0.5">{trip.id}</p>
            </div>

            {/* Tracking Info metrics if en route / transit */}
            {!isCancelled && !isDelivered && (
              <div className="grid grid-cols-2 gap-4 bg-slate-900/40 p-4 rounded border border-border/40 text-xs">
                <div>
                  <span className="text-muted-foreground block">Estimated ETA</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {etaMinutes !== null ? `${etaMinutes} mins` : 'Loading...'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Remaining Distance</span>
                  <span className="font-bold text-white text-sm">
                    {distanceKm !== null ? `${distanceKm} km` : 'Loading...'}
                  </span>
                </div>
              </div>
            )}

            {/* Progress steps */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Delivery Progress</h3>
              
              <div className="relative border-l-2 border-border pl-6 space-y-5 text-xs">
                {/* Step 1 */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 flex items-center justify-center text-[8px] ${
                    currentStep >= 1 ? 'bg-brand border-brand text-brand-foreground font-bold' : 'bg-slate-950 border-border text-muted-foreground'
                  }`}>✓</div>
                  <span className="font-semibold text-white block">Requested & Paid</span>
                  <span className="text-[10px] text-muted-foreground">Order received by servers</span>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 flex items-center justify-center text-[8px] ${
                    currentStep >= 2 ? 'bg-brand border-brand text-brand-foreground font-bold' : 'bg-slate-950 border-border text-muted-foreground'
                  }`}>✓</div>
                  <span className="font-semibold text-white block">Driver Accepted</span>
                  <span className="text-[10px] text-muted-foreground">Driver assignment complete</span>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 flex items-center justify-center text-[8px] ${
                    currentStep >= 3 ? 'bg-brand border-brand text-brand-foreground font-bold' : 'bg-slate-950 border-border text-muted-foreground'
                  }`}>✓</div>
                  <span className="font-semibold text-white block">Lorry En Route</span>
                  <span className="text-[10px] text-muted-foreground">Driver heading to pickup location</span>
                </div>

                {/* Step 4 */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 flex items-center justify-center text-[8px] ${
                    currentStep >= 4 ? 'bg-brand border-brand text-brand-foreground font-bold' : 'bg-slate-950 border-border text-muted-foreground'
                  }`}>✓</div>
                  <span className="font-semibold text-white block">Cargo In Transit</span>
                  <span className="text-[10px] text-muted-foreground">Lorry traveling to dropoff point</span>
                </div>

                {/* Step 5 */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 flex items-center justify-center text-[8px] ${
                    currentStep >= 5 ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold' : 'bg-slate-950 border-border text-muted-foreground'
                  }`}>✓</div>
                  <span className="font-semibold text-white block">Cargo Delivered</span>
                  <span className="text-[10px] text-muted-foreground">Booking completed successfully</span>
                </div>
              </div>
            </div>

            {/* Personnel & Vehicle details */}
            <div className="border-t border-border pt-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Driver Assigned:</span>
                <span className="font-semibold text-white">{trip.driver?.user?.name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lorry Registration:</span>
                <span className="font-semibold text-white">{trip.vehicle?.registration || 'N/A'}</span>
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-border/50">
                <span className="text-muted-foreground">Toll Expenses (Fastag):</span>
                <span className="font-semibold text-rose-400">₹{trip.tollExpenses || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tracking Map */}
        <div className="lg:col-span-3">
          <MapView
            origin={trip.originCoords}
            destination={trip.destinationCoords}
            currentLocation={currentLocation || trip.currentLocation}
            className="h-[520px] w-full rounded-xl border border-border/80"
          />
        </div>
      </div>
    </div>
  );
};
