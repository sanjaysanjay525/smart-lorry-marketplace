import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { VehicleType, VehicleStatus } from '@slm/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const VehicleForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [type, setType] = useState<VehicleType>(VehicleType.mini_truck);
  const [capacityKg, setCapacityKg] = useState<number>(1000);
  const [registration, setRegistration] = useState('');
  const [baseRatePerKm, setBaseRatePerKm] = useState<number>(15);
  const [baseRatePerHour, setBaseRatePerHour] = useState<number>(120);
  const [status, setStatus] = useState<VehicleStatus>(VehicleStatus.offline);
  const [error, setError] = useState<string | null>(null);

  // Query vehicle details if in edit mode
  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      const res = await api.get(`/vehicles/${id}`);
      return res.data.data;
    },
    enabled: isEditMode,
  });

  // Pre-fill form when edit data is fetched
  useEffect(() => {
    if (vehicle) {
      setType(vehicle.type);
      setCapacityKg(vehicle.capacityKg);
      setRegistration(vehicle.registration);
      setBaseRatePerKm(vehicle.baseRatePerKm);
      setBaseRatePerHour(vehicle.baseRatePerHour);
      setStatus(vehicle.status);
    }
  }, [vehicle]);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEditMode) {
        return api.patch(`/vehicles/${id}`, payload);
      } else {
        return api.post('/vehicles', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
      }
      navigate('/vehicles');
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.error?.details?.[0]?.message ||
        'Failed to save vehicle details'
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: any = {
      type,
      capacityKg,
      registration,
      baseRatePerKm,
      baseRatePerHour,
    };

    if (isEditMode) {
      payload.status = status;
    }

    mutation.mutate(payload);
  };

  if (isEditMode && isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">{isEditMode ? 'Edit Vehicle' : 'Register Vehicle'}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isEditMode ? 'Modify registration or billing values for this truck' : 'Add a new lorry to your logistics fleet'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/15 border border-destructive/20 p-3.5 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Vehicle Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as VehicleType)}
              className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-sm text-white focus:outline-none focus:border-brand"
            >
              {Object.values(VehicleType).map((val) => (
                <option key={val} value={val}>
                  {val.toUpperCase().replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Registration Number
            </label>
            <input
              type="text"
              required
              placeholder="e.g. MH-12-PQ-1234"
              value={registration}
              onChange={(e) => setRegistration(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Capacity (KG)
            </label>
            <input
              type="number"
              required
              min={1}
              value={capacityKg}
              onChange={(e) => setCapacityKg(Number(e.target.value))}
              className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-sm text-white focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Rate / KM (₹)
            </label>
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={baseRatePerKm}
              onChange={(e) => setBaseRatePerKm(Number(e.target.value))}
              className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-sm text-white focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Rate / Hour (₹)
            </label>
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={baseRatePerHour}
              onChange={(e) => setBaseRatePerHour(Number(e.target.value))}
              className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-sm text-white focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        {isEditMode && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Operation Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as VehicleStatus)}
              className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-sm text-white focus:outline-none focus:border-brand"
            >
              {Object.values(VehicleStatus).map((val) => (
                <option key={val} value={val}>
                  {val.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
          <Link
            to="/vehicles"
            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground shadow-md shadow-brand/10 hover:opacity-95 transition-all disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Save Vehicle'}
          </button>
        </div>
      </form>
    </div>
  );
};
