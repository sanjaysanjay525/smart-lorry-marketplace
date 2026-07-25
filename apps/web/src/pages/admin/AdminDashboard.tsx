import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { AdminAnalyticsResponse } from '@slm/shared';

export const AdminDashboard: React.FC = () => {
  const { data: analytics, isLoading, isError } = useQuery<AdminAnalyticsResponse>({
    queryKey: ['adminAnalytics'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics');
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="glass-panel p-6 rounded-2xl text-center">
        <p className="text-sm text-destructive font-semibold">Error loading analytics. Please try again.</p>
      </div>
    );
  }

  // Find max value in monthly counts and GMV for SVG chart scaling
  const maxCount = Math.max(...analytics.tripsByMonth.map((m) => m.count), 5);
  const maxGmv = Math.max(...analytics.tripsByMonth.map((m) => m.gmv), 100);

  // SVG Chart sizing
  const chartHeight = 150;
  const barWidth = 30;
  const barSpacing = 15;
  const chartWidth = analytics.tripsByMonth.length * (barWidth + barSpacing) + 20;

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-xl font-bold text-white mb-2">Platform Administration Center</h2>
        <p className="text-sm text-muted-foreground">
          Real-time metrics and system overview of the Smart Lorry Marketplace.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Bookings</p>
            <h3 className="text-3xl font-extrabold text-white mt-2">{analytics.totalTrips}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">Platform life-to-date</p>
          </div>
          <div className="text-3xl">📦</div>
        </div>

        <div className="glass-card p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gross Merchandise Value</p>
            <h3 className="text-3xl font-extrabold text-emerald-400 mt-2">₹{analytics.totalGmv.toLocaleString()}</h3>
            <p className="text-[10px] text-emerald-400/80 mt-1">Captured transactions</p>
          </div>
          <div className="text-3xl">💰</div>
        </div>

        <div className="glass-card p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trip Fill Rate</p>
            <h3 className="text-3xl font-extrabold text-brand mt-2">{analytics.fillRatePercent}%</h3>
            <p className="text-[10px] text-brand/80 mt-1">Completed vs requested trips</p>
          </div>
          <div className="text-3xl">📈</div>
        </div>

        <div className="glass-card p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Return-Leg Adoption</p>
            <h3 className="text-3xl font-extrabold text-blue-400 mt-2">{analytics.returnLoadAdoptionPercent}%</h3>
            <p className="text-[10px] text-blue-400/80 mt-1">Shared fuel savings usage</p>
          </div>
          <div className="text-3xl">♻️</div>
        </div>
      </div>

      {/* SVG Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Count Chart */}
        <div className="glass-panel p-6 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Monthly Bookings Trend</h3>
          <div className="flex justify-center overflow-x-auto pt-4">
            <svg width={chartWidth} height={chartHeight + 40} className="overflow-visible">
              {analytics.tripsByMonth.map((monthData, idx) => {
                const barHeight = (monthData.count / maxCount) * chartHeight;
                const x = idx * (barWidth + barSpacing) + 10;
                const y = chartHeight - barHeight;

                return (
                  <g key={monthData.month} className="group">
                    {/* Tooltip background */}
                    <rect
                      x={x - 10}
                      y={y - 25}
                      width={barWidth + 20}
                      height={20}
                      rx={4}
                      className="fill-slate-950 stroke-border opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 12}
                      textAnchor="middle"
                      className="text-[10px] fill-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      {monthData.count}
                    </text>

                    {/* Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 2)}
                      rx={4}
                      className="fill-brand/80 hover:fill-brand transition-all cursor-pointer"
                    />

                    {/* Label */}
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight + 20}
                      textAnchor="middle"
                      className="text-[10px] fill-muted-foreground font-semibold"
                    >
                      {monthData.month.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
              {/* Bottom line */}
              <line
                x1={0}
                y1={chartHeight}
                x2={chartWidth}
                y2={chartHeight}
                className="stroke-border/40"
                strokeWidth={1}
              />
            </svg>
          </div>
        </div>

        {/* GMV Chart */}
        <div className="glass-panel p-6 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Gross Merchandise Value (GMV) Trend</h3>
          <div className="flex justify-center overflow-x-auto pt-4">
            <svg width={chartWidth} height={chartHeight + 40} className="overflow-visible">
              {analytics.tripsByMonth.map((monthData, idx) => {
                const barHeight = (monthData.gmv / maxGmv) * chartHeight;
                const x = idx * (barWidth + barSpacing) + 10;
                const y = chartHeight - barHeight;

                return (
                  <g key={monthData.month} className="group">
                    {/* Tooltip background */}
                    <rect
                      x={x - 15}
                      y={y - 25}
                      width={barWidth + 30}
                      height={20}
                      rx={4}
                      className="fill-slate-950 stroke-border opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 12}
                      textAnchor="middle"
                      className="text-[9px] fill-emerald-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      ₹{Math.round(monthData.gmv)}
                    </text>

                    {/* Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 2)}
                      rx={4}
                      className="fill-emerald-500/80 hover:fill-emerald-400 transition-all cursor-pointer"
                    />

                    {/* Label */}
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight + 20}
                      textAnchor="middle"
                      className="text-[10px] fill-muted-foreground font-semibold"
                    >
                      {monthData.month.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
              {/* Bottom line */}
              <line
                x1={0}
                y1={chartHeight}
                x2={chartWidth}
                y2={chartHeight}
                className="stroke-border/40"
                strokeWidth={1}
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
