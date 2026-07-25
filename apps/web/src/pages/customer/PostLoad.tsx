import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

export const PostLoad: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    weightKg: '',
    preferredDate: '',
    originAddress: '',
    destinationAddress: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Mock coordinates for demonstration
      const mockOriginCoords = { latitude: 18.5204, longitude: 73.8567 }; // Pune
      const mockDestCoords = { latitude: 19.0760, longitude: 72.8777 }; // Mumbai

      const res = await api.post('/loads', {
        weightKg: Number(formData.weightKg),
        preferredDate: new Date(formData.preferredDate).toISOString(),
        originAddress: formData.originAddress,
        destinationAddress: formData.destinationAddress,
        originCoords: mockOriginCoords,
        destinationCoords: mockDestCoords,
      });
      navigate(`/negotiate/${res.data.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to post load');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Post a Cargo Load</h1>
        <p className="text-gray-600 mt-2">Find a lorry for your return trip and save on shipping costs.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Origin Address</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
              value={formData.originAddress}
              onChange={e => setFormData({ ...formData, originAddress: e.target.value })}
              placeholder="e.g. Pune, Maharashtra"
            />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Destination Address</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
              value={formData.destinationAddress}
              onChange={e => setFormData({ ...formData, destinationAddress: e.target.value })}
              placeholder="e.g. Mumbai, Maharashtra"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cargo Weight (kg)</label>
            <input
              type="number"
              required
              min="1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
              value={formData.weightKg}
              onChange={e => setFormData({ ...formData, weightKg: e.target.value })}
              placeholder="1000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Preferred Pickup Date & Time</label>
            <input
              type="datetime-local"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
              value={formData.preferredDate}
              onChange={e => setFormData({ ...formData, preferredDate: e.target.value })}
            />
          </div>
        </div>
        
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Posting Load...' : 'Post Cargo Load'}
          </button>
        </div>
      </form>
    </div>
  );
};
