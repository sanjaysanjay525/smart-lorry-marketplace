import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { bookingParams, estimate } = (location.state as any) || {};

  const [loading, setLoading] = useState(false);
  const [showMockModal, setShowMockModal] = useState(false);
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);
  const [razorpayOrderId, setRazorpayOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Create Trip Booking & Razorpay Order
  const createBookingMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/trips', payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      setCreatedTripId(data.trip.id);
      setRazorpayOrderId(data.paymentOrder.orderId);
      // Open the mock Razorpay payment checkout modal
      setShowMockModal(true);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to create booking order');
      setLoading(false);
    },
  });

  // 2. Verify payment mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/trips/payments/verify', payload);
      return res.data.data;
    },
    onSuccess: () => {
      setShowMockModal(false);
      // Redirect to tracking screen for this trip
      navigate(`/trips/${createdTripId}/track`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Payment verification failed');
    },
  });

  const handlePayClick = () => {
    if (!bookingParams) return;
    setError(null);
    setLoading(true);
    createBookingMutation.mutate(bookingParams);
  };

  const handleConfirmMockPayment = () => {
    if (!razorpayOrderId) return;
    verifyPaymentMutation.mutate({
      razorpayOrderId,
      razorpayPaymentId: `mock_payment_${Date.now()}`,
      razorpaySignature: 'mock_signature_dev',
    });
  };

  if (!bookingParams || !estimate) {
    return (
      <div className="glass-panel p-8 rounded-xl text-center space-y-4">
        <p className="text-sm text-muted-foreground">No active checkout session found.</p>
        <Link to="/" className="inline-block text-xs font-semibold text-brand hover:underline">
          Go back to Search
        </Link>
      </div>
    );
  }

  const { fare, vehicleType } = estimate;

  return (
    <div className="space-y-6 max-w-2xl mx-auto relative">
      <div>
        <h1 className="text-xl font-bold text-white">Secure Checkout</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Review your logistics fare breakdown and complete payment</p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/15 border border-destructive/20 p-3.5 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      <div className="glass-panel p-6 rounded-xl space-y-6">
        <div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Selected Lorry</span>
          <h2 className="text-lg font-bold text-white capitalize mt-0.5">{vehicleType.replace('_', ' ')}</h2>
        </div>

        {/* Route Details */}
        <div className="space-y-3 bg-slate-900/40 p-4 rounded-lg border border-border/40 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pickup Address:</span>
            <span className="font-semibold text-white text-right max-w-xs">{bookingParams.originAddress}</span>
          </div>
          <div className="flex justify-between border-t border-border/40 pt-2.5">
            <span className="text-muted-foreground">Dropoff Address:</span>
            <span className="font-semibold text-white text-right max-w-xs">{bookingParams.destinationAddress}</span>
          </div>
          <div className="flex justify-between border-t border-border/40 pt-2.5">
            <span className="text-muted-foreground">Cargo Weight:</span>
            <span className="font-semibold text-white">{bookingParams.weightKg} kg</span>
          </div>
        </div>

        {/* Pricing breakdown */}
        <div className="space-y-3 text-xs">
          <h3 className="font-bold text-white text-sm">Fare Breakdown</h3>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base Setup Fare</span>
            <span className="text-white">₹{fare.baseFare}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Distance Charge ({fare.distanceKm} km)</span>
            <span className="text-white">₹{fare.distanceCharge}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration Charge ({fare.durationHours} hrs)</span>
            <span className="text-white">₹{fare.durationCharge}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cargo Weight Factor ({bookingParams.weightKg} kg)</span>
            <span className="text-white">₹{fare.weightCharge}</span>
          </div>
          {fare.demandSurcharge > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>High Demand Surcharge</span>
              <span>₹{fare.demandSurcharge}</span>
            </div>
          )}

          <div className="flex justify-between border-t border-border pt-4 text-sm font-bold text-white">
            <span>Total Payable</span>
            <span>₹{fare.totalFare}</span>
          </div>
        </div>

        <button
          onClick={handlePayClick}
          disabled={loading}
          className="w-full rounded-lg bg-brand py-3.5 text-xs font-bold text-brand-foreground shadow-lg hover:opacity-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Processing Transaction...' : `Pay ₹${fare.totalFare} via Razorpay`}
        </button>
      </div>

      {/* Mock Razorpay Checkout Modal */}
      {showMockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-border w-full max-w-sm rounded-xl p-6 shadow-2xl relative space-y-6">
            <div className="text-center space-y-2">
              <div className="text-3xl">💳</div>
              <h3 className="text-base font-bold text-white">Razorpay Secure Checkout</h3>
              <p className="text-[10px] text-muted-foreground">DEMO ENVIRONMENT MOCK MODAL</p>
            </div>

            <div className="bg-slate-950 p-4 rounded border border-border/55 text-xs space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Order ID:</span>
                <span className="font-semibold text-white font-mono">{razorpayOrderId}</span>
              </div>
              <div className="flex justify-between text-muted-foreground border-t border-border/40 pt-2">
                <span>Amount:</span>
                <span className="font-semibold text-emerald-400">₹{fare.totalFare}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowMockModal(false);
                  setLoading(false);
                }}
                className="flex-1 rounded border border-border py-2 text-xs text-muted-foreground hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMockPayment}
                disabled={verifyPaymentMutation.isPending}
                className="flex-1 rounded bg-brand py-2 text-xs font-semibold text-brand-foreground"
              >
                {verifyPaymentMutation.isPending ? 'Verifying...' : 'Authorize Pay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
