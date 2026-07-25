import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { DisputeResponse } from '@slm/shared';

export const Disputes: React.FC = () => {
  const queryClient = useQueryClient();
  const [resolutions, setResolutions] = useState<{ [disputeId: string]: string }>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch all disputes
  const { data: disputes, isLoading, isError } = useQuery<DisputeResponse[]>({
    queryKey: ['disputes'],
    queryFn: async () => {
      const res = await api.get('/admin/disputes');
      return res.data.data;
    },
  });

  // Resolve dispute mutation
  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ disputeId, resolution }: { disputeId: string; resolution: string }) => {
      return api.patch(`/admin/disputes/${disputeId}/resolve`, { resolution });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      setSuccessMsg('Dispute resolved successfully!');
      setResolutions({});
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to resolve dispute');
      setTimeout(() => setErrorMsg(null), 4000);
    },
  });

  const handleResolveSubmit = (e: React.FormEvent, disputeId: string) => {
    e.preventDefault();
    const resolution = resolutions[disputeId];
    if (!resolution || resolution.trim().length < 5) {
      setErrorMsg('Resolution details must be at least 5 characters long.');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    resolveDisputeMutation.mutate({ disputeId, resolution });
  };

  const handleResolutionChange = (disputeId: string, value: string) => {
    setResolutions((prev) => ({ ...prev, [disputeId]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-panel p-6 rounded-2xl text-center">
        <p className="text-sm text-destructive font-semibold">Error loading disputes list. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-xl font-bold text-white mb-2">Disputes Resolution Center</h2>
        <p className="text-sm text-muted-foreground">
          Investigate issues raised by customers, drivers, or fleet owners. Provide details and mark disputes as resolved.
        </p>
      </div>

      {successMsg && (
        <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/20 p-4 text-sm text-emerald-400">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-lg bg-destructive/15 border border-destructive/20 p-4 text-sm text-destructive-foreground">
          {errorMsg}
        </div>
      )}

      {disputes && disputes.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center text-muted-foreground">
          <p className="text-sm">🎉 No disputes found on the platform!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {disputes?.map((dispute) => (
            <div key={dispute.id} className="glass-card p-6 rounded-xl border border-border/60 flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    dispute.status === 'resolved'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {dispute.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Dispute ID: {dispute.id}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Raised: {new Date(dispute.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-y border-border/40 py-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Trip Info:
                  </span>
                  <p className="text-xs text-white">
                    Trip ID: <span className="font-semibold">{dispute.tripId}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Type: <span className="text-white capitalize">{dispute.trip?.type || 'N/A'}</span> | 
                    Fare: <span className="text-white">₹{dispute.trip?.priceTotal || 0}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Raised By:
                  </span>
                  <p className="text-xs text-white">
                    Name: <span className="font-semibold">{dispute.raiser?.name || 'Unknown'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Email: <span className="text-white">{dispute.raiser?.email || 'N/A'}</span>
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Reason for Dispute:
                </span>
                <p className="text-xs text-white bg-slate-900/60 p-3 rounded-lg border border-border/20 whitespace-pre-wrap">
                  {dispute.reason}
                </p>
              </div>

              {dispute.status === 'resolved' ? (
                <div className="bg-emerald-500/5 p-4 rounded-lg border border-emerald-500/20 space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                    Resolution:
                  </span>
                  <p className="text-xs text-white whitespace-pre-wrap">
                    {dispute.resolution}
                  </p>
                </div>
              ) : (
                <form onSubmit={(e) => handleResolveSubmit(e, dispute.id)} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Provide Resolution Details:
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={resolutions[dispute.id] || ''}
                      onChange={(e) => handleResolutionChange(dispute.id, e.target.value)}
                      placeholder="Enter details on how this dispute was investigated and resolved..."
                      className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-xs text-white placeholder-muted-foreground/60 focus:outline-none focus:border-brand resize-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={resolveDisputeMutation.isPending}
                      className="rounded-lg bg-brand hover:opacity-95 py-2 px-4 text-xs font-semibold text-brand-foreground shadow-md transition-all"
                    >
                      {resolveDisputeMutation.isPending ? 'Resolving...' : 'Resolve Dispute'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
