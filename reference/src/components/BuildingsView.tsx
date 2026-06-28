import { useState } from 'react';
import { Search, Building, SlidersHorizontal, Plus, MapPin, Layers, Users, ShieldAlert, Sparkles } from 'lucide-react';
import { Building as BuildingType } from '../types';

interface BuildingsViewProps {
  buildings: BuildingType[];
  onAddBuilding: () => void;
  onEditBuilding: (building: BuildingType) => void;
}

export default function BuildingsView({ buildings, onAddBuilding, onEditBuilding }: BuildingsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPTIMAL' | 'CROWDED' | 'MAINTENANCE'>('ALL');
  const [sortBy, setSortBy] = useState<'NAME' | 'OCCUPANCY'>('NAME');

  const filteredBuildings = buildings
    .filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            b.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'NAME') {
        return a.name.localeCompare(b.name);
      } else {
        return b.occupancyPercent - a.occupancyPercent;
      }
    });

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header and Filter panel */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="space-y-1 text-center md:text-left">
          <h2 className="font-display text-2xl font-bold text-primary">Building Portfolio</h2>
          <p className="font-sans text-xs text-on-surface-variant font-medium">
            Manage parameters, locations, and sensor configurations across physical estates
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search estates..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:bg-white transition-all"
            />
          </div>

          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10 rounded-xl text-xs font-mono font-bold py-2 px-4 shadow-sm cursor-pointer outline-none transition-all"
          >
            <option value="ALL">Status: All</option>
            <option value="OPTIMAL">Status: Optimal</option>
            <option value="CROWDED">Status: Crowded</option>
            <option value="MAINTENANCE">Status: Maintenance</option>
          </select>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10 rounded-xl text-xs font-mono font-bold py-2 px-4 shadow-sm cursor-pointer outline-none transition-all"
          >
            <option value="NAME">Sort by: Name</option>
            <option value="OCCUPANCY">Sort by: Occupancy %</option>
          </select>

          <button 
            onClick={onAddBuilding}
            className="brand-gradient-btn text-white text-xs font-bold font-sans py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-md hover:opacity-95 cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Building
          </button>
        </div>
      </section>

      {/* Buildings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBuildings.map((building) => {
          const isOptimal = building.status === 'OPTIMAL';
          const isCrowded = building.status === 'CROWDED';
          const isMaint = building.status === 'MAINTENANCE';

          return (
            <div 
              key={building.id}
              className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between group bg-white border border-slate-100/80"
            >
              {/* Cover Image */}
              <div className="h-48 w-full relative overflow-hidden bg-slate-100">
                <img 
                  src={building.imageUrl} 
                  alt={building.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className={`absolute top-4 right-4 px-3 py-1 rounded-full font-mono text-[9px] font-bold shadow-md z-10 ${
                  isOptimal ? 'bg-teal-500 text-white' : isCrowded ? 'bg-error text-white' : 'bg-yellow-500 text-primary'
                }`}>
                  {building.status}
                </span>
                
                {/* Visual Glass gradient header shade */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent opacity-80"></div>
                
                <div className="absolute bottom-4 left-4 z-10">
                  <h3 className="font-display text-xl font-bold text-white tracking-wide">{building.name}</h3>
                  <div className="flex items-center gap-1.5 text-white/85 text-[11px] font-medium mt-1">
                    <MapPin className="w-3.5 h-3.5 text-white" />
                    <span>{building.location}</span>
                  </div>
                </div>
              </div>

              {/* Specs & occupancy percentage */}
              <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 text-slate-500 rounded-xl border border-slate-100">
                      <Layers className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-wider">Estates</p>
                      <p className="font-sans font-bold text-sm text-primary">{building.floors} Floors</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 text-slate-500 rounded-xl border border-slate-100">
                      <Users className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-wider">Load</p>
                      <p className="font-sans font-bold text-sm text-primary">{building.occupancyPercent}% Busy</p>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-end text-xs">
                    <span className="font-semibold text-slate-700">Occupancy load capacity</span>
                    <span className="font-mono font-bold text-primary">{building.occupancyPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOptimal ? 'bg-secondary' : isCrowded ? 'bg-error' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${building.occupancyPercent}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 border-t border-slate-100 pt-4 mt-2">
                  <button 
                    onClick={() => onEditBuilding(building)}
                    className="flex-grow py-2.5 bg-slate-50 hover:bg-slate-100 hover:text-secondary rounded-xl font-sans text-xs text-on-surface-variant font-bold transition-all flex items-center justify-center gap-2 border border-slate-100"
                  >
                    Configure Parameters
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
