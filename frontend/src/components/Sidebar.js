import React, { useState, useEffect } from 'react';
import { Building2, Building, Layers, TrendingUp, Settings, ChevronRight, ChevronDown, MapPin, Plus, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';

const bottomNav = [
  { view: 'analytics', label: 'Analytics', icon: TrendingUp },
  { view: 'area-setup', label: 'Area Setup', icon: Wrench },
  { view: 'settings', label: 'System Settings', icon: Settings },
];

const LIVE_POLL_MS = 30000;

export default function Sidebar({ currentView, onViewChange, onLogout }) {
  const {
    buildings, floors, areas, selectedAreaId,
    loadBuildings, loadFloors, loadAreas, selectArea,
    liveStatus, loadLiveStatus,
  } = useApp();

  const [expandedBuildings, setExpandedBuildings] = useState({});
  const [expandedFloors, setExpandedFloors] = useState({});

  useEffect(() => {
    loadBuildings();
  }, []);

  // Poll live status so each area's dot reflects whether it's streaming
  useEffect(() => {
    loadLiveStatus();
    const id = setInterval(loadLiveStatus, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [loadLiveStatus]);

  const liveByName = {};
  (liveStatus?.areas || []).forEach(a => { liveByName[a.area_name] = a.is_live; });

  const toggleBuilding = async (bid) => {
    const next = !expandedBuildings[bid];
    setExpandedBuildings(prev => ({ ...prev, [bid]: next }));
    if (next) {
      const flrs = await loadFloors(bid);
      for (const f of flrs) {
        await loadAreas(f.id);
      }
    }
  };

  const toggleFloor = (fid) => {
    setExpandedFloors(prev => ({ ...prev, [fid]: !prev[fid] }));
  };

  const handleSelectArea = (area) => {
    selectArea(area.id);
    // Go to Area Setup if no DXF uploaded yet, otherwise Floor Plan
    onViewChange(area.dxf_parsed_data ? 'floor-plan' : 'area-setup');
  };

  const NavItem = ({ view, label, icon: Icon }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => onViewChange(view)}
        className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl cursor-pointer text-left transition-all duration-200 ${
          isActive
            ? 'text-secondary font-bold bg-surface-container-low shadow-sm border-l-4 border-secondary'
            : 'text-on-surface-variant hover:text-secondary hover:bg-slate-50'
        }`}
      >
        <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-secondary' : 'text-slate-400'}`} />
        <span className="font-sans font-medium text-sm">{label}</span>
      </button>
    );
  };

  const buildingFloors = (bid) => floors.filter(f => f.building_id === bid);
  const floorAreas = (fid) => areas.filter(a => a.floor_id === fid);

  return (
    <aside className="h-screen w-64 bg-white flex flex-col py-6 shadow-md z-50 shrink-0 border-r border-slate-100 font-sans">
      {/* Logo */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center shadow-md">
            <Building2 className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-primary tracking-tight">FacilityIQ</h1>
            <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/75 font-semibold">
              Occupancy Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Hierarchy Tree */}
      <div className="px-3 py-2 flex-1 overflow-y-auto space-y-0.5">
        <div className="flex items-center justify-between px-2 mb-2">
          <p className="font-mono text-[9px] uppercase tracking-widest text-slate-400 font-bold">Facilities</p>
          <button
            onClick={() => onViewChange('buildings')}
            className="text-slate-400 hover:text-secondary transition-colors"
            title="Manage Buildings"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {buildings.length === 0 && (
          <button
            onClick={() => onViewChange('buildings')}
            className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-secondary font-medium transition-colors"
          >
            + Add your first building
          </button>
        )}

        {buildings.map(b => {
          const bFloors = buildingFloors(b.id);
          const isExpanded = expandedBuildings[b.id];
          return (
            <div key={b.id}>
              <button
                onClick={() => toggleBuilding(b.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 text-left transition-colors group"
              >
                {isExpanded
                  ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                }
                <Building className="w-4 h-4 text-secondary shrink-0" />
                <span className="font-sans font-semibold text-sm text-primary truncate group-hover:text-secondary transition-colors">
                  {b.name}
                </span>
              </button>

              {isExpanded && (
                <div className="ml-4 border-l border-slate-100 pl-2 space-y-0.5">
                  {bFloors.length === 0 && (
                    <p className="text-xs text-slate-400 px-3 py-1">No floors yet</p>
                  )}
                  {bFloors.map(f => {
                    const fAreas = floorAreas(f.id);
                    const floorExpanded = expandedFloors[f.id];
                    return (
                      <div key={f.id}>
                        <button
                          onClick={() => toggleFloor(f.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors"
                        >
                          {floorExpanded
                            ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                            : <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                          }
                          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-sans text-xs font-medium text-on-surface truncate">
                            {f.name}
                          </span>
                        </button>

                        {floorExpanded && (
                          <div className="ml-4 border-l border-slate-100 pl-2 space-y-0.5">
                            {fAreas.length === 0 && (
                              <p className="text-xs text-slate-400 px-3 py-1">No areas</p>
                            )}
                            {fAreas.map(area => {
                              const isSelected = selectedAreaId === area.id;
                              const isLive = liveByName[area.name];
                              const hasSetup = area.dxf_parsed_data || (area.zones && area.zones.length > 0);
                              return (
                                <button
                                  key={area.id}
                                  onClick={() => handleSelectArea(area)}
                                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all ${
                                    isSelected
                                      ? 'bg-teal-50 border-l-2 border-secondary text-secondary'
                                      : 'hover:bg-slate-50 text-on-surface-variant'
                                  }`}
                                >
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span className="font-sans text-xs truncate">{area.name}</span>
                                  {/* Live = pulsing green, set-up-but-idle = grey-green, no setup = grey */}
                                  <span className="ml-auto relative flex h-2 w-2 shrink-0" title={isLive ? 'Streaming live' : hasSetup ? 'Ready (no live data)' : 'Not set up'}>
                                    {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-status-success' : hasSetup ? 'bg-teal-200' : 'bg-slate-300'}`} />
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Nav */}
      <div className="px-4 mt-auto space-y-1.5 border-t border-slate-100 pt-4">
        {bottomNav.map(item => (
          <NavItem key={item.view} {...item} />
        ))}
        <button
          onClick={onLogout}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 py-3 rounded-xl font-mono text-[11px] font-semibold tracking-wider transition-colors duration-200"
        >
          LOG OUT
        </button>
      </div>
    </aside>
  );
}
