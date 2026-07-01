import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  BarChart2, TrendingUp, TrendingDown, Minus, Loader2, Info, MousePointerClick,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Brush,
} from 'recharts';

const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const API = `${API_BASE}/api`;

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TZ = new Date().getTimezoneOffset();

function tierColor(pct) {
  if (pct >= 75) return '#dc2626';
  if (pct >= 50) return '#d97706';
  if (pct >= 25) return '#0d9488';
  return '#94a3b8';
}
function tierFill(pct, max = 100) {
  if (pct == null || pct <= 0) return '#f1f5f9';
  const c = tierColor(pct);
  const alpha = Math.max(0.12, Math.min(1, pct / (max || 100)));
  return c + Math.round(alpha * 255).toString(16).padStart(2, '0');
}

const TIME_PRESETS = [
  { key: 'all', label: 'All day', start: null, end: null },
  { key: 'morning', label: 'Morning (6–12)', start: 6, end: 11 },
  { key: 'work', label: 'Work hours (9–17)', start: 9, end: 17 },
  { key: 'lunch', label: 'Lunch (11–14)', start: 11, end: 14 },
  { key: 'evening', label: 'Evening (17–22)', start: 17, end: 22 },
];

const iso = (d) => d.toISOString();
const startOfLocalDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const pad2 = (n) => String(n).padStart(2, '0');

export default function AnalyticsView() {
  const [meta, setMeta] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Period filters
  const [preset, setPreset] = useState('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [monthSel, setMonthSel] = useState('');
  const [weekSel, setWeekSel] = useState('');
  const [dow, setDow] = useState('');
  const [timePreset, setTimePreset] = useState('all');

  // Scope filters (cascading) — blank by default
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [zoneId, setZoneId] = useState('');

  useEffect(() => {
    axios.get(`${API}/analytics/meta`).then(r => setMeta(r.data)).catch(() => {});
  }, []);

  const buildings = meta?.buildings || [];
  const building = buildings.find(b => b.building_id === buildingId);
  const floors = building?.floors || [];
  const floor = floors.find(f => f.floor_id === floorId);
  const areasForFloor = floor?.areas || [];
  const area = areasForFloor.find(a => a.area_id === areaId);
  const zonesForArea = area?.zones || [];

  // Resolve which area_ids the current scope selection covers
  const resolvedAreaIds = useMemo(() => {
    if (!building) return null;             // nothing chosen yet
    if (area) return [area.area_id];
    if (floor) return floor.areas.map(a => a.area_id);
    return floors.flatMap(f => f.areas.map(a => a.area_id));  // whole building
  }, [building, floor, area, floors]);

  const hasScope = !!building;

  // Period range
  const range = useMemo(() => {
    const now = new Date();
    if (preset === 'today') return [startOfLocalDay(now), now];
    if (preset === 'yesterday') { const s = startOfLocalDay(now); s.setDate(s.getDate() - 1); return [s, startOfLocalDay(now)]; }
    if (preset === '7d') { const s = new Date(now); s.setDate(s.getDate() - 7); return [s, now]; }
    if (preset === '30d') { const s = new Date(now); s.setDate(s.getDate() - 30); return [s, now]; }
    if (preset === '3mo') { const s = new Date(now); s.setDate(s.getDate() - 90); return [s, now]; }
    if (preset === 'month' && monthSel) { const [y, m] = monthSel.split('-').map(Number); return [new Date(y, m - 1, 1), new Date(y, m, 1)]; }
    if (preset === 'week' && weekSel) { const s = new Date(weekSel); const e = new Date(s); e.setDate(e.getDate() + 7); return [s, e]; }
    if (preset === 'custom' && customStart && customEnd) { const s = startOfLocalDay(new Date(customStart)); const e = new Date(customEnd); e.setHours(23, 59, 59, 0); return [s, e]; }
    const s = new Date(now); s.setDate(s.getDate() - 7); return [s, now];
  }, [preset, monthSel, weekSel, customStart, customEnd]);

  const fetchSummary = useCallback(async () => {
    if (!resolvedAreaIds) { setData(null); return; }
    const [s, e] = range;
    const tp = TIME_PRESETS.find(t => t.key === timePreset);
    // Ranking level adapts to the scope: area→zones, floor→areas, building→floors
    const groupBy = areaId ? 'zone' : floorId ? 'area' : 'floor';
    const params = { tz_offset: TZ, start: iso(s), end: iso(e), area_ids: resolvedAreaIds.join(','), group_by: groupBy };
    if (zoneId) params.zone_id = zoneId;
    if (dow !== '') params.dow = dow;
    if (tp && tp.start !== null) { params.hour_start = tp.start; params.hour_end = tp.end; }
    setLoading(true);
    try {
      const r = await axios.get(`${API}/analytics/summary`, { params });
      setData(r.data);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [resolvedAreaIds, range, zoneId, dow, timePreset, areaId, floorId]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const monthOptions = useMemo(() => {
    const out = []; const now = new Date();
    for (let i = 0; i < 4; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ val: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }); }
    return out;
  }, []);
  const weekOptions = useMemo(() => {
    const out = []; const monday = startOfLocalDay(new Date());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    for (let i = 0; i < 13; i++) { const m = new Date(monday); m.setDate(m.getDate() - i * 7); const end = new Date(m); end.setDate(end.getDate() + 6);
      out.push({ val: m.toISOString(), label: `${m.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` }); }
    return out;
  }, []);

  const coverage = meta?.coverage;
  const fmtCov = (s) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const scopeLabel = area ? area.area_name : floor ? `${floor.floor_name} (all areas)` : building ? `${building.building_name} (all floors)` : null;

  return (
    <div className="p-6 space-y-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-primary">Analytics</h2>
          <p className="font-sans text-sm text-on-surface-variant mt-1">Explore occupancy patterns over time</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant bg-slate-50 border border-slate-100 rounded-full px-4 py-2">
          <Info className="w-3.5 h-3.5 text-secondary" />
          {coverage?.earliest ? <span>Data available {fmtCov(coverage.earliest)} → {fmtCov(coverage.latest)}</span> : <span>No history yet — data is accumulating</span>}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl border border-slate-100 p-5 space-y-4">
        {/* Scope: Building → Floor → Area → Zone */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 w-14">Scope</span>
          <select value={buildingId} onChange={e => { setBuildingId(e.target.value); setFloorId(''); setAreaId(''); setZoneId(''); }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 outline-none focus:border-secondary">
            <option value="">Select building…</option>
            {buildings.map(b => <option key={b.building_id} value={b.building_id}>{b.building_name}</option>)}
          </select>
          <select value={floorId} disabled={!building} onChange={e => { setFloorId(e.target.value); setAreaId(''); setZoneId(''); }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 outline-none focus:border-secondary disabled:opacity-40">
            <option value="">All floors</option>
            {floors.map(f => <option key={f.floor_id} value={f.floor_id}>{f.floor_name}</option>)}
          </select>
          <select value={areaId} disabled={!floor} onChange={e => { setAreaId(e.target.value); setZoneId(''); }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 outline-none focus:border-secondary disabled:opacity-40">
            <option value="">All areas</option>
            {areasForFloor.map(a => <option key={a.area_id} value={a.area_id}>{a.area_name}</option>)}
          </select>
          <select value={zoneId} disabled={!area} onChange={e => setZoneId(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 outline-none focus:border-secondary disabled:opacity-40">
            <option value="">All zones</option>
            {zonesForArea.map(z => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
          </select>
          {scopeLabel && <span className="text-[11px] text-secondary font-semibold ml-1">▸ {scopeLabel}</span>}
        </div>

        {/* Period */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-50 pt-4">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 w-14">Period</span>
          {[['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['3mo', 'Last 3 months']].map(([k, l]) => (
            <button key={k} onClick={() => setPreset(k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${preset === k ? 'bg-secondary text-white shadow-sm' : 'bg-slate-100 text-on-surface-variant hover:text-secondary'}`}>{l}</button>
          ))}
          <select value={preset === 'month' ? monthSel : ''} onChange={e => { setMonthSel(e.target.value); setPreset('month'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border outline-none ${preset === 'month' ? 'border-secondary text-secondary' : 'border-slate-200 text-on-surface-variant'}`}>
            <option value="">Month…</option>{monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
          <select value={preset === 'week' ? weekSel : ''} onChange={e => { setWeekSel(e.target.value); setPreset('week'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border outline-none ${preset === 'week' ? 'border-secondary text-secondary' : 'border-slate-200 text-on-surface-variant'}`}>
            <option value="">Week…</option>{weekOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <input type="date" value={customStart} onChange={e => { setCustomStart(e.target.value); setPreset('custom'); }} className="px-2 py-1.5 rounded-lg text-xs border border-slate-200 outline-none focus:border-secondary" />
            <span className="text-slate-400 text-xs">to</span>
            <input type="date" value={customEnd} onChange={e => { setCustomEnd(e.target.value); setPreset('custom'); }} className="px-2 py-1.5 rounded-lg text-xs border border-slate-200 outline-none focus:border-secondary" />
          </div>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <select value={dow} onChange={e => setDow(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 outline-none focus:border-secondary">
            <option value="">Every day</option>{DOW.map((d, i) => <option key={d} value={i}>{d} only</option>)}
          </select>
          <select value={timePreset} onChange={e => setTimePreset(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 outline-none focus:border-secondary">
            {TIME_PRESETS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Body */}
      {!hasScope ? (
        <div className="glass-card rounded-2xl border border-slate-100 p-16 text-center">
          <MousePointerClick className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-display font-bold text-primary text-lg mb-2">Select a building to begin</h3>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">Choose a building (and optionally a floor, area, or zone) above to see its occupancy trends.</p>
        </div>
      ) : loading ? (
        <div className="glass-card rounded-2xl border border-slate-100 p-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-secondary" /><p className="text-sm">Loading analytics…</p>
        </div>
      ) : !data?.has_data ? (
        <div className="glass-card rounded-2xl border border-slate-100 p-16 text-center">
          <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-display font-bold text-primary text-lg mb-2">No data for this selection</h3>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">{data?.message || 'No occupancy history for these filters yet. Try a wider date range.'}</p>
        </div>
      ) : (
        <AnalyticsBody data={data} range={range}
          onDrillDay={(dayStr) => { setCustomStart(dayStr); setCustomEnd(dayStr); setPreset('custom'); }} />
      )}
    </div>
  );
}

// ── Charts ────────────────────────────────────────────────────────
function KPICard({ icon, label, value, color = 'teal' }) {
  const colors = { teal: 'bg-teal-50 text-teal-600', blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600' };
  return (
    <div className="glass-card p-5 rounded-2xl border border-slate-100 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <p className="font-display font-bold text-primary text-2xl tracking-tight truncate">{value}</p>
        <p className="font-sans text-xs text-on-surface-variant font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ChangeBadge({ cmp, label }) {
  const pc = cmp?.pct_change;
  let Icon = Minus, cls = 'text-slate-400', txt = 'No prior data';
  if (pc !== null && pc !== undefined) {
    if (pc > 0) { Icon = TrendingUp; cls = 'text-status-success'; txt = `+${pc}%`; }
    else if (pc < 0) { Icon = TrendingDown; cls = 'text-error'; txt = `${pc}%`; }
    else { Icon = Minus; cls = 'text-slate-500'; txt = '0%'; }
  }
  return (
    <div className="glass-card p-5 rounded-2xl border border-slate-100">
      <p className="font-sans text-xs text-on-surface-variant font-medium">{label}</p>
      <div className={`flex items-center gap-2 mt-2 ${cls}`}><Icon className="w-5 h-5" /><span className="font-display font-bold text-2xl">{txt}</span></div>
      <p className="text-[10px] text-slate-400 mt-1">{cmp?.current != null ? `now ${cmp.current}%` : '—'} vs {cmp?.previous != null ? `${cmp.previous}%` : '—'}</p>
    </div>
  );
}

function AnalyticsBody({ data, range, onDrillDay }) {
  const { totals, trend, peak_hours, peak_days, ranking, heatmap, utilization, comparisons, period } = data;
  const rankLevel = ranking?.level || 'zone';
  const rankTitle = rankLevel === 'floor' ? 'Floor ranking' : rankLevel === 'area' ? 'Area ranking' : 'Zone ranking';
  const rankSub = rankLevel === 'floor' ? 'Average occupancy by floor' : rankLevel === 'area' ? 'Average occupancy by area' : 'Average occupancy by zone';
  const rankItems = ranking?.items || [];
  const hourly = period.granularity === 'hour';

  // Build a CONTINUOUS series across the range so the time axis is regular.
  const trendData = useMemo(() => {
    const byBucket = {};
    trend.forEach(t => { byBucket[t.bucket] = t; });
    const [s, e] = range;
    const out = [];
    if (hourly) {
      const cur = new Date(s); cur.setMinutes(0, 0, 0);
      const end = new Date(e);
      while (cur <= end) {
        const key = `${cur.getFullYear()}-${pad2(cur.getMonth() + 1)}-${pad2(cur.getDate())} ${pad2(cur.getHours())}:00`;
        const hit = byBucket[key];
        out.push({ label: `${pad2(cur.getHours())}:00`, fullLabel: cur.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
          hour: cur.getHours(), avg: hit ? hit.avg_pct : null, peak: hit ? hit.peak_pct : null });
        cur.setHours(cur.getHours() + 1);
      }
    } else {
      const cur = startOfLocalDay(s); const end = new Date(e);
      while (cur <= end) {
        const key = `${cur.getFullYear()}-${pad2(cur.getMonth() + 1)}-${pad2(cur.getDate())}`;
        const hit = byBucket[key];
        out.push({ label: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), raw: key,
          avg: hit ? hit.avg_pct : null, peak: hit ? hit.peak_pct : null });
        cur.setDate(cur.getDate() + 1);
      }
    }
    return out;
  }, [trend, range, hourly]);

  // 3-hour tick labels for the hourly view
  const trendTicks = useMemo(() => {
    if (!hourly) return undefined;
    return trendData.filter((d) => d.hour % 3 === 0).map(d => d.label)
      .filter((v, i, a) => a.indexOf(v) === i);
  }, [trendData, hourly]);

  // Busiest hours — always full 0..23, fill missing with 0
  const hourMap = {}; peak_hours.forEach(h => { hourMap[h.hour] = h.avg_pct; });
  const hourData = Array.from({ length: 24 }, (_, h) => ({ label: `${pad2(h)}:00`, hour: h, pct: hourMap[h] ?? 0 }));
  const hourTicks = hourData.filter(d => d.hour % 3 === 0).map(d => d.label);

  const dayData = peak_days.map(d => ({ label: d.day, pct: d.avg_pct }));

  const heatMap = {}; let heatMax = 0;
  heatmap.forEach(c => { heatMap[`${c.dow}-${c.hour}`] = c.avg_pct; heatMax = Math.max(heatMax, c.avg_pct); });

  const utilSegments = [
    ['Quiet', utilization.quiet, '#94a3b8'], ['Moderate', utilization.moderate, '#0d9488'],
    ['Busy', utilization.busy, '#d97706'], ['Critical', utilization.critical, '#dc2626'],
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={<BarChart2 className="w-5 h-5" />} label="Average occupancy" value={`${totals.avg_pct}%`} color="teal" />
        <KPICard icon={<TrendingUp className="w-5 h-5" />} label="Peak occupancy" value={`${totals.peak_pct}%`} color="amber" />
        <ChangeBadge cmp={comparisons.week} label="Last 7 days vs previous 7" />
        <ChangeBadge cmp={comparisons.month} label="Last 30 days vs previous 30" />
      </div>

      {/* Trend Chart */}
      <div className="glass-card p-6 rounded-2xl border border-slate-100">
        <h4 className="font-display font-bold text-primary mb-1">Trend Chart</h4>
        <p className="text-[11px] text-slate-400 mb-4">
          {hourly ? 'Hourly average.' : 'Daily average. Click a point to drill into that day.'} Drag the slider below to zoom.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            onClick={(e) => { if (!hourly && e?.activePayload?.[0]?.payload?.raw) onDrillDay(e.activePayload[0].payload.raw); }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} ticks={trendTicks} interval={hourly ? undefined : 'preserveStartEnd'} minTickGap={hourly ? 0 : 20} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
              labelFormatter={(l, p) => p?.[0]?.payload?.fullLabel || l}
              formatter={(v, n) => [v == null ? 'no data' : `${v}%`, n === 'avg' ? 'Average' : 'Peak']} />
            <Line type="monotone" dataKey="avg" stroke="#0d9488" strokeWidth={2.5} dot={hourly ? false : { r: 3 }} activeDot={{ r: 6 }} name="avg" connectNulls />
            <Line type="monotone" dataKey="peak" stroke="#d97706" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="peak" connectNulls />
            <Brush dataKey="label" height={22} stroke="#0d9488" travellerWidth={8} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Busiest hours + days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-100">
          <h4 className="font-display font-bold text-primary mb-1">Busiest hours</h4>
          <p className="text-[11px] text-slate-400 mb-4">Average occupancy by hour of day</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} ticks={hourTicks} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [`${v}%`, 'Avg']} />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>{hourData.map((d, i) => <Cell key={i} fill={tierColor(d.pct)} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-6 rounded-2xl border border-slate-100">
          <h4 className="font-display font-bold text-primary mb-1">Busiest days</h4>
          <p className="text-[11px] text-slate-400 mb-4">Average occupancy by day of week</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [`${v}%`, 'Avg']} />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>{dayData.map((d, i) => <Cell key={i} fill={tierColor(d.pct)} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap */}
      <div className="glass-card p-6 rounded-2xl border border-slate-100">
        <h4 className="font-display font-bold text-primary mb-1">When is it busy?</h4>
        <p className="text-[11px] text-slate-400 mb-4">Average occupancy by day & hour (darker = busier)</p>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex gap-0.5 mb-1 pl-10">
              {Array.from({ length: 24 }, (_, h) => <div key={h} className="w-5 text-center text-[8px] font-mono text-slate-400">{h % 3 === 0 ? h : ''}</div>)}
            </div>
            {DOW.map((d, di) => (
              <div key={d} className="flex gap-0.5 items-center mb-0.5">
                <div className="w-10 text-[10px] font-mono font-bold text-slate-500">{d}</div>
                {Array.from({ length: 24 }, (_, h) => {
                  const v = heatMap[`${di}-${h}`];
                  return <div key={h} title={v != null ? `${d} ${h}:00 — ${v}%` : `${d} ${h}:00 — no data`} className="w-5 h-5 rounded-sm" style={{ background: v != null ? tierFill(v, heatMax) : '#f8fafc' }} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone ranking + utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-100">
          <h4 className="font-display font-bold text-primary mb-1">{rankTitle}</h4>
          <p className="text-[11px] text-slate-400 mb-4">{rankSub}</p>
          <div className="space-y-3">
            {rankItems.map((z, i) => (
              <div key={z.id} className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400 w-4">{i + 1}</span>
                <span className="text-sm font-medium text-primary w-32 truncate">{z.name}</span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(z.avg_pct, 100)}%`, background: tierColor(z.avg_pct) }} /></div>
                <span className="font-mono text-xs font-bold text-on-surface-variant w-12 text-right">{z.avg_pct}%</span>
              </div>
            ))}
            {rankItems.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No data.</p>}
          </div>
        </div>
        <div className="glass-card p-6 rounded-2xl border border-slate-100">
          <h4 className="font-display font-bold text-primary mb-1">Time spent at each level</h4>
          <p className="text-[11px] text-slate-400 mb-4">% of time across the selected period</p>
          <div className="flex h-6 rounded-full overflow-hidden mb-4">
            {utilSegments.map(([name, pct, color]) => pct > 0 && <div key={name} title={`${name}: ${pct}%`} style={{ width: `${pct}%`, background: color }} />)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {utilSegments.map(([name, pct, color]) => (
              <div key={name} className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: color }} /><span className="text-xs text-on-surface flex-1">{name}</span><span className="font-mono text-xs font-bold text-on-surface-variant">{pct}%</span></div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 text-center">
        Showing {totals.samples.toLocaleString()} data points · {new Date(totals.first_sample).toLocaleString()} → {new Date(totals.last_sample).toLocaleString()}
      </p>
    </div>
  );
}
