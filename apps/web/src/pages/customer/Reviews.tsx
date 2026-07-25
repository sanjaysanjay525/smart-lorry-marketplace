import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const Reviews: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [driverRating, setDriverRating] = useState<number>(0);
  const [driverComment, setDriverComment] = useState('');
  
  const [vehicleRating, setVehicleRating] = useState<number>(0);
  const [vehicleComment, setVehicleComment] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Query completed trip details
  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: async () => {
      const res = await api.get(`/trips/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (payload: { targetType: 'driver' | 'vehicle'; rating: number; comment?: string }) => {
      return api.post(`/trips/${id}/reviews`, payload);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (driverRating === 0 || vehicleRating === 0) {
      setError('Please provide a rating for both the driver and the vehicle');
      return;
    }

    setLoading(true);
    try {
      // Run both review submissions
      await Promise.all([
        submitReviewMutation.mutateAsync({
          targetType: 'driver',
          rating: driverRating,
          comment: driverComment,
        }),
        submitReviewMutation.mutateAsync({
          targetType: 'vehicle',
          rating: vehicleRating,
          comment: vehicleComment,
        }),
      ]);

      // Redirect home upon success
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error?.message || 'Failed to submit reviews');
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="rounded-lg bg-destructive/15 border border-destructive/20 p-4 text-destructive-foreground text-center">
        Failed to fetch trip.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">Trip Feedback</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Submit reviews for driver and vehicle</p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/15 border border-destructive/20 p-3.5 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Driver Review Card */}
        <div className="glass-panel p-5 rounded-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Rate Driver ({trip.driver?.user?.name})</h3>
            <p className="text-[10px] text-muted-foreground">How was the driver's service, communication, and professionalism?</p>
          </div>

          {/* Star selector */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => setDriverRating(star)}
                className="text-2xl transition-transform hover:scale-110 focus:outline-none"
              >
                {star <= driverRating ? '⭐' : '☆'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Comment
            </label>
            <textarea
              rows={2}
              placeholder="Write a comment about your experience..."
              value={driverComment}
              onChange={(e) => setDriverComment(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-xs text-white focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* Vehicle Review Card */}
        <div className="glass-panel p-5 rounded-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Rate Vehicle ({trip.vehicle?.registration})</h3>
            <p className="text-[10px] text-muted-foreground">How was the truck's condition, cleanliness, and capacity?</p>
          </div>

          {/* Star selector */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => setVehicleRating(star)}
                className="text-2xl transition-transform hover:scale-110 focus:outline-none"
              >
                {star <= vehicleRating ? '⭐' : '☆'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Comment
            </label>
            <textarea
              rows={2}
              placeholder="Write a comment about the vehicle..."
              value={vehicleComment}
              onChange={(e) => setVehicleComment(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-border p-2.5 text-xs text-white focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand py-3 text-xs font-bold text-brand-foreground shadow-lg hover:opacity-95 transition-all"
        >
          {loading ? 'Submitting Reviews...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};
