import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronRight, ChevronDown, Map } from 'lucide-react';
import { useApp } from '../context/AppContext';

const VIEW_LABELS = {
  dashboard: 'Live Dashboard',
  'floor-plan': 'Floor Plan View',
  analytics: 'Analytics',
  buildings: 'Building Management',
  'area-setup': 'Area Setup',
  settings: 'Settings',
};

function userIdentity(email) {
  if (!email) return { name: 'User', title: 'Signed in', initials: 'U' };
  const local = email.split('@')[0];
  const parts = local.split(/[._-]+/).filter(Boolean);
  const name = parts.map(p => p.replace(/\d+/g, '')).filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || local;
  const initials = (parts[0]?.[0] || local[0] || 'U').toUpperCase()
    + (parts[1]?.[0] || parts[0]?.[1] || '').toUpperCase();
  return { name, title: email, initials };
}

// A breadcrumb segment with a dropdown of navigation options
function CrumbMenu({ label, active, open, onToggle, items, getName, onPick, empty }) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 transition-colors ${active
          ? 'text-secondary border-b-2 border-secondary pb-0.5 font-bold'
          : 'hover:text-secondary cursor-pointer'}`}
      >
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-40 min-w-[180px] max-h-72 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-100 py-1.5">
          {items.length === 0 && <p className="px-4 py-2 text-[11px] text-slate-400 normal-case">{empty}</p>}
          {items.map(it => (
            <button key={it.id} onClick={() => onPick(it)}
              className="w-full text-left px-4 py-2 text-[11px] font-semibold text-on-surface hover:bg-slate-50 hover:text-secondary transition-colors normal-case tracking-normal">
              {getName(it)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header({ currentView, onViewChange, onLogout, userEmail }) {
  const { selectedArea, buildings, floors, areas, selectArea, loadFloors, loadAreas } = useApp();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [openMenu, setOpenMenu] = useState(null); // 'building' | 'floor' | 'area' | null

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
  const formatTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const floor = selectedArea ? floors.find(f => f.id === selectedArea.floor_id) : null;
  const building = floor ? buildings.find(b => b.id === floor.building_id) : null;
  const showHierarchy = !!selectedArea;

  const buildingFloors = building ? floors.filter(f => f.building_id === building.id) : [];
  const floorAreas = floor ? areas.filter(a => a.floor_id === floor.id) : [];

  const { name, title, initials } = userIdentity(userEmail);

  const goToArea = (id) => { selectArea(id); onViewChange('floor-plan'); setOpenMenu(null); };

  const toggleBuilding = async () => {
    if (openMenu === 'building') return setOpenMenu(null);
    if (building) await loadFloors(building.id);   // ensure floors loaded
    setOpenMenu('building');
  };
  const toggleFloor = async () => {
    if (openMenu === 'floor') return setOpenMenu(null);
    if (floor) await loadAreas(floor.id);          // ensure that floor's areas loaded
    setOpenMenu('floor');
  };
  const toggleArea = async () => {
    if (openMenu === 'area') return setOpenMenu(null);
    if (floor) await loadAreas(floor.id);
    setOpenMenu('area');
  };

  // Pick a floor → jump to its first area
  const pickFloor = async (f) => {
    const ars = await loadAreas(f.id);
    if (ars && ars[0]) goToArea(ars[0].id);
    else setOpenMenu(null);
  };

  return (
    <header className="sticky top-0 w-full z-40 bg-white/85 backdrop-blur-md border-b border-slate-100 flex justify-between items-center px-6 py-4 shadow-sm font-sans">
      {/* Breadcrumb (or, on Analytics, a jump-to-heatmap button) */}
      {currentView === 'analytics' ? (
        <button
          onClick={() => onViewChange('floor-plan')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-white text-xs font-bold shadow-sm hover:opacity-90 transition-all"
        >
          <Map className="w-4 h-4" />
          View Heatmap
        </button>
      ) : (
      <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">
        {/* click-away layer */}
        {openMenu && <div className="fixed inset-0 z-30" onClick={() => setOpenMenu(null)} />}
        {showHierarchy ? (
          <>
            <CrumbMenu label={building?.name || 'Building'} open={openMenu === 'building'} onToggle={toggleBuilding}
              items={buildingFloors} getName={(f) => f.name} onPick={pickFloor} empty="No floors" />
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <CrumbMenu label={floor?.name || 'Floor'} open={openMenu === 'floor'} onToggle={toggleFloor}
              items={floorAreas} getName={(a) => a.name} onPick={(a) => goToArea(a.id)} empty="No areas on this floor" />
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <CrumbMenu label={selectedArea.name} active open={openMenu === 'area'} onToggle={toggleArea}
              items={floorAreas} getName={(a) => a.name} onPick={(a) => goToArea(a.id)} empty="No other areas" />
          </>
        ) : (
          <>
            <span onClick={() => onViewChange('dashboard')} className="hover:text-secondary cursor-pointer transition-colors">FacilityIQ</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-secondary border-b-2 border-secondary pb-0.5 font-bold">{VIEW_LABELS[currentView] || 'Dashboard'}</span>
          </>
        )}
      </div>
      )}

      <div className="flex items-center gap-5">
        <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-100 rounded-full">
          <div className="flex items-center gap-1.5">
            <Calendar className="text-secondary w-3.5 h-3.5" />
            <span className="font-mono text-[10px] font-semibold text-slate-600">{formatDate(currentTime)}</span>
          </div>
          <div className="w-px h-3.5 bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <Clock className="text-secondary w-3.5 h-3.5" />
            <span className="font-mono text-[10px] text-slate-700">{formatTime(currentTime)}</span>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block max-w-[180px]">
            <p className="font-bold text-on-surface text-sm leading-none truncate">{name}</p>
            <p className="font-mono text-[9px] text-on-surface-variant tracking-wider mt-1 truncate">{title}</p>
          </div>
          <div className="relative group cursor-pointer">
            <div className="w-9 h-9 rounded-full border-2 border-secondary/20 bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center shadow-sm hover:border-secondary transition-all">
              <span className="text-xs font-bold text-secondary">{initials}</span>
            </div>
            <button onClick={onLogout}
              className="absolute right-0 top-12 hidden group-hover:block bg-white hover:bg-red-50 text-red-600 font-semibold py-2.5 px-4 rounded-lg shadow-xl border border-slate-100 text-xs transition-all whitespace-nowrap z-50">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
