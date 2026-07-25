import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { TripStatus } from '@slm/shared';
import { api } from '../../lib/api';

export const TripsQueue: React.FC = () => {
  const queryClient = useQueryClient();
  
  const [simulatingTripId, setSimulatingTripId] = useState<string | null>(null);
  const [autoPing, setAutoPing] = useState(false);
  const [simCoords, setSimCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pingCount, setPingCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);

  // Fetch driver's trips
  const { data: trips, isLoading } = useQuery({
    queryKey: ['driverTrips'],
    queryFn: async () => {
      const res = await api.get('/trips');
      return res.data.data;
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (tripId: string) => {
      return api.patch(`/trips/${tripId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverTrips'] });
    },
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TripStatus }) => {
      return api.patch(`/trips/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverTrips'] });
    },
  });

  // Handle Socket connections for GPS Simulation
  useEffect(() => {
    socketRef.current = io('http://localhost:3001');

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Simulating coordinates loop
  useEffect(() => {
    if (!autoPing || !simulatingTripId || !simCoords) return;

    const trip = trips?.find((t: any) => t.id === simulatingTripId);
    if (!trip) return;

    const interval = setInterval(() => {
      // Linearly interpolate towards destination coordinates
      const dest = trip.destinationCoords;
      if (!dest) return;

      const dLat = dest.latitude - simCoords.lat;
      const dLng = dest.longitude - simCoords.lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);

      // Move 5% closer on each ping
      let nextLat = simCoords.lat + dLat * 0.05;
      let nextLng = simCoords.lng + dLng * 0.05;

      // If extremely close, snap to destination
      if (dist < 0.005) {
        nextLat = dest.latitude;
        nextLng = dest.longitude;
        setAutoPing(false);
      }

      const nextPos = { lat: parseFloat(nextLat.toFixed(6)), lng: parseFloat(nextLng.toFixed(6)) };
      setSimCoords(nextPos);
      setPingCount(prev => prev + 1);

      // Send telemetry ping over WebSockets
      if (socketRef.current) {
        socketRef.current.emit('trip:location_ping', {
          tripId: simulatingTripId,
          latitude: nextPos.lat,
          longitude: nextPos.lng,
        });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [autoPing, simulatingTripId, simCoords, trips]);

  const handleStartSimulation = (trip: any) => {
    setSimulatingTripId(trip.id);
    // Start simulation coordinates at origin coords
    setSimCoords({
      lat: trip.originCoords?.latitude ?? 19.0760,
      lng: trip.originCoords?.longitude ?? 72.8777,
    });
    setPingCount(0);
    setAutoPing(true);
  };

  const handleStopSimulation = () => {
    setAutoPing(false);
    setSimulatingTripId(null);
    setSimCoords(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
      </div>
    );
  }

  // Filter for active driver trips
  const activeTrips = trips?.filter((t: any) => t.status !== 'delivered' && t.status !== 'cancelled') || [];
  const completedTrips = trips?.filter((t: any) => t.status === 'delivered' || t.status === 'cancelled') || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Driver Booking Queue</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage your assigned trips, update transit statuses, and stream GPS telemetry</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Active Queue */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Active Bookings</h2>

          {activeTrips.length === 0 ? (
            <div className="glass-panel p-8 text-center text-muted-foreground rounded-xl">
              <span className="text-3xl block mb-2">📦</span>
              <p className="text-xs font-semibold">Your queue is currently empty.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTrips.map((trip: any) => {
                const isRequested = trip.status === 'requested';
                const isAccepted = trip.status === 'accepted';
                const isEnRoute = trip.status === 'en_route';
                const isInProgress = trip.status === 'in_progress';

                return (
                  <div key={trip.id} className="glass-card p-5 rounded-xl border border-border/40 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Booking ID</span>
                        <p className="text-xs font-mono font-bold text-white truncate max-w-xs">{trip.id}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded border border-brand/20 bg-brand/10 text-brand text-[9px] font-bold uppercase">
                        {trip.status}
                      </span>
                    </div>

                    <div className="bg-slate-900/40 p-3.5 rounded border border-border/40 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pickup:</span>
                        <span className="font-semibold text-white text-right max-w-xs">{trip.originAddress}</span>
                      </div>
                      <div className="flex justify-between border-t border-border/40 pt-2">
                        <span className="text-muted-foreground">Dropoff:</span>
                        <span className="font-semibold text-white text-right max-w-xs">{trip.destinationAddress}</span>
                      </div>
                      <div className="flex justify-between border-t border-border/40 pt-2">
                        <span className="text-muted-foreground">Cargo Weight:</span>
                        <span className="font-semibold text-white">{trip.priceBreakdown?.weightCharge ? `${trip.priceBreakdown.weightCharge / 0.05} kg` : 'N/A'}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                      {isRequested && (
                        <button
                          onClick={() => acceptMutation.mutate(trip.id)}
                          className="flex-1 rounded bg-brand py-2.5 text-xs font-bold text-brand-foreground shadow"
                        >
                          Accept Booking Request
                        </button>
                      )}

                      {isAccepted && (
                        <button
                          onClick={() => transitionMutation.mutate({ id: trip.id, status: TripStatus.en_route })}
                          className="flex-1 rounded bg-brand py-2.5 text-xs font-bold text-brand-foreground"
                        >
                          Start Heading to Pickup
                        </button>
                      )}

                      {isEnRoute && (
                        <button
                          onClick={() => transitionMutation.mutate({ id: trip.id, status: TripStatus.in_progress })}
                          className="flex-1 rounded bg-indigo-500 py-2.5 text-xs font-bold text-white"
                        >
                          Load Cargo & Start Transit
                        </button>
                      )}

                      {isInProgress && (
                        <button
                          onClick={() => transitionMutation.mutate({ id: trip.id, status: TripStatus.delivered })}
                          className="flex-1 rounded bg-emerald-500 py-2.5 text-xs font-bold text-white"
                        >
                          Confirm Cargo Delivered
                        </button>
                      )}

                      {!isRequested && (
                        <button
                          onClick={() => {
                            if (simulatingTripId === trip.id) {
                              handleStopSimulation();
                            } else {
                              handleStartSimulation(trip);
                            }
                          }}
                          className={`px-3 py-2.5 text-xs font-bold rounded border transition-colors ${
                            simulatingTripId === trip.id
                              ? 'border-rose-500 text-rose-400 hover:bg-rose-500/10'
                              : 'border-border text-muted-foreground hover:text-white'
                          }`}
                        >
                          {simulatingTripId === trip.id ? '⏹️ Stop GPS' : '📡 Simulate GPS'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* GPS Telemetry Simulation Panel */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Simulation Dashboard</h2>
          
          <div className="glass-panel p-5 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-white">📡 Live Telemetry Stream</h3>

            {simulatingTripId ? (
              <div className="space-y-4 text-xs">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded text-emerald-400 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>GPS Telemetry Active</span>
                </div>

                <div className="space-y-2.5 bg-slate-900/60 p-4 rounded border border-border/40">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Trip ID:</span>
                    <span className="font-mono text-white truncate max-w-[150px]">{simulatingTripId}</span>
                  </div>
                  <div className="flex justify-between border-t border-border/40 pt-2">
                    <span className="text-muted-foreground">Current Coordinate:</span>
                    <span className="font-mono text-white">
                      {simCoords?.lat}, {simCoords?.lng}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border/40 pt-2">
                    <span className="text-muted-foreground">Pings Dispatched:</span>
                    <span className="font-semibold text-white">{pingCount}</span>
                  </div>
                </div>

                <button
                  onClick={handleStopSimulation}
                  className="w-full rounded border border-rose-500/30 text-rose-400 py-2 font-semibold hover:bg-rose-500/10"
                >
                  Kill Simulation Feed
                </button>
              </div>
            ) : (
              <div className="text-center p-6 text-muted-foreground text-xs space-y-2">
                <p>No active GPS stream.</p>
                <p className="text-[10px] text-slate-500">
                  Accept an assigned trip, transition status to "En Route", and click the "Simulate GPS" button to start streaming coordinates.
                </p>
              </div>
            )}
          </div>

          {/* History */}
          {completedTrips.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Completed Trips History</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {completedTrips.map((trip: any) => (
                  <div key={trip.id} className="glass-card p-3 rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-white truncate max-w-[150px]">{trip.destinationAddress}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{new Date(trip.scheduledAt).toLocaleDateString()}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-[8px] font-bold text-slate-400 capitalize">
                      {trip.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
