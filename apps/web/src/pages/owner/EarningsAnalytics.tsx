import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface EarningsData {
  totalReturnTrips: number;
  totalReturnEarnings: number;
  totalFuelSavings: number;
  efficiencyGainPercent: number;
  monthlyEarningsTrend: { month: string; amount: number }[];
}

export const EarningsAnalytics: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['earningsAnalytics'],
    queryFn: async () => {
      const res = await api.get('/loads/owners/earnings/return-loads');
      return res.data.data as EarningsData;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 text-red-500 p-4 rounded-md m-4">
        Failed to load earnings analytics.
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxTrendAmount = Math.max(...data.monthlyEarningsTrend.map(t => t.amount), 1);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Return Trip Analytics</h1>
          <p className="text-gray-600 mt-2">Track your fleet's efficiency and extra earnings from return loads.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <div className="text-sm font-medium text-gray-500 mb-1">Total Return Earnings</div>
          <div className="text-3xl font-bold text-green-600">{formatCurrency(data.totalReturnEarnings)}</div>
          <div className="text-xs text-gray-400 mt-2">Extra revenue generated</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <div className="text-sm font-medium text-gray-500 mb-1">Fuel Savings Estimate</div>
          <div className="text-3xl font-bold text-blue-600">{formatCurrency(data.totalFuelSavings)}</div>
          <div className="text-xs text-gray-400 mt-2">Value of empty miles avoided</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <div className="text-sm font-medium text-gray-500 mb-1">Return Trips Completed</div>
          <div className="text-3xl font-bold text-gray-800">{data.totalReturnTrips}</div>
          <div className="text-xs text-gray-400 mt-2">Total successful matches</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <div className="text-sm font-medium text-gray-500 mb-1">Efficiency Gain</div>
          <div className="text-3xl font-bold text-purple-600">+{data.efficiencyGainPercent}%</div>
          <div className="text-xs text-gray-400 mt-2">Of total trips were return legs</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Monthly Return Earnings Trend</h2>
        <div className="flex items-end h-64 gap-4">
          {data.monthlyEarningsTrend.map((trend, idx) => {
            const heightPercent = Math.max((trend.amount / maxTrendAmount) * 100, 2);
            return (
              <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative">
                <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap transition-opacity">
                  {formatCurrency(trend.amount)}
                </div>
                <div 
                  className="w-full bg-blue-500 rounded-t-md transition-all duration-500 hover:bg-blue-600"
                  style={{ height: `${heightPercent}%` }}
                ></div>
                <div className="text-xs text-gray-500 mt-2 whitespace-nowrap">{trend.month}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
