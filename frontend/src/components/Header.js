import React, { useState, useEffect } from 'react';
import { Search, Calendar, Clock, ChevronRight, Bell } from 'lucide-react';

const VIEW_LABELS = {
  dashboard: 'Live Dashboard',
  'floor-plan': 'Floor Plan View',
  analytics: 'Analytics Dashboard',
  buildings: 'Building Management',
  'data-import': 'CSV Data Import',
  'area-setup': 'Area Setup Wizard',
  settings: 'Control Center',
};

export default function Header({ currentView, onViewChange, onLogout, activeBuildingName }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <header className="sticky top-0 w-full z-40 bg-white/85 backdrop-blur-md border-b border-slate-100 flex justify-between items-center px-6 py-4 shadow-sm font-sans">
      <div className="flex items-center gap-8">
        {/* Search */}
        <div className="relative w-64 hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            className="w-full bg-slate-50 border border-slate-100 rounded-full py-2 pl-10 pr-4 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
            placeholder="Search facilities..."
            type="text"
          />
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">
          <span
            className="hover:text-secondary cursor-pointer transition-colors"
            onClick={() => onViewChange('buildings')}
          >
            {activeBuildingName}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span
            className="hover:text-secondary cursor-pointer transition-colors"
            onClick={() => onViewChange('floor-plan')}
          >
            Ground Floor
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-secondary border-b-2 border-secondary pb-0.5 font-bold">
            {VIEW_LABELS[currentView] || 'Dashboard'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {/* Date/Time Widget */}
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

        {/* Notification bell */}
        <div className="relative cursor-pointer p-1.5 rounded-full hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5 text-on-surface-variant hover:text-secondary transition-colors" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error border border-white rounded-full" />
        </div>

        <div className="h-8 w-px bg-slate-200" />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="font-bold text-on-surface text-sm leading-none">Alex Rivera</p>
            <p className="font-mono text-[9px] text-on-surface-variant tracking-wider uppercase mt-1">Operations Head</p>
          </div>
          <div className="relative group cursor-pointer">
            <div className="w-9 h-9 rounded-full border-2 border-secondary/20 bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center shadow-sm hover:border-secondary transition-all">
              <span className="text-xs font-bold text-secondary">AR</span>
            </div>
            <button
              onClick={onLogout}
              className="absolute right-0 top-12 hidden group-hover:block bg-white hover:bg-red-50 text-red-600 font-semibold py-2.5 px-4 rounded-lg shadow-xl border border-slate-100 text-xs transition-all whitespace-nowrap z-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
