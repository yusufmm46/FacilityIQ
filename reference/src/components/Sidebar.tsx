import { ViewType } from '../types';
import { 
  Building2, 
  Building, 
  Layers, 
  LayoutGrid, 
  TrendingUp, 
  Bell, 
  Settings,
  ShieldAlert
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onLogout: () => void;
}

export default function Sidebar({ currentView, onViewChange, onLogout }: SidebarProps) {
  // Navigation mapping
  const mainNav = [
    { view: 'dashboard' as ViewType, label: 'Organisation', icon: Building2 },
    { view: 'buildings' as ViewType, label: 'Buildings', icon: Building },
    { view: 'floor-plan' as ViewType, label: 'Floors', icon: Layers },
    { view: 'area-setup' as ViewType, label: 'Areas', icon: LayoutGrid },
  ];

  return (
    <aside className="docked left-0 h-screen w-64 bg-surface-container-lowest flex flex-col py-6 shadow-md z-50 shrink-0 border-r border-slate-100 font-sans">
      <div className="px-6 pb-6">
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

      <nav className="flex-1 px-4 space-y-1.5 mt-4">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl cursor-pointer text-left transition-all duration-200 ${
                isActive
                  ? 'text-secondary font-bold bg-surface-container-low shadow-sm border-l-4 border-secondary'
                  : 'text-on-surface-variant hover:text-secondary hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-secondary' : 'text-slate-400'}`} />
              <span className="font-sans font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-4 mt-auto space-y-1.5 border-t border-slate-100 pt-4">
        <button
          onClick={() => onViewChange('analytics')}
          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl cursor-pointer text-left transition-all duration-200 ${
            currentView === 'analytics'
              ? 'text-secondary font-bold bg-surface-container-low shadow-sm border-l-4 border-secondary'
              : 'text-on-surface-variant hover:text-secondary hover:bg-slate-50'
          }`}
        >
          <TrendingUp className={`w-5 h-5 ${currentView === 'analytics' ? 'text-secondary' : 'text-slate-400'}`} />
          <span className="font-sans font-medium text-sm">Analytics</span>
        </button>

        <button
          onClick={() => onViewChange('data-import')}
          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl cursor-pointer text-left transition-all duration-200 ${
            currentView === 'data-import'
              ? 'text-secondary font-bold bg-surface-container-low shadow-sm border-l-4 border-secondary'
              : 'text-on-surface-variant hover:text-secondary hover:bg-slate-50'
          }`}
        >
          <ShieldAlert className={`w-5 h-5 ${currentView === 'data-import' ? 'text-secondary' : 'text-slate-400'}`} />
          <span className="font-sans font-medium text-sm">Data Sync</span>
        </button>

        <button
          onClick={() => onViewChange('settings')}
          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl cursor-pointer text-left transition-all duration-200 ${
            currentView === 'settings'
              ? 'text-secondary font-bold bg-surface-container-low shadow-sm border-l-4 border-secondary'
              : 'text-on-surface-variant hover:text-secondary hover:bg-slate-50'
          }`}
        >
          <Settings className={`w-5 h-5 ${currentView === 'settings' ? 'text-secondary' : 'text-slate-400'}`} />
          <span className="font-sans font-medium text-sm">System Settings</span>
        </button>

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
