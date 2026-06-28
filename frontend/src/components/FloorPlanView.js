import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Compass } from 'lucide-react';
import { useApp } from '../context/AppContext';

// 4 thresholds: 0-25% grey, 25-50% teal, 50-75% amber, 75-100% red
function getZoneConfig(pct) {
  if (pct >= 75) return {
    status: 'CRITICAL',
    fill: 'rgba(220,38,38,0.40)',
    fillSelected: 'rgba(220,38,38,0.65)',
    stroke: '#dc2626',
    badge: 'bg-red-100 text-red-700',
    bar: 'border-red-500',
    barColor: '#dc2626',
    label: '75–100%',
  };
  if (pct >= 50) return {
    status: 'BUSY',
    fill: 'rgba(217,119,6,0.35)',
    fillSelected: 'rgba(217,119,6,0.60)',
    stroke: '#d97706',
    badge: 'bg-amber-100 text-amber-700',
    bar: 'border-amber-500',
    barColor: '#d97706',
    label: '50–75%',
  };
  if (pct >= 25) return {
    status: 'MODERATE',
    fill: 'rgba(13,148,136,0.28)',
    fillSelected: 'rgba(13,148,136,0.55)',
    stroke: '#006a61',
    badge: 'bg-teal-100 text-teal-700',
    bar: 'border-teal-500',
    barColor: '#006a61',
    label: '25–50%',
  };
  return {
    status: 'QUIET',
    fill: 'rgba(100,116,139,0.15)',
    fillSelected: 'rgba(100,116,139,0.35)',
    stroke: '#64748b',
    badge: 'bg-slate-100 text-slate-600',
    bar: 'border-slate-400',
    barColor: '#64748b',
    label: '0–25%',
  };
}

function metersToSvg(x_m, y_m, width_m, height_m, vw = 1000, vh = 600) {
  const scale = Math.min(vw / Math.max(width_m, 0.01), vh / Math.max(height_m, 0.01));
  const ox = (vw - width_m * scale) / 2;
  const oy = (vh - height_m * scale) / 2;
  return [x_m * scale + ox, (height_m - y_m) * scale + oy];
}

function ptsToPath(pts, vw, vh, width_m, height_m) {
  if (!pts || pts.length < 2) return '';
  const svgPts = pts.map(([x, y]) => metersToSvg(x, y, width_m, height_m, vw, vh));
  return svgPts.map(([sx, sy], i) => `${i === 0 ? 'M' : 'L'} ${sx},${sy}`).join(' ') + ' Z';
}

function getPolygonCentroid(poly, vw, vh, width_m, height_m) {
  if (!poly || poly.length === 0) return [vw / 2, vh / 2];
  const pts = poly.map(([x, y]) => metersToSvg(x, y, width_m, height_m, vw, vh));
  return [
    pts.reduce((s, [x]) => s + x, 0) / pts.length,
    pts.reduce((s, [, y]) => s + y, 0) / pts.length,
  ];
}

// Generate flow arrows between zone centroids based on occupancy order
function buildFlowArrows(zones, occupancyByZone, width_m, height_m, vw, vh) {
  const ranked = zones
    .map(z => {
      const occ = occupancyByZone[z.id];
      const pct = occ?.occupancy_pct || 0;
      const [cx, cy] = getPolygonCentroid(z.polygon_json, vw, vh, width_m, height_m);
      return { id: z.id, name: z.name, pct, cx, cy };
    })
    .sort((a, b) => b.pct - a.pct);

  const arrows = [];
  for (let i = 0; i < ranked.length - 1; i++) {
    const from = ranked[i];
    const to = ranked[i + 1];
    const dx = to.cx - from.cx;
    const dy = to.cy - from.cy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // Shorten arrow so it doesn't overlap zone labels
    const pad = 30;
    const x1 = from.cx + (dx / len) * pad;
    const y1 = from.cy + (dy / len) * pad;
    const x2 = to.cx - (dx / len) * pad;
    const y2 = to.cy - (dy / len) * pad;
    arrows.push({ x1, y1, x2, y2, fromPct: from.pct, toPct: to.pct, key: `${from.id}-${to.id}` });
  }
  return arrows;
}

export default function FloorPlanView() {
  const {
    selectedArea, dxfData, zones, accessPoints,
    occupancyData, deviceData, timestamps, selectedTimestamp,
    setSelectedTimestamp, isLoading,
  } = useApp();

  const [activeTab, setActiveTab] = useState('heatmap');
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [tooltip, setTooltip] = useState(null);
  const [zoom, setZoom] = useState(1);

  const vw = 1000, vh = 600;
  const fb = dxfData?.floor_boundary;
  const polylines = dxfData?.polylines || [];
  const width_m = fb?.width_m || selectedArea?.width_m || 100;
  const height_m = fb?.height_m || selectedArea?.height_m || 60;

  // Build occupancy lookup by zone id
  const occupancyByZone = {};
  (occupancyData?.zones || []).forEach(z => { occupancyByZone[z.zone_id] = z; });

  const filteredZones = zones.filter(z => {
    if (statusFilter === 'All') return true;
    const occ = occupancyByZone[z.id];
    const pct = occ?.occupancy_pct || 0;
    return getZoneConfig(pct).status === statusFilter.toUpperCase();
  });

  const allDevices = deviceData?.devices || [];
  const flowArrows = activeTab === 'flow'
    ? buildFlowArrows(zones, occupancyByZone, width_m, height_m, vw, vh)
    : [];

  return (
    <div className="flex-1 flex flex-col relative h-[calc(100vh-80px)] overflow-hidden font-sans">

      {/* Toolbar */}
      <section className="px-6 py-4 flex flex-wrap gap-4 items-center justify-between border-b border-slate-100 z-10 bg-white">
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${timestamps.length > 0 ? 'bg-status-success animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-[10px] font-mono font-bold text-on-surface uppercase tracking-wider">
              {selectedArea ? selectedArea.name : 'No area selected'}
            </span>
            {selectedTimestamp && (
              <>
                <div className="h-4 w-px bg-slate-200" />
                <span className="text-[10px] text-on-surface-variant font-mono font-semibold">{selectedTimestamp}</span>
              </>
            )}
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-100">
            {[
              { id: 'heatmap', label: 'Heatmap' },
              { id: 'devices', label: 'Devices' },
              { id: 'flow',    label: 'Flow' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider font-mono transition-all ${
                  activeTab === tab.id ? 'bg-secondary text-white shadow-sm' : 'text-on-surface-variant hover:text-secondary'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mode description pill */}
          <span className="hidden sm:block text-[10px] font-mono text-slate-400 font-medium">
            {activeTab === 'heatmap' && 'Zone density by occupancy %'}
            {activeTab === 'devices' && 'Individual device positions'}
            {activeTab === 'flow'    && 'Traffic flow between zones'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {timestamps.length > 0 && (
            <select value={selectedTimestamp || ''} onChange={e => setSelectedTimestamp(e.target.value)}
              className="bg-white border border-slate-200 focus:border-secondary rounded-xl text-xs font-mono font-bold py-2 pl-4 pr-8 shadow-sm cursor-pointer outline-none">
              {timestamps.map(ts => <option key={ts} value={ts}>{ts}</option>)}
            </select>
          )}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 focus:border-secondary rounded-xl text-xs font-mono font-bold py-2 pl-4 pr-8 shadow-sm cursor-pointer outline-none">
            {['All', 'Quiet', 'Moderate', 'Busy', 'Critical'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </section>

      {/* Map + Panel */}
      <div className="flex-1 flex relative overflow-hidden bg-slate-50/50">

        {/* SVG Floor Plan */}
        <div className="flex-1 relative flex items-center justify-center p-6 select-none overflow-hidden">
          {!fb ? (
            <div className="text-center text-slate-400">
              <p className="text-lg font-display font-bold text-primary mb-2">No floor plan loaded</p>
              <p className="text-sm">Select an area from the sidebar or upload a DXF in Area Setup.</p>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${vw} ${vh}`}
              className="w-full h-full drop-shadow-2xl max-w-4xl max-h-[500px]"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
            >
              {/* ── Layer 1: Floor boundary ── */}
              <path d={fb.svg_path} fill="rgba(248,250,252,0.9)" stroke="#c5c6ce" strokeWidth="2" />

              {/* ── Layer 2: CAD geometry — walls solid, furniture lighter ── */}
              {polylines.map(p => {
                const cat = p.category || 'detail';
                const style = cat === 'structural'
                  ? { stroke: '#94a3b8', strokeWidth: 1.8, opacity: 1 }      // walls — darker
                  : cat === 'furniture'
                  ? { stroke: '#cbd5e1', strokeWidth: 1, opacity: 0.85 }     // furniture — light
                  : { stroke: '#dde3ec', strokeWidth: 0.8, opacity: 0.7 };   // detail — faint
                return (
                  <path
                    key={p.id}
                    d={p.svg_path}
                    fill="none"
                    stroke={style.stroke}
                    strokeWidth={style.strokeWidth}
                    opacity={style.opacity}
                  />
                );
              })}

              {/* ══════════════════════════════════════════
                  HEATMAP MODE — zone color fills only,
                  no device dots. Color = occupancy tier.
              ══════════════════════════════════════════ */}
              {activeTab === 'heatmap' && filteredZones.map(z => {
                const occ = occupancyByZone[z.id];
                const pct = occ?.occupancy_pct || 0;
                const cfg = getZoneConfig(pct);
                const poly = z.polygon_json;
                if (!poly || poly.length < 3) return null;
                const d = ptsToPath(poly, vw, vh, width_m, height_m);
                const [cx, cy] = getPolygonCentroid(poly, vw, vh, width_m, height_m);
                const isSelected = selectedZoneId === z.id;
                return (
                  <g key={z.id} onClick={() => setSelectedZoneId(z.id === selectedZoneId ? null : z.id)} className="cursor-pointer">
                    <path
                      d={d}
                      fill={isSelected ? cfg.fillSelected : cfg.fill}
                      stroke={cfg.stroke}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      className="transition-all hover:opacity-90"
                    />
                    <text x={cx} y={cy - 10} fontSize="11" fill={cfg.stroke} fontWeight="bold" textAnchor="middle" pointerEvents="none">
                      {z.name}
                    </text>
                    <text x={cx} y={cy + 6} fontSize="13" fill={cfg.stroke} fontWeight="bold" textAnchor="middle" pointerEvents="none">
                      {pct.toFixed(0)}%
                    </text>
                    {occ && (
                      <text x={cx} y={cy + 20} fontSize="10" fill={cfg.stroke} textAnchor="middle" pointerEvents="none" opacity="0.85">
                        {occ.devices}p / {z.capacity}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* ══════════════════════════════════════════
                  DEVICES MODE — individual dots only,
                  zone borders shown as outlines (no fill).
                  Dot color = zone occupancy tier.
              ══════════════════════════════════════════ */}
              {activeTab === 'devices' && (
                <>
                  {/* Zone outlines only — no fill */}
                  {filteredZones.map(z => {
                    const poly = z.polygon_json;
                    if (!poly || poly.length < 3) return null;
                    const d = ptsToPath(poly, vw, vh, width_m, height_m);
                    const occ = occupancyByZone[z.id];
                    const pct = occ?.occupancy_pct || 0;
                    const cfg = getZoneConfig(pct);
                    const [cx, cy] = getPolygonCentroid(poly, vw, vh, width_m, height_m);
                    return (
                      <g key={z.id}>
                        <path d={d} fill="none" stroke={cfg.stroke} strokeWidth="1.5" strokeDasharray="5,4" opacity="0.6" />
                        <text x={cx} y={cy} fontSize="10" fill={cfg.stroke} textAnchor="middle" pointerEvents="none" opacity="0.7" fontWeight="bold">
                          {z.name}
                        </text>
                      </g>
                    );
                  })}

                  {/* Device dots — color-coded by their zone's occupancy tier */}
                  {allDevices.map((d, i) => {
                    const occ = d.zone_id ? occupancyByZone[d.zone_id] : null;
                    const pct = occ?.occupancy_pct || 0;
                    const cfg = getZoneConfig(pct);
                    return (
                      <g key={i}
                        onMouseEnter={() => setTooltip({ x: d.x_svg, y: d.y_svg, text: d.zone_name || 'Outside zones', pct })}
                        onMouseLeave={() => setTooltip(null)}
                        className="cursor-crosshair"
                      >
                        {/* Glow ring */}
                        <circle cx={d.x_svg} cy={d.y_svg} r="9" fill={cfg.fill} />
                        {/* Core dot */}
                        <circle cx={d.x_svg} cy={d.y_svg} r="4.5" fill={cfg.stroke} opacity="0.9" />
                      </g>
                    );
                  })}
                </>
              )}

              {/* ══════════════════════════════════════════
                  FLOW MODE — arrows from busiest to
                  quietest zone, thickness = device count.
                  Zone fills shown at lower opacity.
              ══════════════════════════════════════════ */}
              {activeTab === 'flow' && (
                <>
                  {/* Faint zone fills for spatial context */}
                  {filteredZones.map(z => {
                    const poly = z.polygon_json;
                    if (!poly || poly.length < 3) return null;
                    const d = ptsToPath(poly, vw, vh, width_m, height_m);
                    const occ = occupancyByZone[z.id];
                    const pct = occ?.occupancy_pct || 0;
                    const cfg = getZoneConfig(pct);
                    const [cx, cy] = getPolygonCentroid(poly, vw, vh, width_m, height_m);
                    return (
                      <g key={z.id}>
                        <path d={d} fill={cfg.fill} stroke={cfg.stroke} strokeWidth="1" opacity="0.5" />
                        <text x={cx} y={cy - 6} fontSize="10" fill={cfg.stroke} textAnchor="middle" pointerEvents="none" fontWeight="bold">
                          {z.name}
                        </text>
                        <text x={cx} y={cy + 8} fontSize="11" fill={cfg.stroke} textAnchor="middle" pointerEvents="none" fontWeight="bold">
                          {pct.toFixed(0)}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Flow arrows: busiest → next busiest → ... quietest */}
                  <defs>
                    <marker id="arrow-teal" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L8,3 z" fill="#0d9488" />
                    </marker>
                    <marker id="arrow-amber" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L8,3 z" fill="#d97706" />
                    </marker>
                    <marker id="arrow-red" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L8,3 z" fill="#dc2626" />
                    </marker>
                    <marker id="arrow-slate" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L8,3 z" fill="#64748b" />
                    </marker>
                  </defs>
                  {flowArrows.map(a => {
                    const cfg = getZoneConfig(a.fromPct);
                    const markerId = cfg.status === 'CRITICAL' ? 'arrow-red'
                      : cfg.status === 'BUSY' ? 'arrow-amber'
                      : cfg.status === 'MODERATE' ? 'arrow-teal' : 'arrow-slate';
                    // Thickness proportional to from-zone occupancy
                    const strokeWidth = Math.max(1.5, (a.fromPct / 100) * 6);
                    return (
                      <line
                        key={a.key}
                        x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                        stroke={cfg.stroke}
                        strokeWidth={strokeWidth}
                        markerEnd={`url(#${markerId})`}
                        opacity="0.75"
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {flowArrows.length === 0 && zones.length < 2 && (
                    <text x={vw / 2} y={vh / 2} fontSize="13" fill="#94a3b8" textAnchor="middle">
                      Need 2+ zones to show flow
                    </text>
                  )}
                </>
              )}

              {/* ── AP Markers (always visible) ── */}
              {accessPoints.map(ap => {
                const [sx, sy] = metersToSvg(ap.x_m, ap.y_m, width_m, height_m, vw, vh);
                return (
                  <g key={ap.ap_id} transform={`translate(${sx},${sy})`}>
                    <circle cx="0" cy="0" r="14" fill="rgba(0,106,97,0.12)" />
                    <circle cx="0" cy="0" r="5" fill="#006a61" />
                    <text x="0" y="-16" fontSize="9" fill="#006a61" fontWeight="bold" textAnchor="middle">{ap.ap_id}</text>
                  </g>
                );
              })}

              {/* Tooltip */}
              {tooltip && (
                <g>
                  <rect x={tooltip.x + 10} y={tooltip.y - 22} width="120" height="22" rx="5" fill="rgba(0,7,27,0.88)" />
                  <text x={tooltip.x + 70} y={tooltip.y - 7} fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">
                    {tooltip.text} · {tooltip.pct?.toFixed(0)}%
                  </text>
                </g>
              )}
            </svg>
          )}

          {/* Zoom controls */}
          <div className="absolute bottom-6 left-6 flex flex-col gap-2">
            <button onClick={() => setZoom(z => Math.min(z + 0.15, 2.5))} className="w-12 h-12 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all text-primary">
              <ZoomIn className="w-5 h-5" />
            </button>
            <button onClick={() => setZoom(z => Math.max(z - 0.15, 0.4))} className="w-12 h-12 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all text-primary">
              <ZoomOut className="w-5 h-5" />
            </button>
            <button onClick={() => setZoom(1)} className="w-12 h-12 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all text-primary mt-2">
              <Compass className="w-5 h-5" />
            </button>
          </div>

          {/* Color legend — changes per mode */}
          <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur border border-slate-100 rounded-xl p-3 shadow-sm text-[10px] font-mono space-y-1.5">
            {activeTab === 'heatmap' && (
              <>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-2">Occupancy</p>
                {[
                  ['rgba(220,38,38,0.40)', '#dc2626', '75–100%', 'Critical'],
                  ['rgba(217,119,6,0.35)',  '#d97706', '50–75%',  'Busy'],
                  ['rgba(13,148,136,0.28)', '#006a61', '25–50%',  'Moderate'],
                  ['rgba(100,116,139,0.15)','#64748b', '0–25%',   'Quiet'],
                ].map(([bg, border, pct, label]) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ background: bg, border: `1.5px solid ${border}` }} />
                    <span className="text-slate-600 font-semibold">{pct}</span>
                    <span className="text-slate-400">{label}</span>
                  </div>
                ))}
              </>
            )}
            {activeTab === 'devices' && (
              <>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-2">Device Tier</p>
                {[
                  ['#dc2626', 'Critical zone (75%+)'],
                  ['#d97706', 'Busy zone (50–75%)'],
                  ['#006a61', 'Moderate zone (25–50%)'],
                  ['#64748b', 'Quiet zone (0–25%)'],
                ].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: c }} />
                    <span className="text-slate-600">{l}</span>
                  </div>
                ))}
              </>
            )}
            {activeTab === 'flow' && (
              <>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-2">Flow Direction</p>
                <p className="text-slate-500 leading-relaxed max-w-[140px]">Arrows show movement from busiest → quietest zones. Thickness = occupancy level.</p>
              </>
            )}
          </div>
        </div>

        {/* Right Status Panel */}
        <div className="h-full w-80 bg-white/95 backdrop-blur border-l border-slate-100 flex flex-col p-6 z-20 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-primary">Zone Status</h3>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded">
              {timestamps.length > 0 ? 'LIVE' : 'NO DATA'}
            </span>
          </div>

          <div className="space-y-3 flex-grow">
            {zones.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No zones defined. Go to Area Setup to draw zones.</p>
            )}
            {zones.map(z => {
              const occ = occupancyByZone[z.id];
              const pct = occ?.occupancy_pct || 0;
              const cfg = getZoneConfig(pct);
              const isSelected = selectedZoneId === z.id;
              return (
                <div key={z.id} onClick={() => setSelectedZoneId(z.id === selectedZoneId ? null : z.id)}
                  className={`p-4 rounded-xl border-l-4 cursor-pointer transition-all ${cfg.bar} ${isSelected ? 'bg-slate-50 shadow-sm' : 'bg-white hover:bg-slate-50 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-sans text-sm font-bold text-primary truncate">{z.name}</span>
                    <span className={`px-2 py-0.5 ${cfg.badge} text-[9px] rounded-full font-bold shrink-0 ml-2`}>{cfg.status}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">{pct.toFixed(0)}%</p>
                      <p className="text-[9px] text-on-surface-variant uppercase font-mono font-bold tracking-wider">Occupancy</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{occ?.devices || 0}/{z.capacity}</p>
                      <p className="text-[9px] text-on-surface-variant uppercase font-mono font-bold tracking-wider">Devices</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: cfg.barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-16 bg-white border-t border-slate-100 px-6 flex items-center justify-between z-30 shrink-0 select-none">
        <div className="flex items-center gap-8">
          {[
            { label: 'Total Occupants', val: occupancyData?.total_devices ?? allDevices.length },
            { label: 'Busiest Zone',    val: occupancyData?.most_crowded || '—', colored: true },
            { label: 'Active APs',      val: `${accessPoints.length}` },
          ].map(({ label, val, colored }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">{label}</span>
              <span className={`text-sm font-bold ${colored ? 'text-secondary' : 'text-primary'}`}>{val}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          {selectedArea && (
            <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              {width_m.toFixed(1)}m × {height_m.toFixed(1)}m · {zones.length} zones
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
