import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, Compass } from 'lucide-react';
import { useApp } from '../context/AppContext';

// 4 thresholds: 0-25% grey, 25-50% teal, 50-75% amber, 75-100% red
function getZoneConfig(pct) {
  if (pct >= 75) return {
    status: 'CRITICAL', fill: 'rgba(220,38,38,0.40)', fillSelected: 'rgba(220,38,38,0.65)',
    stroke: '#dc2626', badge: 'bg-red-100 text-red-700', bar: 'border-red-500', barColor: '#dc2626',
  };
  if (pct >= 50) return {
    status: 'BUSY', fill: 'rgba(217,119,6,0.35)', fillSelected: 'rgba(217,119,6,0.60)',
    stroke: '#d97706', badge: 'bg-amber-100 text-amber-700', bar: 'border-amber-500', barColor: '#d97706',
  };
  if (pct >= 25) return {
    status: 'MODERATE', fill: 'rgba(13,148,136,0.28)', fillSelected: 'rgba(13,148,136,0.55)',
    stroke: '#006a61', badge: 'bg-teal-100 text-teal-700', bar: 'border-teal-500', barColor: '#006a61',
  };
  return {
    status: 'QUIET', fill: 'rgba(100,116,139,0.15)', fillSelected: 'rgba(100,116,139,0.35)',
    stroke: '#64748b', badge: 'bg-slate-100 text-slate-600', bar: 'border-slate-400', barColor: '#64748b',
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

const LIVE_POLL_MS = 30000;  // poll live stream every 30s
const MIN_ZOOM = 0.4, MAX_ZOOM = 6;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function FloorPlanView() {
  const {
    selectedArea, dxfData, zones, accessPoints,
    liveData, loadLive,
  } = useApp();

  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [tooltip, setTooltip] = useState(null);
  const [tick, setTick] = useState(0);  // re-render every second for "Xs ago"

  // ── Pan & zoom state ────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, start: null, startPan: null });
  zoomRef.current = zoom;
  panRef.current = pan;

  const vw = 1000, vh = 600;
  const fb = dxfData?.floor_boundary;
  const polylines = dxfData?.polylines || [];
  const width_m = fb?.width_m || selectedArea?.width_m || 100;
  const height_m = fb?.height_m || selectedArea?.height_m || 60;

  // Convert a screen point to SVG viewBox coordinates
  const clientToSvg = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg || !svg.getScreenCTM) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  // Zoom keeping a given SVG point fixed under the cursor
  const zoomAround = useCallback((cx, cy, factor) => {
    const z0 = zoomRef.current;
    const z1 = clamp(z0 * factor, MIN_ZOOM, MAX_ZOOM);
    if (z1 === z0) return;
    const p0 = panRef.current;
    setPan({ x: cx - (z1 / z0) * (cx - p0.x), y: cy - (z1 / z0) * (cy - p0.y) });
    setZoom(z1);
  }, []);

  // Native wheel listener (non-passive so we can preventDefault page scroll)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const c = clientToSvg(e.clientX, e.clientY);
      zoomAround(c.x, c.y, factor);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [fb, clientToSvg, zoomAround]);

  // Drag-to-pan handlers
  const onMouseDown = (e) => {
    if (e.button !== 0) return;            // left button only
    const s = clientToSvg(e.clientX, e.clientY);
    dragRef.current = { active: true, start: s, startPan: panRef.current };
    setIsDragging(true);
  };
  const onMouseMove = (e) => {
    if (!dragRef.current.active) return;
    const cur = clientToSvg(e.clientX, e.clientY);
    const { start, startPan } = dragRef.current;
    setPan({ x: startPan.x + (cur.x - start.x), y: startPan.y + (cur.y - start.y) });
  };
  const endDrag = () => {
    if (dragRef.current.active) { dragRef.current.active = false; setIsDragging(false); }
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // ── Live polling ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedArea?.name) return;
    loadLive(selectedArea.name);
    const id = setInterval(() => loadLive(selectedArea.name), LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [selectedArea?.name, loadLive]);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Live stream data for the selected area
  const liveForArea = liveData && liveData.area_name === selectedArea?.name ? liveData : null;
  const zoneSource = liveForArea ? liveForArea.zones : [];
  const allDevices = liveForArea ? liveForArea.devices : [];

  const liveRecvRef = useRef({ key: null, at: 0, base: null });
  const liveKey = liveForArea ? `${liveForArea.area_name}|${liveForArea.last_updated}` : null;
  if (liveKey && liveRecvRef.current.key !== liveKey) {
    liveRecvRef.current = { key: liveKey, at: Date.now(), base: liveForArea.seconds_ago || 0 };
  }
  const hasLivePayload = !!liveForArea && liveForArea.last_updated;
  const secondsAgo = hasLivePayload
    ? liveRecvRef.current.base + Math.floor((Date.now() - liveRecvRef.current.at) / 1000)
    : null;
  const isLive = secondsAgo !== null && secondsAgo <= 60;
  void tick;

  const occupancyByZone = {};
  (zoneSource || []).forEach(z => { occupancyByZone[z.zone_id] = z; });

  const filteredZones = zones.filter(z => {
    if (statusFilter === 'All') return true;
    const occ = occupancyByZone[z.id];
    const pct = occ?.occupancy_pct || 0;
    return getZoneConfig(pct).status === statusFilter.toUpperCase();
  });

  return (
    <div className="flex-1 flex flex-col relative h-[calc(100vh-80px)] overflow-hidden font-sans">

      {/* Toolbar */}
      <section className="px-6 py-4 flex flex-wrap gap-4 items-center justify-between border-b border-slate-100 z-10 bg-white">
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <span className="text-[10px] font-mono font-bold text-on-surface uppercase tracking-wider">
              {selectedArea ? selectedArea.name : 'No area selected'}
            </span>
          </div>

          {/* Live stream indicator */}
          {selectedArea && (
            <div className={`px-4 py-2 rounded-xl shadow-sm border flex items-center gap-2.5 ${
              isLive ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <span className="relative flex h-2.5 w-2.5">
                {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? 'bg-green-500' : 'bg-amber-400'}`} />
              </span>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isLive ? 'text-green-700' : 'text-amber-700'}`}>
                {isLive
                  ? `Live · updated ${secondsAgo}s ago`
                  : hasLivePayload
                    ? `Waiting for live data… (last ${secondsAgo}s ago)`
                    : 'Waiting for live data…'}
              </span>
            </div>
          )}

          <span className="hidden sm:block text-[10px] font-mono text-slate-400 font-medium">
            Live heatmap · scroll to zoom · drag to pan
          </span>
        </div>

        <div className="flex items-center gap-3">
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
              ref={svgRef}
              viewBox={`0 0 ${vw} ${vh}`}
              className="w-full h-full drop-shadow-2xl max-w-4xl max-h-[500px]"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}
            >
              <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                {/* ── Layer 1: Floor boundary ── */}
                <path d={fb.svg_path} fill="rgba(248,250,252,0.9)" stroke="#c5c6ce" strokeWidth="2" />

                {/* ── Layer 2: CAD geometry — walls solid, furniture lighter ── */}
                {polylines.map(p => {
                  const cat = p.category || 'detail';
                  const style = cat === 'structural'
                    ? { stroke: '#94a3b8', strokeWidth: 1.8, opacity: 1 }
                    : cat === 'furniture'
                    ? { stroke: '#cbd5e1', strokeWidth: 1, opacity: 0.85 }
                    : { stroke: '#dde3ec', strokeWidth: 0.8, opacity: 0.7 };
                  return (
                    <path key={p.id} d={p.svg_path} fill="none"
                      stroke={style.stroke} strokeWidth={style.strokeWidth} opacity={style.opacity} />
                  );
                })}

                {/* ── Layer 3: Zone heatmap fills + labels ── */}
                {filteredZones.map(z => {
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
                      <path d={d} fill={isSelected ? cfg.fillSelected : cfg.fill}
                        stroke={cfg.stroke} strokeWidth={isSelected ? 2.5 : 1.5}
                        className="transition-all hover:opacity-90" />
                      <text x={cx} y={cy - 10} fontSize="11" fill={cfg.stroke} fontWeight="bold" textAnchor="middle" pointerEvents="none">{z.name}</text>
                      <text x={cx} y={cy + 6} fontSize="13" fill={cfg.stroke} fontWeight="bold" textAnchor="middle" pointerEvents="none">{pct.toFixed(0)}%</text>
                      {occ && (
                        <text x={cx} y={cy + 20} fontSize="10" fill={cfg.stroke} textAnchor="middle" pointerEvents="none" opacity="0.85">
                          {occ.devices}p / {z.capacity}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* ── Layer 4: Live device positions (glide on each update) ── */}
                {allDevices.map((d, i) => (
                  <g key={i}
                    onMouseEnter={() => setTooltip({ x: d.x_svg, y: d.y_svg, text: d.zone_name || 'In transit' })}
                    onMouseLeave={() => setTooltip(null)}
                    className="cursor-crosshair"
                  >
                    <circle cx={d.x_svg} cy={d.y_svg} r="7" fill="rgba(29,78,216,0.18)" style={{ transition: 'cx 0.9s ease, cy 0.9s ease' }} />
                    <circle cx={d.x_svg} cy={d.y_svg} r="3.5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="0.8" style={{ transition: 'cx 0.9s ease, cy 0.9s ease' }} />
                  </g>
                ))}

                {/* ── Layer 5: AP markers ── */}
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
                  <g pointerEvents="none">
                    <rect x={tooltip.x + 10} y={tooltip.y - 22} width="110" height="22" rx="5" fill="rgba(0,7,27,0.88)" />
                    <text x={tooltip.x + 65} y={tooltip.y - 7} fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">
                      {tooltip.text}
                    </text>
                  </g>
                )}
              </g>
            </svg>
          )}

          {/* Zoom controls (mouse scroll/drag also work) */}
          <div className="absolute bottom-6 left-6 flex flex-col gap-2">
            <button onClick={() => zoomAround(vw / 2, vh / 2, 1.2)} className="w-12 h-12 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all text-primary">
              <ZoomIn className="w-5 h-5" />
            </button>
            <button onClick={() => zoomAround(vw / 2, vh / 2, 1 / 1.2)} className="w-12 h-12 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all text-primary">
              <ZoomOut className="w-5 h-5" />
            </button>
            <button onClick={resetView} title="Reset view" className="w-12 h-12 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all text-primary mt-2">
              <Compass className="w-5 h-5" />
            </button>
          </div>

          {/* Occupancy legend */}
          <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur border border-slate-100 rounded-xl p-3 shadow-sm text-[10px] font-mono space-y-1.5">
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
            <div className="flex items-center gap-2 pt-1.5 mt-1 border-t border-slate-100">
              <span className="w-3 h-3 rounded-full bg-[#1d4ed8] border border-white shadow" />
              <span className="text-slate-500">Live device</span>
            </div>
          </div>
        </div>

        {/* Right Status Panel */}
        <div className="h-full w-80 bg-white/95 backdrop-blur border-l border-slate-100 flex flex-col p-6 z-20 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-primary">Zone Status</h3>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isLive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {isLive ? 'LIVE' : 'NO DATA'}
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
            { label: 'Total Occupants', val: liveForArea?.total_devices ?? 0 },
            { label: 'Busiest Zone',    val: liveForArea?.most_crowded || '—', colored: true },
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
