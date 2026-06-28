import { ViewType } from '../types';
import { Search, Calendar, Clock, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface HeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onLogout: () => void;
  activeBuildingName: string;
}

export default function Header({ currentView, onViewChange, onLogout, activeBuildingName }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
    return date.toLocaleDateString('en-US', options).toUpperCase();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const getViewLabel = () => {
    switch (currentView) {
      case 'dashboard': return 'Live Dashboard';
      case 'floor-plan': return 'Floor Plan View';
      case 'analytics': return 'Analytics Dashboard';
      case 'buildings': return 'Building Management';
      case 'data-import': return 'CSV Data Import';
      case 'area-setup': return 'Area Setup Wizard';
      case 'settings': return 'Control Center';
      default: return 'System Settings';
    }
  };

  return (
    <header className="sticky top-0 w-full z-40 bg-white/85 backdrop-blur-md border-b border-slate-100 flex justify-between items-center px-6 py-4 shadow-sm font-sans">
      <div className="flex items-center gap-8">
        <div className="relative w-64 hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            className="w-full bg-slate-50 border border-slate-100 rounded-full py-2 pl-10 pr-4 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
            placeholder="Search facilities..."
            type="text"
          />
        </div>
        
        <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">
          <span className="hover:text-secondary cursor-pointer transition-colors" onClick={() => onViewChange('buildings')}>
            {activeBuildingName}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="hover:text-secondary cursor-pointer transition-colors" onClick={() => onViewChange('floor-plan')}>
            Ground Floor
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-secondary border-b-2 border-secondary pb-0.5 font-bold">
            {getViewLabel()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {/* Date and Time widgets */}
        <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-100 rounded-full">
          <div className="flex items-center gap-1.5">
            <Calendar className="text-secondary w-3.5 h-3.5" />
            <span className="font-mono text-[10px] font-semibold text-slate-600">{formatDate(currentTime)}</span>
          </div>
          <div className="w-px h-3.5 bg-slate-200"></div>
          <div className="flex items-center gap-1.5">
            <Clock className="text-secondary w-3.5 h-3.5" />
            <span className="font-mono text-[10px] text-slate-700">{formatTime(currentTime)}</span>
          </div>
        </div>

        {/* Notifications and Profile */}
        <div className="flex items-center gap-4">
          <div className="relative cursor-pointer group p-1.5 rounded-full hover:bg-slate-100 transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-colors" style={{ fontSize: '20px' }}>notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error border border-white rounded-full"></span>
          </div>
          
          <div className="h-8 w-[1px] bg-slate-200"></div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="font-body-md font-bold text-on-surface text-sm leading-none">Alex Rivera</p>
              <p className="font-mono text-[9px] text-on-surface-variant tracking-wider uppercase mt-1">Operations Head</p>
            </div>
            
            <div className="relative group cursor-pointer">
              <div className="w-10 h-10 rounded-full border-2 border-secondary/20 overflow-hidden shadow-sm hover:border-secondary transition-all">
                <img 
                  className="w-full h-full object-cover" 
                  alt="Alex Rivera"
                  referrerPolicy="no-referrer"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZrOt3tbLUxQ-7BxYM6IpbGjilKQJMLqwJSAFQijkT1e7FK1RKaNfvVlECxRb6LtozVr9dD4dEEhxHGiDRWbkQMGq6HZ9qZZwX0EJpWwjSyCGNCdxHzrcOY3wMaayo7zmT2zxKIA-Cayhi0sMq7WJH_epvuFHzXMbjNd1n_V3kIH-hoU0XVMO_2Wz6MyM0bOdEefjy6v2L24yuAd6AAabRjjJpp89qxmwP8iEBz7cGBVtGRXdgkhHq5C4Sq1RzCFdQyeb5cpVnZwc"
                />
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
      </div>
    </header>
  );
}
