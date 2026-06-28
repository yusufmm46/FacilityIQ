import React, { useState } from 'react';
import { BarChart2, TrendingUp, Clock, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const BAR_COLORS = ['#0d9488', '#1d4ed8', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsView() {
  const { analyticsData, selectedArea, zones, occupancyData } = useApp();

  const hourlyTrend = analyticsData?.hourly_trend || [];
  const zonePopularity = analyticsData?.zone_popularity || [];
  const peakHour = analyticsData?.peak_hour;
  const totalUploads = analyticsData?.total_uploads || 0;
  const totalDevices = occupancyData?.total_devices || 0;

  const trendData = hourlyTrend.map(h => ({
    time: h.timestamp ? new Date(h.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : h.timestamp,
    devices: h.total_devices,
  }));

  const popularityData = zonePopularity.map(z => ({
    name: z.zone_name,
    pct: z.avg_occupancy_pct,
  }));

  const hasData = hourlyTrend.length > 0 || zonePopularity.length > 0;

  if (!selectedArea) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center text-slate-400">
          <BarChart2 className="w-12 h-12 mx-auto mb-3" />
          <p className="font-display font-bold text-primary text-lg">No area selected</p>
          <p className="text-sm mt-1">Select an area from the sidebar to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 font-sans">
      <div>
        <h2 className="font-display text-2xl font-bold text-primary">Analytics</h2>
        <p className="font-sans text-sm text-on-surface-variant mt-1">
          {selectedArea.name} — {hasData ? `${totalUploads} upload${totalUploads !== 1 ? 's' : ''} available` : 'No data uploaded yet'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={<Upload className="w-5 h-5" />} label="Current Occupancy" value={totalDevices} color="teal" />
        <KPICard icon={<TrendingUp className="w-5 h-5" />} label="Busiest Zone" value={occupancyData?.most_crowded || '—'} color="blue" small />
        <KPICard icon={<Clock className="w-5 h-5" />} label="Peak Timestamp" value={peakHour ? new Date(peakHour).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'} color="amber" small />
        <KPICard icon={<BarChart2 className="w-5 h-5" />} label="Total Uploads" value={totalUploads} color="teal" />
      </div>

      {!hasData ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-slate-100">
          <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-display font-bold text-primary text-lg mb-2">No data yet</h3>
          <p className="text-sm text-on-surface-variant">Upload an RSSI CSV file via Area Setup or Data Import to see analytics.</p>
        </div>
      ) : (
        <>
          {/* Hourly Trend Line Chart */}
          {trendData.length > 0 && (
            <div className="glass-card p-6 rounded-2xl border border-slate-100">
              <h4 className="font-display font-bold text-primary mb-4">Occupancy Trend</h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    formatter={(v) => [`${v} devices`, 'Occupancy']}
                  />
                  <Line type="monotone" dataKey="devices" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 4, fill: '#0d9488' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Zone Popularity Bar Chart */}
          {popularityData.length > 0 && (
            <div className="glass-card p-6 rounded-2xl border border-slate-100">
              <h4 className="font-display font-bold text-primary mb-4">Zone Popularity (Avg Occupancy %)</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={popularityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    formatter={(v) => [`${v.toFixed(1)}%`, 'Avg Occupancy']}
                  />
                  <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                    {popularityData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Zone breakdown table */}
          {occupancyData?.zones?.length > 0 && (
            <div className="glass-card p-6 rounded-2xl border border-slate-100">
              <h4 className="font-display font-bold text-primary mb-4">Current Zone Breakdown</h4>
              <div className="space-y-3">
                {occupancyData.zones.map((z, i) => (
                  <div key={z.zone_id} className="flex items-center gap-4">
                    <span className="font-sans text-sm font-medium text-primary w-32 truncate">{z.zone_name}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(z.occupancy_pct, 100)}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                    </div>
                    <span className="font-mono text-xs font-bold text-on-surface-variant w-14 text-right">{z.occupancy_pct.toFixed(1)}%</span>
                    <span className="font-mono text-xs text-slate-400 w-16 text-right">{z.devices}/{z.capacity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KPICard({ icon, label, value, color, small }) {
  const colors = {
    teal: 'bg-teal-50 text-teal-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="glass-card p-5 rounded-2xl border border-slate-100 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <p className={`font-display font-bold text-primary ${small ? 'text-xl' : 'text-3xl'} tracking-tight truncate`}>{value}</p>
        <p className="font-sans text-xs text-on-surface-variant font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}
