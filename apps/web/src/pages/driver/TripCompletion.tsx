import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const TripCompletion: React.FC = () => {
  const { id: tripId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const { data: matches, isLoading, error } = useQuery({
    queryKey: ['returnLoads', tripId],
    queryFn: async () => {
      const res = await api.get(`/loads/trips/${tripId}/return-loads?radiusKm=50`);
      return res.data.data;
    },
    enabled: !!tripId,
  });

  const acceptMutation = useMutation({
    mutationFn: async (loadId: string) => {
      const res = await api.post(`/loads/trips/${tripId}/return-loads/${loadId}/accept`);
      return res.data.data;
    },
    onSuccess: () => {
      navigate('/driver/queue');
    },
    onError: (err: any) => {
      setAcceptError(err.response?.data?.error?.message || 'Failed to accept return load');
    },
  });

  const handleFinishWithoutLoad = () => {
    navigate('/driver/queue');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-500 p-4 rounded-md m-4">
        Failed to fetch return loads.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Trip Completed!</h1>
        <p className="text-gray-600 mt-2 text-lg">Great job. Don't drive back empty — we've found return loads matching your vector.</p>
      </div>

      {acceptError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-md">
          <p className="text-sm text-red-700">{acceptError}</p>
        </div>
      )}

      {matches && matches.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800">Available Return Loads</h2>
          {matches.map((match: any) => (
            <div key={match.loadPosting.id} className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex flex-col md:flex-row gap-6 items-center transition-transform hover:-translate-y-1">
              <div className="flex-1 w-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded mb-2">
                      {match.matchScore >= 80 ? 'Excellent Match' : 'Good Match'} ({match.matchScore}%)
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 truncate">
                      {match.loadPosting.originAddress} <span className="text-gray-400 mx-2">→</span> {match.loadPosting.destinationAddress}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">₹{match.extraEarnings}</div>
                    <div className="text-xs text-gray-500">Extra Earnings</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                  <div>
                    <span className="block text-gray-400 text-xs">Cargo Weight</span>
                    <span className="font-medium text-gray-800">{match.loadPosting.weightKg} kg</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 text-xs">Pickup Date</span>
                    <span className="font-medium text-gray-800">{new Date(match.loadPosting.preferredDate).toLocaleDateString()}</span>
                  </div>
                  <div className="col-span-2 bg-green-50 rounded p-2 border border-green-100">
                    <span className="block text-green-800 text-xs font-medium">Estimated Fuel Savings</span>
                    <span className="font-bold text-green-700">₹{match.fuelSavingsEstimate}</span>
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-auto flex flex-col gap-3 shrink-0">
                <button
                  onClick={() => acceptMutation.mutate(match.loadPosting.id)}
                  disabled={acceptMutation.isPending}
                  className="w-full md:w-32 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {acceptMutation.isPending ? 'Accepting...' : 'Accept Load'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Return Loads Found</h3>
          <p className="text-gray-500">There are currently no open loads matching your return vector within 50km.</p>
        </div>
      )}

      <div className="mt-10 text-center">
        <button
          onClick={handleFinishWithoutLoad}
          className="text-gray-500 hover:text-gray-800 font-medium transition-colors"
        >
          Finish trip without return load →
        </button>
      </div>
    </div>
  );
};
