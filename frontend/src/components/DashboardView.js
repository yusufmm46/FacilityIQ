import React, { useEffect } from 'react';
import { Users, Zap, Building2, Radio, ZoomIn, ArrowRight, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

function StatusPill({ status }) {
  const cfg = {
    BUSY:     'bg-red-50 text-error',
    CRITICAL: 'bg-red-50 text-error',
    MODERATE: 'bg-teal-50 text-secondary',
    QUIET:    'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold ${cfg[status] || cfg.QUIET}`}>
      {status}
    </span>
  );
}

const LIVE_POLL_MS = 30000;

export default function DashboardView({ onViewChange }) {
  const {
    buildings, liveStatus, loadLiveStatus,
    liveData, selectedArea, dxfData, zones,
  } = useApp();

  // Poll the global live status every 30s
  useEffect(() => {
    loadLiveStatus();
    const id = setInterval(loadLiveStatus, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [loadLiveStatus]);

  const areas = liveStatus?.areas || [];
  const liveAreas = areas.filter(a => a.is_live);
  const totalPeople = areas.reduce((s, a) => s + (a.total_devices || 0), 0);
  const busiestArea = [...areas].sort((a, b) => (b.total_devices || 0) - (a.total_devices || 0))[0];
  const busiestZone = busiestArea?.most_crowded || (busiestArea?.total_devices ? busiestArea.area_name : '—');
  const anyLive = liveAreas.length > 0;

  // Floor preview uses the selected area's live occupancy if present
  const liveForArea = liveData && liveData.area_name === selectedArea?.name ? liveData : null;
  const fb = dxfData?.floor_boundary;
  const polylines = dxfData?.polylines || [];

  // Live people-per-area bars
  const areaBars = areas.map(a => ({ name: a.area_name, val: a.total_devices || 0 }));
  const barMax = Math.max(...areaBars.map(a => a.val), 1);

  const breakdownZones = liveForArea?.zones || [];

  return (
    <div className="space-y-6 font-sans">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total people */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-100 hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl"><Users className="w-5 h-5" /></div>
            <span className={`font-mono text-xs font-bold ${anyLive ? 'text-status-success' : 'text-slate-400'}`}>
              {anyLive ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
          <div>
            <h3 className="font-display text-4xl font-bold text-primary tracking-tight">{totalPeople}</h3>
            <p className="font-sans text-xs text-on-surface-variant font-medium mt-1">Total People Present</p>
          </div>
        </div>

        {/* Busiest zone */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-100 hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl"><Zap className="w-5 h-5" /></div>
            <span className="font-mono text-[10px] font-bold text-secondary uppercase bg-teal-50 px-2 py-0.5 rounded-full">BUSIEST</span>
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold text-primary tracking-tight truncate">{busiestZone}</h3>
            <p className="font-sans text-xs text-on-surface-variant font-medium mt-1">Busiest Zone</p>
          </div>
        </div>

        {/* Buildings */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-100 hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Building2 className="w-5 h-5" /></div>
          </div>
          <div>
            <h3 className="font-display text-4xl font-bold text-primary tracking-tight">{buildings.length}</h3>
            <p className="font-sans text-xs text-on-surface-variant font-medium mt-1">Buildings Active</p>
          </div>
        </div>

        {/* Live areas */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-100 hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl"><Radio className="w-5 h-5" /></div>
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2.5">
              <div className="h-full bg-secondary" style={{ width: `${areas.length ? (liveAreas.length / areas.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div>
            <h3 className="font-display text-4xl font-bold text-primary tracking-tight">{liveAreas.length}<span className="text-xl text-slate-400">/{areas.length}</span></h3>
            <p className="font-sans text-xs text-on-surface-variant font-medium mt-1">Areas Streaming Live</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Floor plan preview */}
          <div className="glass-card overflow-hidden h-[450px] relative rounded-2xl border border-slate-100">
            <div className="absolute top-6 left-6 z-10 space-y-1">
              <h4 className="font-display text-xl font-bold text-primary">Live Floor Heat Map</h4>
              <p className="font-sans text-xs text-on-surface-variant font-medium">
                {selectedArea ? selectedArea.name : 'Select an area to preview'}
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
                  <path d={fb.svg_path} fill="rgba(248,250,252,0.9)" stroke="#c5c6ce" strokeWidth="2" />
                  {polylines.map(p => (
                    <path key={p.id} d={p.svg_path} fill="none" stroke="#dee2ed" strokeWidth="1" />
                  ))}
                  {(liveForArea?.zones || []).map(z => {
                    const zone = zones.find(x => x.id === z.zone_id);
                    if (!zone?.polygon_json || zone.polygon_json.length < 3) return null;
                    const wm = fb.width_m, hm = fb.height_m;
                    const sc = Math.min(1000 / wm, 600 / hm);
                    const ox = (1000 - wm * sc) / 2, oy = (600 - hm * sc) / 2;
                    const pts = zone.polygon_json.map(([x, y]) => `${x * sc + ox},${(hm - y) * sc + oy}`).join(' ');
                    const pct = z.occupancy_pct;
                    const fill = pct >= 75 ? 'rgba(220,38,38,0.4)' : pct >= 50 ? 'rgba(217,119,6,0.35)' : pct >= 25 ? 'rgba(13,148,136,0.28)' : 'rgba(100,116,139,0.15)';
                    return <polygon key={z.zone_id} points={pts} fill={fill} stroke="#64748b" strokeWidth="1" />;
                  })}
                </svg>
              ) : (
                <div className="text-center text-slate-400 px-6">
                  <Wifi className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="font-display font-bold text-primary">No floor plan selected</p>
                  <p className="text-xs mt-1">Pick an area in the sidebar, or set one up in Area Setup.</p>
                </div>
              )}
              <div className="absolute bottom-6 left-6 bg-white/85 backdrop-blur-md px-4 py-3 border border-white/50 rounded-xl shadow-lg flex items-center gap-3">
                {anyLive
                  ? <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
                  : <WifiOff className="w-3.5 h-3.5 text-slate-400" />}
                <span className="font-mono text-[9px] font-bold text-primary tracking-wider uppercase">
                  {anyLive ? 'LIVE OCCUPANCY DATA' : 'WAITING FOR LIVE DATA…'}
                </span>
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* People by area (live) */}
            <div className="glass-card p-6 rounded-2xl border border-slate-100">
              <h4 className="font-sans font-bold text-primary text-sm mb-6">People by Area (live)</h4>
              {areaBars.length > 0 ? (
                <>
                  <div className="h-32 w-full flex items-end justify-between gap-3 pt-4">
                    {areaBars.map((a, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <span className="font-mono text-[10px] font-bold text-secondary">{a.val}</span>
                        <div className="w-full rounded-t bg-secondary/70"
                          style={{ height: `${Math.round((a.val / barMax) * 100)}%`, minHeight: a.val > 0 ? '4px' : '0' }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-3 font-mono text-[9px] text-on-surface-variant/85 font-semibold gap-2">
                    {areaBars.map((a, idx) => (
                      <span key={idx} className="flex-1 text-center truncate">{a.name}</span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center text-center text-slate-400">
                  <p className="text-xs">No areas configured yet.</p>
                </div>
              )}
            </div>

            {/* Stream health */}
            <div className="glass-card p-6 rounded-2xl border border-slate-100">
              <h4 className="font-sans font-bold text-primary text-sm">Stream Health</h4>
              <div className="mt-4 flex items-center gap-4">
                <div className={`text-3xl font-display font-extrabold tracking-tight ${anyLive ? 'text-status-success' : 'text-slate-400'}`}>
                  {liveAreas.length}/{areas.length || 0}
                </div>
                <div className="font-mono text-[10px] font-bold text-on-surface-variant uppercase">Areas live</div>
              </div>
              <div className="mt-4 space-y-1.5">
                {areas.length === 0 && <p className="text-xs text-slate-400">No areas configured yet.</p>}
                {areas.map(a => (
                  <div key={a.area_name} className="flex items-center gap-2">
                    {a.is_live ? <Wifi className="w-3.5 h-3.5 text-status-success" /> : <WifiOff className="w-3.5 h-3.5 text-slate-300" />}
                    <span className="text-xs text-on-surface font-semibold truncate flex-1">{a.area_name}</span>
                    <span className="font-mono text-[10px] text-slate-400">{a.total_devices || 0}p</span>
                  </div>
                ))}
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
              {breakdownZones.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">
                  {selectedArea ? 'Waiting for live data for this area…' : 'Select an area to see live zones.'}
                </p>
              )}
              {breakdownZones.slice(0, 6).map(zone => {
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
                          <p className="font-sans font-bold text-sm text-primary group-hover:text-secondary transition-colors truncate max-w-[100px]">{zone.zone_name}</p>
                          <p className="font-mono text-[9px] font-semibold text-on-surface-variant/80 uppercase tracking-wider">{zone.devices}/{zone.capacity}</p>
                        </div>
                      </div>
                      <StatusPill status={zone.status} />
                    </div>
                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-50">
                      <span className="font-sans text-xs text-on-surface-variant font-medium">{zone.occupancy_pct?.toFixed(0) || 0}% Capacity</span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-secondary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center flex flex-col items-center">
              <Sparkles className="text-secondary w-5 h-5 mb-2" />
              <p className="font-sans font-bold text-primary text-sm">See it live</p>
              <p className="font-sans text-xs text-on-surface-variant mt-1 mb-4 leading-normal">
                Open the floor plan for real-time device positions and zone occupancy.
              </p>
              <button onClick={() => onViewChange('floor-plan')}
                className="w-full py-2.5 bg-white border border-slate-200 hover:border-secondary hover:bg-secondary hover:text-white rounded-lg font-mono text-[10px] font-bold text-secondary transition-all shadow-sm tracking-wider">
                OPEN FLOOR PLAN
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
