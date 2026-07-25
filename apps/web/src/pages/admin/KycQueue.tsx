import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { KycDocumentResponse } from '@slm/shared';

export const KycQueue: React.FC = () => {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch pending documents
  const { data: pendingDocs, isLoading, isError } = useQuery<KycDocumentResponse[]>({
    queryKey: ['pendingKycDocs'],
    queryFn: async () => {
      const res = await api.get('/admin/kyc/pending');
      return res.data.data;
    },
  });

  // Review document mutation
  const reviewDocMutation = useMutation({
    mutationFn: async ({ docId, status }: { docId: string; status: 'approved' | 'rejected' }) => {
      return api.patch(`/admin/kyc/${docId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingKycDocs'] });
      setSuccessMsg('Document status updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update document status');
      setTimeout(() => setErrorMsg(null), 4000);
    },
  });

  // Update overall driver KYC status mutation
  const updateDriverKycMutation = useMutation({
    mutationFn: async ({ driverId, kycStatus }: { driverId: string; kycStatus: 'approved' | 'rejected' | 'pending' }) => {
      return api.patch(`/admin/drivers/${driverId}/kyc-status`, { kycStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingKycDocs'] });
      setSuccessMsg('Driver overall KYC status updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update driver KYC status');
      setTimeout(() => setErrorMsg(null), 4000);
    },
  });

  const handleReviewDoc = (docId: string, status: 'approved' | 'rejected') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    reviewDocMutation.mutate({ docId, status });
  };

  const handleUpdateDriverStatus = (driverId: string, kycStatus: 'approved' | 'rejected' | 'pending') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    updateDriverKycMutation.mutate({ driverId, kycStatus });
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
        <p className="text-sm text-destructive font-semibold">Error loading KYC review queue. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-xl font-bold text-white mb-2">KYC Verification Queue</h2>
        <p className="text-sm text-muted-foreground">
          Review documents submitted by drivers and approve or reject their credentials to allow platform access.
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

      {pendingDocs && pendingDocs.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center text-muted-foreground">
          <p className="text-sm">🎉 No pending documents in the review queue!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingDocs?.map((doc: any) => (
            <div key={doc.id} className="glass-card p-6 rounded-xl border border-border/60 hover:border-brand/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full border border-brand/20 bg-brand/10 text-brand text-[10px] font-bold uppercase">
                    {doc.docType.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Submitted: {new Date(doc.createdAt).toLocaleString()}
                  </span>
                </div>
                
                <div>
                  <h3 className="text-sm font-bold text-white">{doc.driver?.user?.name || 'Unknown Driver'}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Email: {doc.driver?.user?.email || 'N/A'} | License: {doc.driver?.licenseNumber || 'N/A'}
                  </p>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-lg border border-border/40">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Decrypted Content Preview:
                  </span>
                  <code className="text-xs text-brand font-mono break-all block whitespace-pre-wrap">
                    {doc.decryptedData || '[Unable to display contents]'}
                  </code>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex items-center gap-2 justify-end">
                  <button
                    disabled={reviewDocMutation.isPending}
                    onClick={() => handleReviewDoc(doc.id, 'approved')}
                    className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2 px-3 text-xs font-semibold text-white shadow-md transition-all text-center"
                  >
                    Approve Doc
                  </button>
                  <button
                    disabled={reviewDocMutation.isPending}
                    onClick={() => handleReviewDoc(doc.id, 'rejected')}
                    className="flex-1 rounded-lg bg-destructive hover:bg-red-500 py-2 px-3 text-xs font-semibold text-white shadow-md transition-all text-center"
                  >
                    Reject Doc
                  </button>
                </div>

                <div className="border-t border-border/40 pt-2 mt-1 space-y-1">
                  <span className="block text-[9px] text-muted-foreground text-right uppercase tracking-wider">
                    Quick Overall Driver KYC Status:
                  </span>
                  <div className="flex gap-1.5 justify-end">
                    <button
                      onClick={() => handleUpdateDriverStatus(doc.driverId, 'approved')}
                      className="text-[10px] font-semibold text-emerald-400 hover:underline"
                    >
                      Approve Driver
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                      onClick={() => handleUpdateDriverStatus(doc.driverId, 'rejected')}
                      className="text-[10px] font-semibold text-destructive hover:underline"
                    >
                      Reject Driver
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
