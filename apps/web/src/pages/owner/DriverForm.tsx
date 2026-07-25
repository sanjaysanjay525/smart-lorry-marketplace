import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const DriverForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [yearsExperience, setYearsExperience] = useState<number>(2);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch driver info if edit mode
  const { data: driver, isLoading: isDriverLoading } = useQuery({
    queryKey: ['driver', id],
    queryFn: async () => {
      const res = await api.get(`/drivers/${id}`);
      return res.data.data;
    },
    enabled: isEditMode,
  });

  // Fetch owner's vehicles to allow linking
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data.data;
    },
  });

  // Pre-fill fields on edit mode load
  useEffect(() => {
    if (driver) {
      setName(driver.user?.name || '');
      setEmail(driver.user?.email || '');
      setPhone(driver.user?.phone || '');
      setLicenseNumber(driver.licenseNumber);
      setYearsExperience(driver.yearsExperience);
      setVehicleId(driver.vehicleId);

      if (driver.licenseExpiry) {
        // Format ISO date to yyyy-MM-dd for HTML input
        setLicenseExpiry(driver.licenseExpiry.split('T')[0]);
      }
    }
  }, [driver]);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEditMode) {
        return api.patch(`/drivers/${id}`, payload);
      } else {
        return api.post('/drivers', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: ['driver', id] });
      }
      navigate('/drivers');
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.error?.details?.[0]?.message ||
        'Failed to save driver'
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Convert date string to ISO DateTime string
    const expiryIso = new Date(licenseExpiry).toISOString();

    const payload: any = {
      licenseNumber,
      licenseExpiry: expiryIso,
      yearsExperience,
    };

    if (isEditMode) {
      payload.name = name;
      payload.vehicleId = vehicleId || null;
    } else {
      payload.name = name;
      payload.email = email;
      payload.phone = phone;
    }

    mutation.mutate(payload);
  };

  if (isEditMode && isDriverLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">{isEditMode ? 'Manage Driver' : 'Link New Driver'}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isEditMode ? 'Modify driver properties and assign a truck' : 'Add driver parameters and create login credentials'}
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
              Driver Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Contact Phone
            </label>
            <input
              type="tel"
              required
              disabled={isEditMode}
              placeholder="e.g. +919876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand disabled:opacity-40"
            />
          </div>
        </div>

        {!isEditMode && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Email Address (Login Username)
            </label>
            <input
              type="email"
              required
              placeholder="driver@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              License Number
            </label>
            <input
              type="text"
              required
              placeholder="e.g. DL-12345678"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              License Expiry Date
            </label>
            <input
              type="date"
              required
              value={licenseExpiry}
              onChange={(e) => setLicenseExpiry(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-sm text-white focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Years Experience
            </label>
            <input
              type="number"
              required
              min={0}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(Number(e.target.value))}
              className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-sm text-white focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        {isEditMode && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Link Operational Vehicle
            </label>
            <select
              value={vehicleId || ''}
              onChange={(e) => setVehicleId(e.target.value || null)}
              className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-sm text-white focus:outline-none focus:border-brand"
            >
              <option value="">Unassigned / No Active Vehicle</option>
              {vehicles?.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.registration} ({v.type.toUpperCase().replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>
        )}

        {!isEditMode && (
          <div className="rounded-lg bg-slate-900/60 border border-border/80 p-3.5 text-xs text-muted-foreground">
            💡 <strong>Note:</strong> Creating a new driver will automatically provision a user account with a temporary password (<code>Driver@123</code>). They can log in to update availability.
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
          <Link
            to="/drivers"
            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground shadow-md shadow-brand/10 hover:opacity-95 transition-all disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Save Driver'}
          </button>
        </div>
      </form>
    </div>
  );
};
