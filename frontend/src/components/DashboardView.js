import React, { useState, useEffect } from 'react';
import { Users, Zap, Building2, PieChart, ZoomIn, MoreHorizontal, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

function StatusPill({ status }) {
  const cfg = {
    BUSY:     'bg-red-50 text-error',
    CRITICAL: 'bg-red-50 text-error',
    MODERATE: 'bg-teal-50 text-secondary',
    QUIET:    'bg-slate-100 text-slate-500',
    OPTIMAL:  'bg-teal-50 text-secondary',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold ${cfg[status] || cfg.MODERATE}`}>
      {status}
    </span>
  );
}

const BAR_DATA_DEFAULT = [40, 55, 45, 70, 92, 65, 50, 30];

export default function DashboardView({ onViewChange }) {
  const { buildings, occupancyData, analyticsData, zones, dxfData, selectedArea } = useApp();
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => setPulseScale(s => s === 1 ? 1.15 : 1), 1500);
    return () => clearInterval(interval);
  }, []);

  const totalDevices = occupancyData?.total_devices || 0;
  const busiestZone = occupancyData?.most_crowded || '—';
  const avgOccupancy = occupancyData?.zones?.length
    ? Math.round(occupancyData.zones.reduce((s, z) => s + z.occupancy_pct, 0) / occupancyData.zones.length)
    : 64;

  const trendData = analyticsData?.hourly_trend || [];
  const barValues = trendData.length > 0
    ? trendData.map(h => h.total_devices)
    : BAR_DATA_DEFAULT;
  const barMax = Math.max(...barValues, 1);

  const displayZones = (occupancyData?.zones || []).length > 0
    ? occupancyData.zones
    : zones.map(z => ({ zone_id: z.id, zone_name: z.name, devices: 0, capacity: z.capacity, occupancy_pct: 0, status: 'QUIET' }));

  const fb = dxfData?.floor_boundary;
  const polylines = dxfData?.polylines || [];
  const aps = dxfData?.access_points || [];

  return (
    <div className="space-y-6 font-sans">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-100 hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl"><Users className="w-5 h-5" /></div>
            <span className="font-mono text-xs text-status-success font-bold">LIVE</span>
          </div>
          <div>
            <h3 className="font-display text-4xl font-bold text-primary tracking-tight">{totalDevices || 2450}</h3>
            <p className="font-sans text-xs text-on-surface-variant font-medium mt-1">Total People Present</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-100 hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl"><Zap className="w-5 h-5" /></div>
            <span className="font-mono text-[10px] font-bold text-secondary uppercase bg-teal-50 px-2 py-0.5 rounded-full">ACTIVE</span>
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold text-primary tracking-tight truncate">{busiestZone}</h3>
            <p className="font-sans text-xs text-on-surface-variant font-medium mt-1">Busiest Zone</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-100 hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Building2 className="w-5 h-5" /></div>
            <span className="font-mono text-xs text-on-surface-variant font-bold">{buildings.length} / {buildings.length}</span>
          </div>
          <div>
            <h3 className="font-display text-4xl font-bold text-primary tracking-tight">{buildings.length || 0}</h3>
            <p className="font-sans text-xs text-on-surface-variant font-medium mt-1">Buildings Active</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-100 hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl"><PieChart className="w-5 h-5" /></div>
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2.5">
              <div className="h-full bg-secondary" style={{ width: `${avgOccupancy}%` }} />
            </div>
          </div>
          <div>
            <h3 className="font-display text-4xl font-bold text-primary tracking-tight">{avgOccupancy}%</h3>
            <p className="font-sans text-xs text-on-surface-variant font-medium mt-1">Avg Occupancy</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Floor plan preview or heatmap */}
          <div className="glass-card overflow-hidden h-[450px] relative rounded-2xl border border-slate-100">
            <div className="absolute top-6 left-6 z-10 space-y-1">
              <h4 className="font-display text-xl font-bold text-primary">Live Floor Heat Map</h4>
              <p className="font-sans text-xs text-on-surface-variant font-medium">
                {selectedArea ? selectedArea.name : 'Main Lobby — Level 0'}
              </p>
            </div>
            <div className="absolute top-6 right-6 z-10 flex gap-2">
              <button onClick={() => onViewChange('floor-plan')} className="bg-white/85 hover:bg-white backdrop-blur p-2 rounded-xl shadow border border-slate-100 text-secondary transition-colors">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-slate-50/50">
              {fb ? (
                <svg viewBox="0 0 1000 600" className="w-[90%] h-[85%] cursor-pointer" onClick={() => onViewChange('floor-plan')}>
                  <path d={fb.svg_path} fill="rgba(219,234,254,0.5)" stroke="#93c5fd" strokeWidth="2" />
                  {polylines.map(p => (
                    <path key={p.id} d={p.svg_path} fill="none" stroke="#dee2ed" strokeWidth="1" />
                  ))}
                  {(occupancyData?.zones || []).map(z => {
                    const zone = zones.find(x => x.id === z.zone_id);
                    if (!zone?.polygon_json || zone.polygon_json.length < 3) return null;
                    const wm = fb.width_m, hm = fb.height_m;
                    const sc = Math.min(1000 / wm, 600 / hm);
                    const ox = (1000 - wm * sc) / 2, oy = (600 - hm * sc) / 2;
                    const pts = zone.polygon_json.map(([x, y]) => `${x * sc + ox},${(hm - y) * sc + oy}`).join(' ');
                    const pct = z.occupancy_pct;
                    const fill = pct >= 80 ? 'rgba(220,38,38,0.4)' : pct >= 60 ? 'rgba(217,119,6,0.35)' : pct >= 30 ? 'rgba(13,148,136,0.25)' : 'rgba(100,116,139,0.15)';
                    return <polygon key={z.zone_id} points={pts} fill={fill} stroke="#64748b" strokeWidth="1" />;
                  })}
                </svg>
              ) : (
                <>
                  <svg className="w-[85%] h-[85%] opacity-20 stroke-primary fill-none" viewBox="0 0 800 600">
                    <path d="M50 50h700v500H50z M150 150h200v200H150z M450 150h200v300H450z" strokeWidth="4" />
                  </svg>
                  <div className="absolute w-36 h-36 rounded-full blur-[40px] bg-secondary/30 top-[25%] left-[35%] transition-transform duration-[1500ms]" style={{ transform: `scale(${pulseScale})` }} />
                  <div className="absolute w-44 h-44 rounded-full blur-[50px] bg-chart-blue/20 top-[45%] left-[55%] transition-transform duration-[1500ms]" style={{ transform: `scale(${pulseScale * 0.9})` }} />
                </>
              )}
              <div className="absolute bottom-6 left-6 bg-white/85 backdrop-blur-md px-4 py-3 border border-white/50 rounded-xl shadow-lg flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
                <span className="font-mono text-[9px] font-bold text-primary tracking-wider uppercase">
                  {fb ? 'LIVE OCCUPANCY DATA' : 'RE-CALIBRATING SENSORS...'}
                </span>
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="glass-card p-6 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-sans font-bold text-primary text-sm">Occupancy Trends</h4>
                <MoreHorizontal className="text-on-surface-variant cursor-pointer w-4 h-4" />
              </div>
              <div className="h-32 w-full flex items-end justify-between gap-2.5 pt-4">
                {barValues.map((val, idx) => {
                  const h = Math.round((val / barMax) * 100);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div
                        className={`w-full rounded-t ${idx === barValues.length - 1 ? 'bg-secondary' : 'bg-slate-200 hover:bg-secondary/60 transition-colors'}`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-3 font-mono text-[9px] text-on-surface-variant/85 font-semibold">
                <span>Start</span>
                <span className="text-secondary font-bold">Peak</span>
                <span>End</span>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl relative overflow-hidden border border-slate-100">
              <div className="z-10 relative">
                <h4 className="font-sans font-bold text-primary text-sm">System Health</h4>
                <div className="mt-4 flex items-center gap-4">
                  <div className="text-3xl font-display font-extrabold text-status-success tracking-tight">99.8%</div>
                  <div className="font-mono text-[10px] font-bold text-on-surface-variant uppercase">Uptime</div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <CheckCircle2 className="text-status-success w-4 h-4" />
                  <span className="font-sans text-xs text-on-surface font-semibold">
                    {aps.length > 0 ? `${aps.length} APs operational` : 'All sensors operational'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Zone Breakdown */}
        <div className="space-y-6">
          <div className="glass-card p-6 flex flex-col rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-display text-lg font-bold text-primary">Zone Breakdown</h4>
              <button onClick={() => onViewChange('floor-plan')} className="text-secondary hover:underline font-mono text-[10px] font-bold tracking-wider">
                VIEW ALL
              </button>
            </div>

            <div className="space-y-3.5">
              {displayZones.slice(0, 5).map(zone => {
                const isBusy = zone.status === 'BUSY' || zone.status === 'CRITICAL';
                return (
                  <div key={zone.zone_id} onClick={() => onViewChange('floor-plan')}
                    className="p-4 rounded-xl hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all cursor-pointer group flex flex-col gap-3 bg-white">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isBusy ? 'bg-red-50 text-error' : zone.status === 'MODERATE' ? 'bg-teal-50 text-secondary' : 'bg-blue-50 text-blue-600'}`}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-sans font-bold text-sm text-primary group-hover:text-secondary transition-colors truncate max-w-[100px]">
                            {zone.zone_name}
                          </p>
                          <p className="font-mono text-[9px] font-semibold text-on-surface-variant/80 uppercase tracking-wider">
                            {zone.devices}/{zone.capacity}
                          </p>
                        </div>
                      </div>
                      <StatusPill status={zone.status || 'QUIET'} />
                    </div>
                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-50">
                      <span className="font-sans text-xs text-on-surface-variant font-medium">{zone.occupancy_pct?.toFixed(0) || 0}% Capacity</span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-secondary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}

              {displayZones.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No zones defined. Set up areas first.</p>
              )}
            </div>

            {/* CTA */}
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center flex flex-col items-center">
              <Sparkles className="text-secondary w-5 h-5 mb-2 animate-bounce" />
              <p className="font-sans font-bold text-primary text-sm">Need more occupancy data?</p>
              <p className="font-sans text-xs text-on-surface-variant mt-1 mb-4 leading-normal">
                Export comprehensive space utilization reports as PDF or CSV.
              </p>
              <button onClick={() => onViewChange('data-import')}
                className="w-full py-2.5 bg-white border border-slate-200 hover:border-secondary hover:bg-secondary hover:text-white rounded-lg font-mono text-[10px] font-bold text-secondary transition-all shadow-sm tracking-wider">
                GENERATE EXPORT
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
