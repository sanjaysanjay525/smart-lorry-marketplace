import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@slm/shared';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const DriverProfile: React.FC = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // If no id in route, default to current user id
  const driverUserId = id || currentUser?.id;

  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Monday
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // KYC upload states and mutations
  const [kycDocType, setKycDocType] = useState<'aadhaar' | 'license' | 'background_check'>('aadhaar');
  const [kycDocData, setKycDocData] = useState('');
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycSuccess, setKycSuccess] = useState<string | null>(null);

  const uploadKycMutation = useMutation({
    mutationFn: async (payload: { docType: string; documentData: string }) => {
      return api.post('/drivers/kyc/upload', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverProfile', driverUserId] });
      setKycSuccess('KYC document submitted for verification!');
      setKycDocData('');
      setTimeout(() => setKycSuccess(null), 3000);
    },
    onError: (err: any) => {
      setKycError(err.response?.data?.error?.message || 'Failed to submit KYC document');
      setTimeout(() => setKycError(null), 4000);
    },
  });

  const handleKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycDocData.trim()) return;
    setKycError(null);
    setKycSuccess(null);
    uploadKycMutation.mutate({ docType: kycDocType, documentData: kycDocData });
  };

  // Fetch driver profile (user data + license info)
  const { data: driver, isLoading: isDriverLoading } = useQuery({
    queryKey: ['driverProfile', driverUserId],
    queryFn: async () => {
      const res = await api.get(`/drivers/${driverUserId}`);
      return res.data.data;
    },
    enabled: !!driverUserId,
  });

  // Fetch driver availability calendar slots
  const { data: availability, isLoading: isAvailLoading } = useQuery({
    queryKey: ['driverAvailability', driverUserId],
    queryFn: async () => {
      const res = await api.get(`/drivers/${driverUserId}/availability`);
      return res.data.data;
    },
    enabled: !!driverUserId,
  });

  // Upsert availability mutation
  const upsertAvailMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.put(`/drivers/${driverUserId}/availability`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverAvailability', driverUserId] });
      setSuccess('Availability schedule updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to update availability');
      setTimeout(() => setError(null), 4000);
    },
  });

  // Delete availability mutation
  const deleteAvailMutation = useMutation({
    mutationFn: async (day: number) => {
      return api.delete(`/drivers/${driverUserId}/availability/${day}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverAvailability', driverUserId] });
    },
  });

  const handleUpsertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    upsertAvailMutation.mutate({ dayOfWeek, startTime, endTime });
  };

  const handleRemoveDay = (day: number) => {
    deleteAvailMutation.mutate(day);
  };

  const isDriverSelf = currentUser?.id === driver?.userId || currentUser?.role === UserRole.driver;
  const canEdit = isDriverSelf || currentUser?.role === UserRole.owner;

  if (isDriverLoading || isAvailLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
      </div>
    );
  }

  // Map availability list to quick lookup by dayOfWeek
  const availabilityMap = new Map<number, any>();
  availability?.forEach((item: any) => {
    availabilityMap.set(item.dayOfWeek, item);
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Profile Info card */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-3xl">
            👨‍✈️
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{driver?.user?.name || 'Driver Profile'}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{driver?.user?.email} • {driver?.user?.phone}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full border border-brand/20 bg-brand/10 text-brand text-[9px] font-bold uppercase">
                Rating ⭐ {driver?.ratingAvg.toFixed(1)}
              </span>
              <span className="px-2 py-0.5 rounded-full border border-border bg-slate-900 text-muted-foreground text-[9px] font-bold">
                {driver?.yearsExperience} years exp
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-slate-900/40 p-4 rounded-xl border border-border/40 md:text-right space-y-1">
          <div>License No: <span className="font-semibold text-white">{driver?.licenseNumber}</span></div>
          <div>License Expiry: <span className="font-semibold text-white">{driver?.licenseExpiry ? driver.licenseExpiry.split('T')[0] : 'N/A'}</span></div>
          <div>KYC Status: <span className="font-semibold text-white uppercase">{driver?.kycStatus}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Availability Calendar (Left Column) */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-white">Weekly Availability Calendar</h2>
          
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((dayName, idx) => {
              const slot = availabilityMap.get(idx);
              return (
                <div key={dayName} className="glass-card p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{dayName}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {slot ? `${slot.startTime} - ${slot.endTime}` : 'Not Available / Offline'}
                    </p>
                  </div>
                  {canEdit && slot && (
                    <button
                      onClick={() => handleRemoveDay(idx)}
                      className="text-xs font-semibold text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Schedule + KYC */}
        <div className="space-y-6">
          {/* Availability schedule form */}
          {canEdit && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white">Set Availability Schedule</h2>
              
              {success && (
                <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/20 p-3 text-xs text-emerald-400">
                  {success}
                </div>
              )}
              {error && (
                <div className="rounded-lg bg-destructive/15 border border-destructive/20 p-3 text-xs text-destructive-foreground">
                  {error}
                </div>
              )}

              <form onSubmit={handleUpsertSubmit} className="glass-panel p-5 rounded-xl space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Select Day
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-xs text-white focus:outline-none focus:border-brand"
                  >
                    {DAYS_OF_WEEK.map((name, index) => (
                      <option key={name} value={index}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={upsertAvailMutation.isPending}
                  className="w-full rounded-lg bg-brand py-2.5 text-xs font-semibold text-brand-foreground shadow-md shadow-brand/10 hover:opacity-95 transition-all"
                >
                  {upsertAvailMutation.isPending ? 'Updating...' : 'Set Active Hours'}
                </button>
              </form>
            </div>
          )}

          {/* KYC Status & Wizard Card */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white">KYC Verification</h2>

            <div className="glass-panel p-5 rounded-xl space-y-4">
              {/* Overall status banner */}
              <div className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between ${
                driver?.kycStatus === 'approved'
                  ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400'
                  : driver?.kycStatus === 'rejected'
                  ? 'bg-destructive/15 border-destructive/20 text-destructive-foreground'
                  : 'bg-amber-500/15 border-amber-500/20 text-amber-400'
              }`}>
                <span>Verification Status:</span>
                <span className="uppercase">{driver?.kycStatus || 'pending'}</span>
              </div>

              {/* Individual documents checklist */}
              <div className="space-y-3">
                {[
                  { type: 'aadhaar', label: 'Aadhaar Card' },
                  { type: 'license', label: 'Driving License' },
                  { type: 'background_check', label: 'Background Check' }
                ].map((docItem) => {
                  const existing = driver?.kycDocuments?.find((d: any) => d.docType === docItem.type);
                  const docStatus = existing ? existing.status : 'not_uploaded';
                  
                  return (
                    <div key={docItem.type} className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-border/40 text-xs">
                      <div>
                        <div className="font-semibold text-white">{docItem.label}</div>
                        {existing && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Uploaded {new Date(existing.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        docStatus === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : docStatus === 'rejected'
                          ? 'bg-destructive/10 text-destructive border border-destructive/20'
                          : docStatus === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-800 text-muted-foreground'
                      }`}>
                        {docStatus === 'not_uploaded' ? 'Not Uploaded' : docStatus}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Upload Form wizard for driver self */}
              {isDriverSelf && driver?.kycStatus !== 'approved' && (
                <form onSubmit={handleKycSubmit} className="pt-4 border-t border-border/40 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Upload KYC Document</h3>

                  {kycSuccess && (
                    <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/20 p-3 text-[11px] text-emerald-400">
                      {kycSuccess}
                    </div>
                  )}
                  {kycError && (
                    <div className="rounded-lg bg-destructive/15 border border-destructive/20 p-3 text-[11px] text-destructive-foreground">
                      {kycError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">
                      Document Type
                    </label>
                    <select
                      value={kycDocType}
                      onChange={(e) => setKycDocType(e.target.value as any)}
                      className="w-full rounded-lg bg-slate-900 border border-border p-2 text-xs text-white focus:outline-none focus:border-brand"
                    >
                      <option value="aadhaar">Aadhaar Card (India KYC)</option>
                      <option value="license">Driving License</option>
                      <option value="background_check">Background Check Report</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">
                      Document Data / ID Number / Base64 File
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={kycDocData}
                      onChange={(e) => setKycDocData(e.target.value)}
                      placeholder={
                        kycDocType === 'aadhaar'
                          ? 'Enter 12-digit Aadhaar number'
                          : kycDocType === 'license'
                          ? 'Enter Driving License number'
                          : 'Enter verification report hash or code'
                      }
                      className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-xs text-white placeholder-muted-foreground/60 focus:outline-none focus:border-brand resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={uploadKycMutation.isPending}
                    className="w-full rounded-lg bg-brand py-2 text-xs font-semibold text-brand-foreground shadow-md shadow-brand/10 hover:opacity-95 transition-all"
                  >
                    {uploadKycMutation.isPending ? 'Submitting...' : 'Upload & Verify'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
