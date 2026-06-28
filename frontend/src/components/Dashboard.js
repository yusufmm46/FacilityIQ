import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const API = 'http://127.0.0.1:8000';

// ── DESIGN TOKENS ─────────────────────────────────────────────
const T = {
  navy: '#0F1F3D', blue: '#1D4ED8', teal: '#0D9488',
  green: '#16A34A', red: '#DC2626', amber: '#D97706', purple: '#7C3AED',
  border: '#E2E8F0', muted: '#64748B', text: '#0F172A',
  surface: '#F8FAFF',
};
const PALETTE = ['#3B82F6','#8B5CF6','#0D9488','#F59E0B','#EF4444','#EC4899','#10B981','#F97316'];

// ── LOCALSTORAGE ──────────────────────────────────────────────
const LS_KEY = 'facilityiq_areas_v2';
function loadAreas() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveAreas(areas) {
  localStorage.setItem(LS_KEY, JSON.stringify(areas));
}

// ── HELPERS ───────────────────────────────────────────────────
function occupancyStatus(pct) {
  if (pct >= 80) return { label: 'Critical', color: T.red,    bg: '#FEF2F2', dot: '🔴' };
  if (pct >= 60) return { label: 'Busy',     color: T.amber,  bg: '#FFFBEB', dot: '🟡' };
  if (pct >= 30) return { label: 'Moderate', color: T.teal,   bg: '#F0FDFA', dot: '🟢' };
  return           { label: 'Quiet',    color: T.muted,  bg: '#F8FAFC', dot: '⚪' };
}

function normalize(str) { return (str || '').trim().toLowerCase(); }

const MARKER_R = 18; // px radius for zone markers

// ══════════════════════════════════════════════════════════════
// ADD AREA WIZARD  (3 steps)
// ══════════════════════════════════════════════════════════════
function AddAreaWizard({ onClose, onSave }) {
  const [step, setStep]         = useState(1);
  const [areaName, setAreaName] = useState('');
  const [icon, setIcon]         = useState('🏢');
  const [capacity, setCapacity] = useState(50);
  const [imgSrc, setImgSrc]     = useState(null);
  const [imgSize, setImgSize]   = useState({ w: 1, h: 1 });
  const [markers, setMarkers]   = useState([]);   // [{id,x%,y%,label,capacity,color}]
  const [editing, setEditing]   = useState(null); // marker id being named
  const [tmpLabel, setTmpLabel] = useState('');
  const [tmpCap, setTmpCap]     = useState(10);
  const imgRef = useRef(null);
  const icons = ['🏢','🍽','🤝','🏋','📚','☕','🛒','🔬','🖥','🎯','🏨','🏪'];

  // image drop
  const onDrop = useCallback(files => {
    const url = URL.createObjectURL(files[0]);
    setImgSrc(url);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 1
  });

  // click on image → place marker
  function handleImgClick(e) {
    const rect = imgRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width)  * 100;
    const yPct = ((e.clientY - rect.top)  / rect.height) * 100;
    const id   = Date.now();
    const color = PALETTE[markers.length % PALETTE.length];
    setMarkers(prev => [...prev, { id, xPct, yPct, label: '', capacity: 10, color }]);
    setEditing(id);
    setTmpLabel(`Zone ${markers.length + 1}`);
    setTmpCap(10);
  }

  function confirmMarker() {
    if (!tmpLabel.trim()) return;
    setMarkers(prev => prev.map(m =>
      m.id === editing ? { ...m, label: tmpLabel.trim(), capacity: Number(tmpCap) } : m
    ));
    setEditing(null);
  }

  function removeMarker(id) {
    setMarkers(prev => prev.filter(m => m.id !== id));
    if (editing === id) setEditing(null);
  }

  function handleSave() {
    if (!areaName.trim() || markers.length === 0) return;
    const area = {
      id: Date.now().toString(),
      name: areaName.trim(),
      icon,
      capacity: Number(capacity),
      imgSrc,
      markers: markers.filter(m => m.label),
      csvData: null,
      createdAt: new Date().toISOString(),
    };
    onSave(area);
    onClose();
  }

  // ── STEP 1: name + icon ──────────────────────────────────────
  const step1 = (
    <div>
      <h3 style={sh}>Step 1 — Name your area</h3>
      <label style={lbl}>Area Name <span style={{ color: T.red }}>*</span></label>
      <input value={areaName} onChange={e => setAreaName(e.target.value)}
        placeholder="e.g. Cafeteria, Reception Lobby, Meeting Room A"
        style={inp} autoFocus />
      <p style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
        ⚠️ This name must <b>exactly match</b> the <code>area_name</code> column in your CSV file.
      </p>

      <label style={lbl}>Icon</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {icons.map(ic => (
          <button key={ic} onClick={() => setIcon(ic)}
            style={{ fontSize: 22, padding: 8, borderRadius: 8, border: `2px solid ${icon === ic ? T.blue : T.border}`, background: icon === ic ? '#EFF6FF' : 'white', cursor: 'pointer' }}>
            {ic}
          </button>
        ))}
      </div>

      <label style={lbl}>Total Capacity (people)</label>
      <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} style={inp} />

      <button onClick={() => areaName.trim() && setStep(2)} disabled={!areaName.trim()}
        style={btn(!!areaName.trim())}>
        Next: Upload Floor Plan →
      </button>
    </div>
  );

  // ── STEP 2: floor plan image ─────────────────────────────────
  const step2 = (
    <div>
      <h3 style={sh}>Step 2 — Upload floor plan for "{areaName}"</h3>
      {!imgSrc ? (
        <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? T.blue : T.border}`, borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer', background: isDragActive ? '#EFF6FF' : T.surface, marginBottom: 16 }}>
          <input {...getInputProps()} />
          <div style={{ fontSize: 40, marginBottom: 10 }}>🗺</div>
          <p style={{ fontWeight: 600, color: T.text }}>Drag & drop your floor plan image</p>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>PNG, JPG, or any image format</p>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <img src={imgSrc} alt="preview" style={{ width: '100%', borderRadius: 8, border: `1px solid ${T.border}`, maxHeight: 220, objectFit: 'contain' }} />
          <button onClick={() => setImgSrc(null)} style={{ marginTop: 8, fontSize: 12, color: T.red, background: 'none', border: 'none', cursor: 'pointer' }}>✕ Remove image</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => setStep(1)} style={btnOutline}>← Back</button>
        <button onClick={() => setStep(3)} style={btn(true)}>
          {imgSrc ? 'Next: Add Zones →' : 'Skip (add zones without image) →'}
        </button>
      </div>
    </div>
  );

  // ── STEP 3: click to place zone markers ──────────────────────
  const step3 = (
    <div>
      <h3 style={sh}>Step 3 — Click on the floor plan to add zones</h3>
      <p style={{ fontSize: 13, color: T.muted, marginBottom: 12 }}>
        Click anywhere on the image to place a zone marker. Then name it and set its capacity.
      </p>

      {/* Image with markers */}
      <div style={{ position: 'relative', marginBottom: 12, cursor: 'crosshair', userSelect: 'none' }}>
        {imgSrc ? (
          <img ref={imgRef} src={imgSrc} alt="floor plan"
            onClick={editing ? undefined : handleImgClick}
            style={{ width: '100%', borderRadius: 8, border: `2px solid ${T.blue}`, display: 'block', maxHeight: 280, objectFit: 'contain' }}
            onLoad={e => setImgSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })} />
        ) : (
          <div ref={imgRef} onClick={editing ? undefined : handleImgClick}
            style={{ width: '100%', height: 240, background: '#EFF6FF', borderRadius: 8, border: `2px dashed ${T.blue}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <span style={{ fontSize: 32, marginBottom: 8 }}>🏗</span>
            <p style={{ color: T.muted, fontSize: 13 }}>Click to place zone markers</p>
          </div>
        )}

        {/* Markers */}
        {markers.map((m, idx) => (
          <div key={m.id} style={{
            position: 'absolute',
            left: `${m.xPct}%`, top: `${m.yPct}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}>
            {/* Circle */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: m.label ? m.color : '#94A3B8',
              border: `3px solid white`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer',
            }} onClick={e => { e.stopPropagation(); setEditing(m.id); setTmpLabel(m.label || `Zone ${idx+1}`); setTmpCap(m.capacity); }}>
              {idx + 1}
            </div>
            {/* Label */}
            {m.label && (
              <div style={{ position: 'absolute', top: 34, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', background: 'rgba(15,31,61,0.85)', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 4, pointerEvents: 'none' }}>
                {m.label} ({m.capacity})
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Inline marker editor */}
      {editing && (
        <div style={{ background: '#F0F9FF', border: `1px solid ${T.blue}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: T.blue, marginBottom: 8 }}>
            📍 Name this zone
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={tmpLabel} onChange={e => setTmpLabel(e.target.value)}
              placeholder="Zone name (e.g. Dining Area)" style={{ ...inp, flex: 2, margin: 0 }}
              onKeyDown={e => e.key === 'Enter' && confirmMarker()} autoFocus />
            <input type="number" value={tmpCap} onChange={e => setTmpCap(e.target.value)}
              placeholder="Capacity" style={{ ...inp, flex: 1, margin: 0 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={confirmMarker} style={btn(true, 12)}>✅ Confirm</button>
            <button onClick={() => removeMarker(editing)} style={{ ...btnOutline, fontSize: 12, color: T.red, borderColor: T.red }}>🗑 Remove</button>
          </div>
        </div>
      )}

      {/* Zone list */}
      {markers.filter(m => m.label).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 }}>ZONES ADDED</p>
          {markers.filter(m => m.label).map((m, i) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: m.color }} />
              <span style={{ fontSize: 13, flex: 1 }}>{m.label}</span>
              <span style={{ fontSize: 12, color: T.muted }}>Capacity: {m.capacity}</span>
              <button onClick={() => removeMarker(m.id)} style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => setStep(2)} style={btnOutline}>← Back</button>
        <button onClick={handleSave} disabled={markers.filter(m => m.label).length === 0}
          style={btn(markers.filter(m => m.label).length > 0)}>
          ✅ Save Area to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 32, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: T.navy }}>➕ Add New Area</h2>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {[1,2,3].map(s => (
                <div key={s} style={{ width: 28, height: 4, borderRadius: 2, background: step >= s ? T.blue : T.border, transition: 'background 0.3s' }} />
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: T.muted }}>✕</button>
        </div>

        {step === 1 && step1}
        {step === 2 && step2}
        {step === 3 && step3}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CSV UPLOAD MODAL (per area)
// ══════════════════════════════════════════════════════════════
function CsvUploadModal({ area, onClose, onDataLoaded }) {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [result, setResult]   = useState(null);

  const onDrop = useCallback(f => { if (f[0]) { setFile(f[0]); setError(''); } }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'] }, maxFiles: 1
  });

  async function handleUpload() {
    setLoading(true); setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('area_name', area.name);
      const res = await axios.post(`${API}/upload`, form);
      const [occRes, devRes] = await Promise.all([
        axios.get(`${API}/occupancy`),
        axios.get(`${API}/devices`),
      ]);
      // Filter only this area's data
      const areaDevices = (devRes.data.devices || []).filter(
        d => normalize(d.area_name) === normalize(area.name)
      );
      const areaZones = (occRes.data.zones || []);
      setResult({ devices: areaDevices, zones: areaZones, summary: res.data });
      onDataLoaded(area.id, { devices: areaDevices, zones: areaZones, summary: res.data });
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed. Check API is running.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 32, width: '100%', maxWidth: 500, boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: T.navy }}>📂 Upload CSV for {area.icon} {area.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: T.muted }}>✕</button>
        </div>

        <div style={{ padding: 12, background: '#FFF7ED', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#92400E' }}>
          ⚠️ The <code>area_name</code> column in your CSV must exactly match: <b>"{area.name}"</b>
        </div>

        <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? T.blue : T.border}`, borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer', background: isDragActive ? '#EFF6FF' : T.surface, marginBottom: 14 }}>
          <input {...getInputProps()} />
          <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
          <p style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{isDragActive ? 'Drop it!' : 'Drag & drop CSV file'}</p>
          <p style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>or click to browse</p>
        </div>

        {file && <div style={{ padding: '8px 12px', background: '#F0FDF4', borderRadius: 8, marginBottom: 10, fontSize: 13, fontWeight: 600, color: T.green }}>✅ {file.name}</div>}
        {error && <div style={{ padding: '8px 12px', background: '#FEF2F2', borderRadius: 8, marginBottom: 10, fontSize: 13, color: T.red }}>❌ {error}</div>}

        {result && (
          <div style={{ padding: 12, background: '#F0FDF4', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
            ✅ <b>{result.devices.length}</b> devices detected for this area
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={btnOutline}>Close</button>
          <button onClick={handleUpload} disabled={!file || loading} style={btn(!file || loading ? false : true)}>
            {loading ? '⏳ Processing...' : '🚀 Analyse'}
          </button>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: T.surface, borderRadius: 8, fontSize: 11, color: T.muted }}>
          Required columns: <code>timestamp · mac_address · ap_id · ap_x · ap_y · rssi · area_name</code>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// FLOOR PLAN VIEW  (image + markers with occupancy overlay)
// ══════════════════════════════════════════════════════════════
function FloorPlanView({ area, csvData }) {
  const markers = area.markers || [];
  const devices = csvData?.devices || [];

  // Assign devices to nearest marker
  function nearestMarker(d) {
    if (!markers.length) return null;
    let best = markers[0], bestD = Infinity;
    markers.forEach(m => {
      const dx = d.est_x - m.xPct;
      const dy = d.est_y - m.yPct;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < bestD) { bestD = dist; best = m; }
    });
    return best;
  }

  const markerCounts = {};
  markers.forEach(m => { markerCounts[m.id] = 0; });
  devices.forEach(d => {
    const m = nearestMarker(d);
    if (m) markerCounts[m.id] = (markerCounts[m.id] || 0) + 1;
  });

  return (
    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
      {area.imgSrc ? (
        <img src={area.imgSrc} alt="floor plan"
          style={{ width: '70%', display: 'block', margin: '0 auto', borderRadius: 10, border: `1px solid ${T.border}` }} />
      ) : (
        <div style={{ width: '70%', margin: '0 auto', height: 220, background: '#EFF6FF', borderRadius: 10, border: `2px dashed ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: T.muted, fontSize: 13 }}>No floor plan image uploaded</p>
        </div>
      )}

      {/* Overlay markers */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {markers.filter(m => m.label).map((m, i) => {
          const count = markerCounts[m.id] || 0;
          const pct = Math.round((count / Math.max(m.capacity, 1)) * 100);
          const status = occupancyStatus(pct);
          // Position relative to 70% centered image
          const imgLeft = '15%';
          const imgWidth = '70%';
          return (
            <div key={m.id} style={{
              position: 'absolute',
              left: `calc(${imgLeft} + ${m.xPct}% * 0.7)`,
              top: `${m.yPct}%`,
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: status.color, border: '3px solid white',
                boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 800, fontSize: 13, margin: '0 auto',
              }}>
                {pct}%
              </div>
              <div style={{ background: 'rgba(15,31,61,0.85)', color: 'white', fontSize: 10, padding: '2px 7px', borderRadius: 4, marginTop: 3, whiteSpace: 'nowrap' }}>
                {m.label}: {count} / {m.capacity}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[['⚪ Quiet','< 30%'],['🟢 Moderate','30–60%'],['🟡 Busy','60–80%'],['🔴 Critical','> 80%']].map(([label, range]) => (
          <span key={label} style={{ fontSize: 11, color: T.muted }}>{label} <span style={{ opacity: 0.6 }}>{range}</span></span>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// AREA CARD  (sidebar)
// ══════════════════════════════════════════════════════════════
function AreaCard({ area, csvData, isSelected, onClick }) {
  const devices = csvData?.devices?.length || 0;
  const pct = Math.round((devices / Math.max(area.capacity, 1)) * 100);
  const status = occupancyStatus(pct);
  return (
    <div onClick={onClick} style={{
      background: isSelected ? '#EFF6FF' : 'white',
      border: `2px solid ${isSelected ? T.blue : T.border}`,
      borderRadius: 12, padding: 14, cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: isSelected ? `0 4px 16px ${T.blue}25` : '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{area.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{area.name}</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: status.bg, color: status.color }}>{status.dot} {status.label}</span>
      </div>
      <div style={{ height: 5, background: '#F1F5F9', borderRadius: 3, marginBottom: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: T.blue, borderRadius: 3 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted }}>
        <span>{devices} / {area.capacity} people</span>
        <span style={{ fontWeight: 700, color: T.blue }}>{pct}%</span>
      </div>
      {!csvData && <p style={{ fontSize: 10, color: T.amber, marginTop: 6 }}>📂 No data uploaded yet</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [areas, setAreas]           = useState(() => loadAreas());
  const [csvDataMap, setCsvDataMap] = useState({});        // { areaId: { devices, zones, summary } }
  const [selectedId, setSelectedId] = useState(null);
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [showCsvModal, setShowCsvModal]   = useState(false);
  const [activeTab, setActiveTab]   = useState('floorplan');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Auto-select first area
  useEffect(() => {
    if (!selectedId && areas.length > 0) setSelectedId(areas[0].id);
  }, [areas]);

  function handleSaveArea(area) {
    const updated = [...areas, area];
    setAreas(updated);
    saveAreas(updated);
    setSelectedId(area.id);
  }

  function handleDeleteArea(id) {
    const updated = areas.filter(a => a.id !== id);
    setAreas(updated);
    saveAreas(updated);
    const next = updated[0]?.id || null;
    setSelectedId(next);
    setConfirmDelete(null);
  }

  function handleCsvData(areaId, data) {
    setCsvDataMap(prev => ({ ...prev, [areaId]: data }));
    setShowCsvModal(false);
  }

  const selectedArea  = areas.find(a => a.id === selectedId);
  const selectedCsv   = selectedId ? csvDataMap[selectedId] : null;
  const markers       = selectedArea?.markers?.filter(m => m.label) || [];
  const devices       = selectedCsv?.devices || [];

  // Build zone data for charts from markers + device counts
  const markerZoneData = markers.map((m, i) => {
    const count = devices.filter(d => {
      // nearest marker logic simplified: assign by label match if present
      return true;
    }).length;
    // simple distribution
    const share = devices.length > 0 ? Math.floor(devices.length / markers.length) : 0;
    const extra = i < (devices.length % markers.length) ? 1 : 0;
    const c = share + extra;
    const pct = Math.round((c / Math.max(m.capacity, 1)) * 100);
    return { label: m.label, devices: c, capacity: m.capacity, occupancy_pct: pct, color: m.color };
  });

  const totalDevices  = devices.length;
  const totalCapacity = areas.reduce((s, a) => s + a.capacity, 0);
  const buildingPct   = Math.round((totalDevices / Math.max(selectedArea?.capacity || 1, 1)) * 100);

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FF', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* NAV */}
      <nav style={{ background: `linear-gradient(135deg, ${T.navy}, #1E3A6E)`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>📡</span>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>FacilityIQ</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginLeft: 4 }}>Occupancy Intelligence</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: 8, color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
            🏢 {areas.length} area{areas.length !== 1 ? 's' : ''} configured
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: 8, color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
            📅 {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)' }}>

        {/* SIDEBAR */}
        <aside style={{ width: 260, background: 'white', borderRight: `1px solid ${T.border}`, padding: 18, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Areas</span>
            <button onClick={() => setShowAddWizard(true)}
              style={{ fontSize: 12, padding: '5px 12px', background: `linear-gradient(135deg, ${T.blue}, ${T.teal})`, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
              + Add Area
            </button>
          </div>

          {areas.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: T.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏗</div>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>No areas yet</p>
              <p style={{ fontSize: 12 }}>Click <b>+ Add Area</b> to get started</p>
            </div>
          )}

          {areas.map(area => (
            <AreaCard key={area.id} area={area} csvData={csvDataMap[area.id]}
              isSelected={selectedId === area.id} onClick={() => { setSelectedId(area.id); setActiveTab('floorplan'); }} />
          ))}

          {/* Building total */}
          {areas.length > 0 && (
            <div style={{ marginTop: 'auto', padding: 14, background: `linear-gradient(135deg, ${T.navy}08, ${T.blue}08)`, borderRadius: 10, border: `1px solid ${T.blue}20` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 4 }}>BUILDING TOTAL</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: T.navy }}>
                {Object.values(csvDataMap).reduce((s, d) => s + (d?.devices?.length || 0), 0)}
              </p>
              <p style={{ fontSize: 11, color: T.muted }}>people across all areas</p>
            </div>
          )}
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>

          {/* Empty state */}
          {!selectedArea && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>📡</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: T.navy, marginBottom: 10 }}>Welcome to FacilityIQ</h2>
              <p style={{ fontSize: 15, color: T.muted, maxWidth: 400, marginBottom: 28 }}>
                Start by adding your first building area — upload a floor plan, place zone markers, then load your Wi-Fi sensor data.
              </p>
              <button onClick={() => setShowAddWizard(true)}
                style={{ padding: '14px 32px', background: `linear-gradient(135deg, ${T.blue}, ${T.teal})`, color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(29,78,216,0.3)' }}>
                ➕ Add Your First Area
              </button>
            </div>
          )}

          {selectedArea && (
            <>
              {/* Area header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>{selectedArea.icon}</span> {selectedArea.name}
                  </h1>
                  <p style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>
                    {markers.length} zones · Capacity: {selectedArea.capacity} people
                    {selectedCsv && <span style={{ color: T.green, fontWeight: 600 }}> · ✅ {totalDevices} people detected</span>}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowCsvModal(true)}
                    style={{ padding: '8px 16px', background: selectedCsv ? '#F0FDF4' : `linear-gradient(135deg, ${T.blue}, ${T.teal})`, color: selectedCsv ? T.green : 'white', border: `1px solid ${selectedCsv ? T.green : 'transparent'}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                    {selectedCsv ? '📂 Re-upload CSV' : '📂 Upload CSV Data'}
                  </button>
                  <button onClick={() => setConfirmDelete(selectedArea.id)}
                    style={{ padding: '8px 14px', background: '#FEF2F2', color: T.red, border: `1px solid #FECACA`, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                    🗑 Delete Area
                  </button>
                </div>
              </div>

              {/* Stat cards */}
              {selectedCsv && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
                  {[
                    { label: 'People Now',     value: totalDevices,                  sub: `of ${selectedArea.capacity} capacity`, icon: '👥' },
                    { label: 'Occupancy',       value: `${buildingPct}%`,             sub: occupancyStatus(buildingPct).label,     icon: '📊' },
                    { label: 'Zones',           value: markers.length,                sub: 'configured',                           icon: '📍' },
                    { label: 'Records',         value: selectedCsv.summary?.records_processed || 0, sub: 'RSSI records',           icon: '📡' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: 16, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase' }}>{s.label}</span>
                        <span style={{ fontSize: 18 }}>{s.icon}</span>
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: T.navy, marginBottom: 2 }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>{s.sub}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'white', padding: 4, borderRadius: 10, width: 'fit-content', border: `1px solid ${T.border}` }}>
                {[['floorplan','🗺 Floor Plan'],['zones','📍 Zone Details'],['trends','📈 Trends']].map(([tab, label]) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    style={{ padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab ? 700 : 400, background: activeTab === tab ? `linear-gradient(135deg,${T.blue},${T.teal})` : 'transparent', color: activeTab === tab ? 'white' : T.muted, transition: 'all 0.2s' }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* TAB: Floor Plan */}
              {activeTab === 'floorplan' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 18 }}>
                  <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700 }}>Live Floor Plan</h3>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: selectedCsv ? '#F0FDF4' : '#F8FAFC', color: selectedCsv ? T.green : T.muted }}>
                        {selectedCsv ? '🟢 Data Loaded' : '⚪ No Data'}
                      </span>
                    </div>
                    <FloorPlanView area={selectedArea} csvData={selectedCsv} />
                  </div>

                  <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${T.border}` }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Zone Breakdown</h3>
                    {markers.length === 0 && <p style={{ fontSize: 13, color: T.muted }}>No zones defined yet.</p>}
                    {markerZoneData.map((z, i) => {
                      const status = occupancyStatus(z.occupancy_pct);
                      return (
                        <div key={z.label} style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: z.color }} />
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{z.label}</span>
                            </div>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: status.bg, color: status.color, fontWeight: 600 }}>
                              {status.dot} {z.devices} people
                            </span>
                          </div>
                          <div style={{ height: 10, background: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(z.occupancy_pct, 100)}%`, background: z.color, borderRadius: 5, transition: 'width 0.6s' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted, marginTop: 2 }}>
                            <span>Capacity: {z.capacity}</span>
                            <span style={{ fontWeight: 700, color: z.color }}>{z.occupancy_pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB: Zone Details */}
              {activeTab === 'zones' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                  {markerZoneData.map((z, i) => {
                    const status = occupancyStatus(z.occupancy_pct);
                    return (
                      <div key={z.label} style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${T.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${z.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📍</div>
                          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: status.bg, color: status.color, fontWeight: 700 }}>{status.dot} {status.label}</span>
                        </div>
                        <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{z.label}</h4>
                        <div style={{ fontSize: 32, fontWeight: 800, color: z.color, marginBottom: 2 }}>{z.devices}</div>
                        <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>people detected</div>
                        <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                          <div style={{ height: '100%', width: `${Math.min(z.occupancy_pct,100)}%`, background: z.color, borderRadius: 3 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted }}>
                          <span>Capacity: {z.capacity}</span>
                          <span style={{ fontWeight: 700, color: z.color }}>{z.occupancy_pct}% full</span>
                        </div>
                      </div>
                    );
                  })}
                  {markers.length === 0 && <p style={{ fontSize: 13, color: T.muted, gridColumn: '1/-1' }}>No zones defined yet.</p>}
                </div>
              )}

              {/* TAB: Trends */}
              {activeTab === 'trends' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${T.border}`, gridColumn: '1/-1' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>📊 Zone Distribution</h3>
                    {markerZoneData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={markerZoneData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={v => [`${v} people`]} />
                          <Bar dataKey="devices" radius={[4,4,0,0]}>
                            {markerZoneData.map((z, i) => <Cell key={i} fill={z.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p style={{ fontSize: 13, color: T.muted }}>No zone data available.</p>}
                  </div>
                  <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${T.border}` }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🥧 Occupancy Split</h3>
                    {markerZoneData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={markerZoneData} dataKey="devices" nameKey="label" cx="50%" cy="50%" outerRadius={75} label={({ occupancy_pct }) => `${occupancy_pct}%`} labelLine={false}>
                            {markerZoneData.map((z, i) => <Cell key={i} fill={z.color} />)}
                          </Pie>
                          <Tooltip formatter={(v, n) => [`${v} people`, n]} />
                          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <p style={{ fontSize: 13, color: T.muted }}>No zone data available.</p>}
                  </div>
                  <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${T.border}` }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>📈 Capacity Status</h3>
                    {markerZoneData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={markerZoneData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                          <XAxis type="number" domain={[0,100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                          <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={90} />
                          <Tooltip formatter={v => [`${v}%`]} />
                          <Bar dataKey="occupancy_pct" radius={[0,4,4,0]}>
                            {markerZoneData.map((z, i) => <Cell key={i} fill={z.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p style={{ fontSize: 13, color: T.muted }}>No zone data available.</p>}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      {showAddWizard && <AddAreaWizard onClose={() => setShowAddWizard(false)} onSave={handleSaveArea} />}
      {showCsvModal && selectedArea && (
        <CsvUploadModal area={selectedArea} onClose={() => setShowCsvModal(false)} onDataLoaded={handleCsvData} />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 380, textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete this area?</h3>
            <p style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>This will remove the area, its floor plan, and all zone configuration. This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)} style={btnOutline}>Cancel</button>
              <button onClick={() => handleDeleteArea(confirmDelete)}
                style={{ padding: '10px 24px', background: T.red, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SHARED STYLES ─────────────────────────────────────────────
const sh = { fontSize: 17, fontWeight: 700, color: T.navy, marginBottom: 16 };
const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6, marginTop: 12 };
const inp = { width: '100%', padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, color: T.text, outline: 'none', boxSizing: 'border-box', marginBottom: 4 };
const btn = (active, fs = 14) => ({ width: '100%', padding: fs === 12 ? '8px 16px' : 13, background: active ? `linear-gradient(135deg, ${T.blue}, ${T.teal})` : T.border, color: 'white', border: 'none', borderRadius: 8, fontSize: fs, fontWeight: 700, cursor: active ? 'pointer' : 'not-allowed', marginTop: 16, width: 'auto' });
const btnOutline = { padding: '10px 20px', background: 'white', border: `1px solid ${T.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 14, marginTop: 16, fontWeight: 600 };