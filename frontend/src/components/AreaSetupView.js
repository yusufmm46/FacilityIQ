import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, CheckCircle2, AlertTriangle, Wifi, Trash2, X, Edit2, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';

const ZONE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const STEPS = ['Upload DXF', 'Draw Zones', 'Go Live'];

function StepIndicator({ step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              i < step ? 'bg-status-success text-white' :
              i === step ? 'bg-secondary text-white shadow-lg' :
              'bg-slate-100 text-slate-400'
            }`}>
              {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`font-sans text-xs font-semibold ${i === step ? 'text-primary' : 'text-slate-400'}`}>{s}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < step ? 'bg-status-success' : 'bg-slate-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── STEP 1: DXF UPLOAD ────────────────────────────────────────────
function Step1DXF({ areas, selectedAreaId, setSelectedAreaId, onDone }) {
  const { uploadDXF, dxfData, isLoading } = useApp();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.dxf')) setFile(f);
  };

  const handleUpload = async () => {
    if (!file || !selectedAreaId) return;
    await uploadDXF(file, selectedAreaId);
  };

  return (
    <div className="space-y-6">
      {/* Area selector */}
      <div className="glass-card p-5 rounded-2xl border border-slate-100">
        <label className="font-mono text-[9px] uppercase font-bold text-slate-400 block mb-2">Select Area</label>
        <select
          value={selectedAreaId || ''}
          onChange={e => setSelectedAreaId(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold py-2.5 px-4 outline-none focus:border-secondary"
        >
          <option value="">-- Choose an area --</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {selectedAreaId && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Area name <strong>"{areas.find(a => a.id === selectedAreaId)?.name}"</strong> must exactly match the{' '}
              <code className="bg-amber-100 px-1 rounded">area_name</code> your Wi-Fi controller sends (case-sensitive).
            </p>
          </div>
        )}
      </div>

      {/* DXF Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          dragging ? 'border-secondary bg-teal-50' : 'border-slate-200 hover:border-secondary hover:bg-slate-50'
        }`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".dxf" className="hidden" onChange={e => setFile(e.target.files[0])} />
        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        {file ? (
          <div>
            <p className="font-bold text-primary text-sm">{file.name}</p>
            <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="font-bold text-primary text-sm">Drop your DXF file here</p>
            <p className="text-xs text-slate-400 mt-1">or click to browse — accepts .dxf only</p>
          </div>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || !selectedAreaId || isLoading}
        className="w-full py-3 bg-secondary disabled:opacity-40 hover:opacity-90 text-white font-bold text-sm rounded-full shadow-lg transition-all"
      >
        {isLoading ? 'Parsing CAD file...' : 'Parse DXF File'}
      </button>

      {/* Parse Result */}
      {dxfData && (
        <div className="glass-card p-5 rounded-2xl border border-slate-100 space-y-4">
          <h4 className="font-display font-bold text-primary">Parse Results</h4>

          {/* Core stats */}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Floor Dimensions" value={`${dxfData.floor_boundary?.width_m?.toFixed(1)}m × ${dxfData.floor_boundary?.height_m?.toFixed(1)}m`} />
            <Stat label="Floor Area" value={`${dxfData.coverage?.floor_area_m2 ?? '—'} m²`} />
            <Stat label="Access Points" value={dxfData.access_points?.length || 0} />
            <Stat label="CAD Lines" value={dxfData.polylines?.length || 0} />
            <Stat label="DXF Units" value={dxfData.unit_name || '—'} />
            <Stat label="Layers" value={dxfData.layers?.length || 0} />
          </div>

          {/* AP Coverage Analysis */}
          {dxfData.coverage && (
            <div className="space-y-2">
              <p className="font-mono text-[9px] uppercase font-bold text-slate-400">AP Coverage Analysis</p>
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
                {/* Coverage bar */}
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-slate-500">Est. Coverage</span>
                  <span className={
                    dxfData.coverage.coverage_rating === 'Excellent' ? 'text-green-600' :
                    dxfData.coverage.coverage_rating === 'Good'      ? 'text-teal-600' :
                    dxfData.coverage.coverage_rating === 'Fair'      ? 'text-amber-600' : 'text-red-600'
                  }>
                    {dxfData.coverage.estimated_coverage_pct}% — {dxfData.coverage.coverage_rating}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${dxfData.coverage.estimated_coverage_pct}%`,
                    background: dxfData.coverage.coverage_rating === 'Excellent' ? '#16a34a' :
                                dxfData.coverage.coverage_rating === 'Good'      ? '#006a61' :
                                dxfData.coverage.coverage_rating === 'Fair'      ? '#d97706' : '#dc2626'
                  }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>{dxfData.coverage.ap_count} APs × {dxfData.coverage.ap_radius_m}m radius</span>
                  <span>Recommended: {dxfData.coverage.recommended_ap_count} APs</span>
                </div>

                {/* APs outside boundary */}
                {dxfData.coverage.aps_outside_boundary?.length > 0 && (
                  <div className="flex gap-2 p-2 bg-red-50 rounded-lg mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-red-700 font-mono">
                      Outside boundary: {dxfData.coverage.aps_outside_boundary.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AP list */}
          {dxfData.access_points?.length > 0 && (
            <div>
              <p className="font-mono text-[9px] uppercase font-bold text-slate-400 mb-2">Access Points Detected</p>
              <div className="flex flex-wrap gap-2">
                {dxfData.access_points.map(ap => (
                  <span key={ap.ap_id} className="px-2.5 py-1 bg-teal-50 border border-teal-100 text-secondary text-xs font-mono font-bold rounded-full">
                    {ap.ap_id} ({ap.x_m.toFixed(1)},{ap.y_m.toFixed(1)})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {dxfData.warnings?.map((w, i) => (
            <div key={i} className="flex gap-2 p-2 bg-amber-50 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">{w}</p>
            </div>
          ))}

          <button onClick={onDone} className="w-full py-2.5 bg-secondary text-white font-bold text-sm rounded-full hover:opacity-90 transition-all">
            Proceed to Zone Drawing →
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-3 bg-slate-50 rounded-xl">
      <p className="font-mono text-[9px] uppercase text-slate-400 font-bold">{label}</p>
      <p className="font-display font-bold text-primary text-lg mt-1">{value}</p>
    </div>
  );
}

// ── STEP 2: ZONE DRAWING ──────────────────────────────────────────
function Step2Zones({ selectedAreaId, onDone }) {
  const { dxfData, zones, createZone, deleteZone, selectedArea } = useApp();
  const svgRef = useRef();
  const [tool, setTool] = useState('select'); // 'draw' | 'polyline' | 'select'
  const [drawPoints, setDrawPoints] = useState([]);
  const [hoverPt, setHoverPt] = useState(null);
  const [selectedPolylines, setSelectedPolylines] = useState([]);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneCapacity, setZoneCapacity] = useState(10);
  const [zoneColor, setZoneColor] = useState(ZONE_COLORS[0]);

  const fb = dxfData?.floor_boundary;
  const polylines = dxfData?.polylines || [];
  const aps = dxfData?.access_points || [];
  const vw = 1000, vh = 600;
  const scale = dxfData?.scale || 1;
  const offsetX = dxfData?.offset_x || 0;
  const offsetY = dxfData?.offset_y || 0;

  const metersToSvg = useCallback((x_m, y_m) => {
    const width_m = fb?.width_m || 30;
    const height_m = fb?.height_m || 20;
    const sc = Math.min(vw / width_m, vh / height_m);
    const ox = (vw - width_m * sc) / 2;
    const oy = (vh - height_m * sc) / 2;
    return [x_m * sc + ox, (height_m - y_m) * sc + oy];
  }, [fb]);

  const svgToMeters = useCallback((sx, sy) => {
    const width_m = fb?.width_m || 30;
    const height_m = fb?.height_m || 20;
    const sc = Math.min(vw / width_m, vh / height_m);
    const ox = (vw - width_m * sc) / 2;
    const oy = (vh - height_m * sc) / 2;
    return [(sx - ox) / sc, height_m - (sy - oy) / sc];
  }, [fb]);

  const getSvgPoint = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = vw / rect.width;
    const scaleY = vh / rect.height;
    return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
  };

  const handleSvgClick = (e) => {
    if (tool !== 'draw') return;
    const [sx, sy] = getSvgPoint(e);
    // Check close to first point
    if (drawPoints.length >= 3) {
      const [fx, fy] = drawPoints[0];
      if (Math.hypot(sx - fx, sy - fy) < 15) {
        // Close polygon
        const mPts = drawPoints.map(([px, py]) => svgToMeters(px, py));
        const area_sqm = shoelaceArea(mPts);
        const cap = Math.max(1, Math.round(Math.abs(area_sqm) / 2));
        setPendingPolygon(drawPoints);
        setZoneCapacity(cap);
        setZoneName('');
        setShowZoneModal(true);
        return;
      }
    }
    setDrawPoints(prev => [...prev, [sx, sy]]);
  };

  const handleSvgMouseMove = (e) => {
    if (tool !== 'draw') return;
    const [sx, sy] = getSvgPoint(e);
    setHoverPt([sx, sy]);
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { setTool('select'); setDrawPoints([]); setHoverPt(null); }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const togglePolylineSelection = (id) => {
    setSelectedPolylines(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreateFromPolylines = () => {
    if (selectedPolylines.length === 0) return;
    const selected = polylines.filter(p => selectedPolylines.includes(p.id));
    // Use all points from first polyline as the zone polygon
    const allPts = selected[0]?.points_m || [];
    if (allPts.length < 3) return;
    const area_sqm = shoelaceArea(allPts);
    const cap = Math.max(1, Math.round(Math.abs(area_sqm) / 2));
    const svgPts = allPts.map(([x, y]) => metersToSvg(x, y));
    setPendingPolygon(svgPts);
    setZoneCapacity(cap);
    setZoneName('');
    setShowZoneModal(true);
  };

  const handleSaveZone = async () => {
    if (!zoneName || !pendingPolygon) return;
    const mPts = pendingPolygon.map(([sx, sy]) => svgToMeters(sx, sy));
    await createZone({
      area_id: selectedAreaId,
      name: zoneName,
      capacity: zoneCapacity,
      polygon_json: mPts,
      color: zoneColor,
      method: selectedPolylines.length > 0 ? 'cad_polyline' : 'freehand',
    });
    setShowZoneModal(false);
    setPendingPolygon(null);
    setDrawPoints([]);
    setSelectedPolylines([]);
    setTool('select');
  };

  const ptsToPath = (pts) => {
    if (!pts || pts.length < 2) return '';
    return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x},${y}`).join(' ') + ' Z';
  };

  const zonePolygonSvg = (zone) => {
    const width_m = fb?.width_m || 30;
    const height_m = fb?.height_m || 20;
    const poly = zone.polygon_json;
    if (!poly || poly.length < 3) return '';
    const pts = poly.map(([x, y]) => metersToSvg(x, y));
    return ptsToPath(pts);
  };

  const colorWithAlpha = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
          {[
            { id: 'draw', label: '✏ Draw Zone' },
            { id: 'polyline', label: '⬡ Select Polyline' },
            { id: 'select', label: '↖ Select' },
          ].map(t => (
            <button key={t.id} onClick={() => { setTool(t.id); setDrawPoints([]); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${tool === t.id ? 'bg-secondary text-white shadow' : 'text-slate-500 hover:text-secondary'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tool === 'draw' && <span className="text-xs text-slate-500">Click to place points · Click near start to close · Esc to cancel</span>}
        {tool === 'polyline' && selectedPolylines.length > 0 && (
          <button onClick={handleCreateFromPolylines} className="px-4 py-2 bg-secondary text-white text-xs font-bold rounded-full hover:opacity-90 transition-all">
            Create Zone from {selectedPolylines.length} Polyline{selectedPolylines.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* SVG Floor Plan */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-100">
        {!fb ? (
          <div className="h-64 flex items-center justify-center text-slate-400">
            <p className="text-sm">Upload a DXF file first to see the floor plan</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${vw} ${vh}`}
            className={`w-full ${tool === 'draw' ? 'cursor-crosshair' : 'cursor-default'}`}
            onClick={handleSvgClick}
            onMouseMove={handleSvgMouseMove}
            style={{ maxHeight: '500px' }}
          >
            {/* Floor boundary */}
            <path d={fb.svg_path} fill="rgba(219,234,254,0.5)" stroke="#93c5fd" strokeWidth="2" />

            {/* CAD geometry — walls solid, furniture lighter.
                In "polyline" tool mode only structural walls are selectable. */}
            {polylines.map(p => {
              const cat = p.category || 'detail';
              const isStructural = cat === 'structural';
              const isSelected = selectedPolylines.includes(p.id);
              const selectable = tool === 'polyline' && isStructural;
              const baseStroke = isStructural ? '#94a3b8' : cat === 'furniture' ? '#cbd5e1' : '#dde3ec';
              const baseWidth  = isStructural ? 1.5 : 1;
              return (
                <path
                  key={p.id}
                  d={p.svg_path}
                  fill={isSelected ? 'rgba(59,130,246,0.15)' : 'transparent'}
                  stroke={isSelected ? '#3B82F6' : baseStroke}
                  strokeWidth={isSelected ? 2 : baseWidth}
                  strokeDasharray={isSelected ? '6,3' : ''}
                  opacity={cat === 'detail' ? 0.7 : 1}
                  className={selectable ? 'cursor-pointer hover:stroke-blue-500' : ''}
                  onClick={(e) => { if (selectable) { e.stopPropagation(); togglePolylineSelection(p.id); } }}
                />
              );
            })}

            {/* Existing zones */}
            {zones.map(z => (
              <g key={z.id}>
                <path d={zonePolygonSvg(z)} fill={colorWithAlpha(z.color, 0.25)} stroke={z.color} strokeWidth="2" />
                <text
                  x={getPolygonCentroid(z.polygon_json?.map(([x, y]) => metersToSvg(x, y)) || [])[0]}
                  y={getPolygonCentroid(z.polygon_json?.map(([x, y]) => metersToSvg(x, y)) || [])[1]}
                  fontSize="12" fill={z.color} fontWeight="bold" textAnchor="middle" dominantBaseline="middle" pointerEvents="none"
                >
                  {z.name}
                </text>
              </g>
            ))}

            {/* Drawing preview */}
            {drawPoints.length > 0 && (
              <g>
                {drawPoints.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="5" fill="#0d9488" stroke="white" strokeWidth="2" />
                ))}
                {drawPoints.length >= 2 && (
                  <polyline
                    points={[...drawPoints, hoverPt || drawPoints[drawPoints.length - 1]].map(([x, y]) => `${x},${y}`).join(' ')}
                    fill="rgba(13,148,136,0.1)" stroke="#0d9488" strokeWidth="2" strokeDasharray="6,3"
                  />
                )}
                {hoverPt && (
                  <circle cx={hoverPt[0]} cy={hoverPt[1]} r="4" fill="rgba(13,148,136,0.5)" stroke="#0d9488" strokeWidth="2" />
                )}
                {/* Close hint circle */}
                {drawPoints.length >= 3 && (
                  <circle cx={drawPoints[0][0]} cy={drawPoints[0][1]} r="12" fill="rgba(13,148,136,0.2)" stroke="#0d9488" strokeDasharray="4,2" />
                )}
              </g>
            )}

            {/* AP Markers */}
            {aps.map(ap => (
              <g key={ap.ap_id} transform={`translate(${ap.x_svg},${ap.y_svg})`}>
                <circle cx="0" cy="0" r="12" fill="rgba(13,148,136,0.15)" />
                <circle cx="0" cy="0" r="5" fill="#006a61" />
                <text x="0" y="-14" fontSize="9" fill="#006a61" fontWeight="bold" textAnchor="middle">{ap.ap_id}</text>
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* Zone list */}
      {zones.length > 0 && (
        <div className="glass-card p-4 rounded-2xl border border-slate-100">
          <h4 className="font-display font-bold text-primary mb-3 text-sm">Zones ({zones.length})</h4>
          <div className="space-y-2">
            {zones.map(z => (
              <div key={z.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-4 h-4 rounded-full shrink-0" style={{ background: z.color }} />
                <span className="font-sans font-semibold text-sm text-primary flex-1">{z.name}</span>
                <span className="font-mono text-xs text-slate-400">Cap: {z.capacity}</span>
                <button onClick={() => deleteZone(z.id)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-error transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onDone} className="w-full py-3 bg-secondary text-white font-bold text-sm rounded-full hover:opacity-90 transition-all">
        Proceed to Go Live →
      </button>

      {/* Zone Name Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-primary">Name this Zone</h3>
              <button onClick={() => { setShowZoneModal(false); setPendingPolygon(null); }} className="text-slate-400 hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Zone Name *</label>
                <input value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder="Dining Area A"
                  className="bg-slate-50 border border-slate-200 focus:border-secondary rounded-xl text-sm font-semibold py-2.5 px-4 outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Capacity (people)</label>
                <input type="number" value={zoneCapacity} onChange={e => setZoneCapacity(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold py-2.5 px-4 outline-none" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Color</label>
                <div className="flex gap-2">
                  {ZONE_COLORS.map(c => (
                    <button key={c} onClick={() => setZoneColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${zoneColor === c ? 'border-primary scale-110' : 'border-transparent'}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <button onClick={handleSaveZone} disabled={!zoneName}
                className="w-full py-2.5 bg-secondary disabled:opacity-40 text-white font-bold text-sm rounded-full hover:opacity-90 transition-all">
                Save Zone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getPolygonCentroid(pts) {
  if (!pts || pts.length === 0) return [0, 0];
  const cx = pts.reduce((s, [x]) => s + x, 0) / pts.length;
  const cy = pts.reduce((s, [, y]) => s + y, 0) / pts.length;
  return [cx, cy];
}

function shoelaceArea(pts) {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i][0] * pts[j][1];
    area -= pts[j][0] * pts[i][1];
  }
  return area / 2;
}

// ── STEP 3: GO LIVE ───────────────────────────────────────────────
function Step3GoLive({ selectedAreaId, areas, onDone }) {
  const area = areas.find(a => a.id === selectedAreaId);
  const areaName = area?.name;
  const apCount = area?.access_points?.length ?? area?.dxf_parsed_data?.access_points?.length ?? 0;
  const zoneCount = area?.zones?.length ?? 0;
  const ready = apCount > 0 && zoneCount > 0;

  return (
    <div className="space-y-5">
      {/* Readiness checklist */}
      <div className="glass-card p-5 rounded-2xl border border-slate-100 space-y-3">
        <h4 className="font-display font-bold text-primary">Ready to go live</h4>
        <div className="space-y-2">
          {[
            ['Floor plan uploaded (DXF)', !!area?.dxf_parsed_data],
            [`Access points detected (${apCount})`, apCount > 0],
            [`Zones drawn (${zoneCount})`, zoneCount > 0],
          ].map(([label, ok]) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${ok ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                {ok ? '✓' : '•'}
              </span>
              <span className={ok ? 'text-on-surface' : 'text-slate-400'}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live streaming explainer */}
      <div className="glass-card p-5 rounded-2xl border border-green-200 bg-green-50 space-y-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <p className="font-sans font-bold text-green-800 text-sm">Occupancy streams in automatically</p>
        </div>
        <p className="text-xs text-green-700 leading-relaxed">
          <strong>{areaName}</strong> now receives live RSSI data from your Wi-Fi controller
          (or the simulator) at <code>/api/stream/ingest</code>. The floor plan updates every
          30 seconds — no manual uploads needed.
        </p>
        <button onClick={onDone} disabled={!ready}
          className="w-full py-2.5 bg-secondary disabled:opacity-40 text-white font-bold text-sm rounded-full hover:opacity-90 transition-all">
          {ready ? 'View Live Floor Plan →' : 'Finish setup above to go live'}
        </button>
      </div>
    </div>
  );
}

// ── MAIN AREA SETUP VIEW ──────────────────────────────────────────
export default function AreaSetupView({ onViewChange }) {
  const { areas, loadBuildings, loadFloors, loadAreas, buildings, floors, dxfData } = useApp();
  const [step, setStep] = useState(0);
  const [selectedAreaId, setSelectedAreaId] = useState('');

  // Load all areas on mount
  useEffect(() => {
    const load = async () => {
      const bs = await loadBuildings();
      for (const b of bs) {
        const fs = await loadFloors(b.id);
        for (const f of fs) await loadAreas(f.id);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto font-sans">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-primary">Area Setup</h2>
        <p className="font-sans text-sm text-on-surface-variant mt-1">Upload DXF, draw zones, then import your RSSI data</p>
      </div>

      <StepIndicator step={step} />

      {step === 0 && (
        <Step1DXF
          areas={areas}
          selectedAreaId={selectedAreaId}
          setSelectedAreaId={setSelectedAreaId}
          onDone={() => setStep(1)}
        />
      )}
      {step === 1 && (
        <Step2Zones
          selectedAreaId={selectedAreaId}
          onDone={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <Step3GoLive
          selectedAreaId={selectedAreaId}
          areas={areas}
          onDone={() => onViewChange?.('floor-plan')}
        />
      )}

      {/* Step nav */}
      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-primary font-bold text-sm rounded-full transition-all">
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
