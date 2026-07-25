import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { VehicleType, PricingMode, type LocationGeo } from '@slm/shared';
import { api } from '../../lib/api';
import { MapView } from '../../components/MapView';

export const SearchLorry: React.FC = () => {
  const navigate = useNavigate();

  const [pickupAddr, setPickupAddr] = useState('Mumbai Port, MH');
  const [pickupLat, setPickupLat] = useState<number>(19.0760);
  const [pickupLng, setPickupLng] = useState<number>(72.8777);

  const [dropoffAddr, setDropoffAddr] = useState('Pune Industrial Area, MH');
  const [dropoffLat, setDropoffLat] = useState<number>(18.5204);
  const [dropoffLng, setDropoffLng] = useState<number>(73.8567);

  const [weightKg, setWeightKg] = useState<number>(2000);
  const [selectedType, setSelectedType] = useState<VehicleType | null>(null);
  
  const [origin, setOrigin] = useState<LocationGeo | null>(null);
  const [destination, setDestination] = useState<LocationGeo | null>(null);

  // Get pricing estimate
  const estimateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/trips/estimate', payload);
      return res.data.data;
    },
    onSuccess: () => {
      setOrigin({ latitude: pickupLat, longitude: pickupLng });
      setDestination({ latitude: dropoffLat, longitude: dropoffLng });
    },
  });

  // Query nearby available vehicles in 50km radius for pickup
  const { data: nearbyVehicles } = useQuery({
    queryKey: ['nearbyVehicles', origin],
    queryFn: async () => {
      const res = await api.get(`/trips/search?lat=${pickupLat}&lng=${pickupLng}&radiusKm=50`);
      return res.data.data;
    },
    enabled: !!origin,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    estimateMutation.mutate({
      originAddress: pickupAddr,
      originCoords: { latitude: pickupLat, longitude: pickupLng },
      destinationAddress: dropoffAddr,
      destinationCoords: { latitude: dropoffLat, longitude: dropoffLng },
      weightKg,
    });
  };

  const handleSelectLorryType = (type: VehicleType) => {
    setSelectedType(type);
  };

  // Find concrete vehicle in radius that matches selected type
  const matchingVehicle = nearbyVehicles?.find((v: any) => v.type === selectedType);

  const handleProceedBooking = () => {
    if (!selectedType || !matchingVehicle) return;

    const selectedEstimate = estimateMutation.data?.find((est: any) => est.vehicleType === selectedType);
    if (!selectedEstimate) return;

    // Navigate to checkout with trip booking parameters
    navigate('/checkout', {
      state: {
        bookingParams: {
          originAddress: pickupAddr,
          originCoords: { latitude: pickupLat, longitude: pickupLng },
          destinationAddress: dropoffAddr,
          destinationCoords: { latitude: dropoffLat, longitude: dropoffLng },
          scheduledAt: new Date().toISOString(),
          vehicleId: matchingVehicle.id,
          weightKg,
          pricingMode: PricingMode.trip,
        },
        estimate: selectedEstimate,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Hire a Lorry</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Search available cargo trucks, see instant rate quotes, and secure drivers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Form Panel */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSearch} className="glass-panel p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white">Trip Routing Parameters</h3>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Pickup Location Address
              </label>
              <input
                type="text"
                required
                value={pickupAddr}
                onChange={(e) => setPickupAddr(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-border p-2 text-xs text-white"
              />
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="Latitude"
                  value={pickupLat}
                  onChange={(e) => setPickupLat(Number(e.target.value))}
                  className="rounded bg-slate-900 border border-border p-1 text-[10px] text-white"
                />
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="Longitude"
                  value={pickupLng}
                  onChange={(e) => setPickupLng(Number(e.target.value))}
                  className="rounded bg-slate-900 border border-border p-1 text-[10px] text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Dropoff Location Address
              </label>
              <input
                type="text"
                required
                value={dropoffAddr}
                onChange={(e) => setDropoffAddr(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-border p-2 text-xs text-white"
              />
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="Latitude"
                  value={dropoffLat}
                  onChange={(e) => setDropoffLat(Number(e.target.value))}
                  className="rounded bg-slate-900 border border-border p-1 text-[10px] text-white"
                />
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="Longitude"
                  value={dropoffLng}
                  onChange={(e) => setDropoffLng(Number(e.target.value))}
                  className="rounded bg-slate-900 border border-border p-1 text-[10px] text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Cargo Load Weight (KG)
              </label>
              <input
                type="number"
                required
                min={10}
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-900 border border-border p-2 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={estimateMutation.isPending}
              className="w-full rounded-lg bg-brand py-2 text-xs font-semibold text-brand-foreground shadow-md transition-all hover:opacity-95"
            >
              {estimateMutation.isPending ? 'Calculating Estimates...' : 'Get Rates & Estimates'}
            </button>
          </form>

          {/* Lorry options list */}
          {estimateMutation.data && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white">Select Vehicle Category</h3>
              
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {estimateMutation.data.map((est: any) => {
                  const hasTruck = nearbyVehicles?.some((v: any) => v.type === est.vehicleType);
                  const active = selectedType === est.vehicleType;
                  
                  return (
                    <div
                      key={est.vehicleType}
                      onClick={() => handleSelectLorryType(est.vehicleType)}
                      className={`glass-card p-4 rounded-xl cursor-pointer border transition-all ${
                        active 
                          ? 'border-brand bg-brand/10' 
                          : 'border-border/40 hover:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            {est.vehicleType.replace('_', ' ')}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {est.metrics.distanceKm} km • {est.metrics.durationHours} hours
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-white">₹{est.fare.totalFare}</span>
                          <span className="block text-[8px] mt-0.5 text-muted-foreground">
                            {hasTruck ? '🟢 Available Near' : '❌ Out of Stock'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedType && (
                <button
                  onClick={handleProceedBooking}
                  disabled={!matchingVehicle}
                  className="w-full rounded-lg bg-emerald-500 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-600 disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  Proceed to Checkout (₹
                  {estimateMutation.data.find((e: any) => e.vehicleType === selectedType)?.fare.totalFare}
                  )
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Map Panel */}
        <div className="lg:col-span-3">
          <MapView
            origin={origin}
            destination={destination}
            className="h-[520px] w-full rounded-xl border border-border/80"
          />
        </div>
      </div>
    </div>
  );
};
