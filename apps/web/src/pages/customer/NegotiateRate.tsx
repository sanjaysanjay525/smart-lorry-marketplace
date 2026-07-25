import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

export const NegotiateRate: React.FC = () => {
  const { loadId } = useParams<{ loadId: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: negotiation, isLoading, refetch } = useQuery({
    queryKey: ['negotiation', loadId],
    queryFn: async () => {
      try {
        const res = await api.get(`/negotiations/${loadId}/negotiation`);
        return res.data.data;
      } catch (err: any) {
        if (err.response?.status === 404) return null;
        throw err;
      }
    },
  });

  const negotiateMutation = useMutation({
    mutationFn: async (userOffer: number) => {
      const res = await api.post(`/negotiations/${loadId}/negotiate`, {
        userOffer,
        baseRate: 5000, // Mock base rate
        distanceKm: 300, // Mock distance
      });
      return res.data.data;
    },
    onSuccess: () => {
      setOffer('');
      refetch();
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [negotiation?.chatHistory]);

  if (isLoading) return <div className="p-8 text-center">Loading negotiation...</div>;

  const chatHistory = (negotiation?.chatHistory || []) as Message[];
  const isAccepted = negotiation?.status === 'accepted';

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Negotiate Freight Rate</h1>
          <p className="text-gray-500 text-sm mt-1">Our AI agent will review your offer instantly.</p>
        </div>
        {isAccepted && (
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold">
            Accepted at ₹{negotiation.finalPrice}
          </div>
        )}
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {chatHistory.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">
              No offers made yet. Start by entering your proposed price below.
            </div>
          ) : (
            chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-5 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          {isAccepted ? (
            <button
              onClick={() => navigate('/')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition-colors"
            >
              Proceed to Booking Dashboard
            </button>
          ) : (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (offer) negotiateMutation.mutate(Number(offer));
              }}
              className="flex gap-3"
            >
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  min="1"
                  required
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  placeholder="Enter your offer..."
                  disabled={negotiateMutation.isPending}
                  className="w-full pl-8 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <button
                type="submit"
                disabled={!offer || negotiateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 font-medium rounded-lg transition-colors flex items-center justify-center min-w-[120px]"
              >
                {negotiateMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Send Offer'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
