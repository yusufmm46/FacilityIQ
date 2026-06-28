import { useState, useEffect } from 'react';
import { Users, Zap, Building2, PieChart, ZoomIn, ZoomOut, MoreHorizontal, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { Building, Zone } from '../types';

interface DashboardProps {
  onViewChange: (view: any) => void;
  buildings: Building[];
  onAddBuilding: () => void;
}

export default function DashboardView({ onViewChange, buildings, onAddBuilding }: DashboardProps) {
  const [pulseScale, setPulseScale] = useState(1);

  // Heat map pulse animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseScale(s => (s === 1 ? 1.15 : 1));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const zones: Zone[] = [
    { id: '1', name: 'North Lobby', code: 'ZONE A-1', occupancyPercent: 88, capacityText: '88% Capacity', devices: '48/52', status: 'BUSY' },
    { id: '2', name: 'Lounge Area', code: 'ZONE B-4', occupancyPercent: 52, capacityText: '52% Capacity', devices: '124/180', status: 'MODERATE' },
    { id: '3', name: 'Gym & Wellness', code: 'ZONE D-2', occupancyPercent: 14, capacityText: '14% Capacity', devices: '34/80', status: 'QUIET' },
    { id: '4', name: 'Food Court', code: 'ZONE C-1', occupancyPercent: 92, capacityText: '92% Capacity', devices: '84/90', status: 'BUSY' },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* KPI Bento Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <span className="font-mono text-xs text-status-success font-bold">+12%</span>
          </div>
          <div>
            <h3 className="font-display text-4xl font-bold text-primary tracking-tight">2,450</h3>
            <p className="font-sans text-xs text-on-surface-variant font-medium mt-1">Total People Present</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <span className="font-mono text-[10px] font-bold text-secondary uppercase bg-teal-50 px-2 py-0.5 rounded-full">ACTIVE</span>
          </div>
          <div>
            <h3 className="font-display text-3xl font-bold text-primary tracking-tight">Lobby</h3>
            <p className="font-sans text-xs text-on-surface-variant font-medium mt-1">Busiest Zone</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="font-mono text-xs text-on-surface-variant font-bold">12 / 12</span>
          </div>
          <div>
            <h3 className="font-display text-4xl font-bold text-primary tracking-tight">12</h3>
            <p className="font-sans text-xs text-on-surface-variant font-medium mt-1">Buildings Active</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <PieChart className="w-5 h-5" />
            </div>
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2.5">
              <div className="w-[64%] h-full bg-secondary"></div>
            </div>
          </div>
          <div>
            <h3 className="font-display text-4xl font-bold text-primary tracking-tight">64%</h3>
            <p className="font-sans text-xs text-on-surface-variant font-medium mt-1">Avg Occupancy</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left floor plan & charts, Right list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Heat map block */}
          <div className="glass-card overflow-hidden h-[450px] relative rounded-2xl border border-slate-100">
            <div className="absolute top-6 left-6 z-10 space-y-1">
              <h4 className="font-display text-xl font-bold text-primary">Live Floor Heat Map</h4>
              <p className="font-sans text-xs text-on-surface-variant font-medium">Main Lobby - Level 0</p>
            </div>
            
            <div className="absolute top-6 right-6 z-10 flex gap-2">
              <button 
                onClick={() => onViewChange('floor-plan')}
                className="bg-white/85 hover:bg-white backdrop-blur p-2 rounded-xl shadow border border-slate-100 text-secondary transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onViewChange('floor-plan')}
                className="bg-white/85 hover:bg-white backdrop-blur p-2 rounded-xl shadow border border-slate-100 text-secondary transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated floor plan SVG and animated pulse spots */}
            <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-slate-50/50">
              {/* Abstract SVG Floor plan outline */}
              <svg className="w-[85%] h-[85%] opacity-20 stroke-primary fill-none" viewBox="0 0 800 600">
                <path d="M50 50h700v500H50z M150 150h200v200H150z M450 150h200v300H450z" strokeWidth="4" />
              </svg>
              
              {/* Pulsing thermal blobs */}
              <div 
                className="absolute w-36 h-36 rounded-full blur-[40px] bg-secondary/30 top-[25%] left-[35%] transition-transform duration-[1500ms]"
                style={{ transform: `scale(${pulseScale})` }}
              ></div>
              <div 
                className="absolute w-44 h-44 rounded-full blur-[50px] bg-chart-blue/20 top-[45%] left-[55%] transition-transform duration-[1500ms]"
                style={{ transform: `scale(${pulseScale * 0.9})`, animationDelay: '-0.5s' }}
              ></div>
              <div 
                className="absolute w-24 h-24 rounded-full blur-[25px] bg-secondary/40 top-[18%] left-[15%] transition-transform duration-[1500ms]"
                style={{ transform: `scale(${pulseScale * 1.1})`, animationDelay: '-1s' }}
              ></div>

              {/* Floating Re-calibrating Badge */}
              <div className="absolute bottom-6 left-6 bg-white/85 backdrop-blur-md px-4 py-3 border border-white/50 rounded-xl shadow-lg flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping"></div>
                <span className="font-mono text-[9px] font-bold text-primary tracking-wider uppercase">
                  RE-CALIBRATING SENSORS...
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Row Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Occupancy Trends chart card */}
            <div className="glass-card p-6 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-sans font-bold text-primary text-sm">Occupancy Trends</h4>
                <MoreHorizontal className="text-on-surface-variant hover:text-primary cursor-pointer w-4 h-4" />
              </div>
              <div className="h-32 w-full flex items-end justify-between gap-2.5 pt-4">
                {[40, 55, 45, 70, 92, 65, 50, 30].map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div 
                      className={`w-full rounded-t ${idx === 4 ? 'bg-secondary' : 'bg-slate-200 hover:bg-secondary/60 transition-colors'}`} 
                      style={{ height: `${val}%` }}
                    ></div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 font-mono text-[9px] text-on-surface-variant/85 font-semibold">
                <span>08:00</span>
                <span className="text-secondary font-bold">14:00</span>
                <span>20:00</span>
              </div>
            </div>

            {/* System Health Card */}
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden border border-slate-100">
              <div className="z-10 relative">
                <h4 className="font-sans font-bold text-primary text-sm">System Health</h4>
                <div className="mt-4 flex items-center gap-4">
                  <div className="text-3xl font-display font-extrabold text-status-success tracking-tight">99.8%</div>
                  <div className="font-mono text-[10px] font-bold text-on-surface-variant uppercase">Uptime</div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <CheckCircle2 className="text-status-success w-4.5 h-4.5 fill-status-success/15" />
                  <span className="font-sans text-xs text-on-surface font-semibold">All 452 sensors operational</span>
                </div>
              </div>
              
              {/* Stylized background watermark vector icon */}
              <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none text-slate-800">
                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Zone Breakdown */}
        <div className="space-y-6">
          <div className="glass-card p-6 flex flex-col rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-display text-lg font-bold text-primary">Zone Breakdown</h4>
              <button 
                onClick={() => onViewChange('floor-plan')}
                className="text-secondary hover:underline font-mono text-[10px] font-bold tracking-wider"
              >
                VIEW ALL
              </button>
            </div>

            <div className="space-y-3.5">
              {zones.map((zone) => {
                const isBusy = zone.status === 'BUSY';
                const isModerate = zone.status === 'MODERATE';
                const isQuiet = zone.status === 'QUIET';

                return (
                  <div 
                    key={zone.id}
                    onClick={() => onViewChange('floor-plan')}
                    className="p-4 rounded-xl hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all cursor-pointer group flex flex-col gap-3 bg-white"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          isBusy ? 'bg-red-50 text-error' : isModerate ? 'bg-teal-50 text-secondary' : 'bg-blue-50 text-blue-600'
                        }`}>
                          <Building2 className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <p className="font-sans font-bold text-sm text-primary group-hover:text-secondary transition-colors">{zone.name}</p>
                          <p className="font-mono text-[9px] font-semibold text-on-surface-variant/80 uppercase tracking-wider">{zone.code}</p>
                        </div>
                      </div>
                      
                      <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                        isBusy ? 'bg-red-50 text-error' : isModerate ? 'bg-teal-50 text-secondary' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {zone.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-50">
                      <span className="font-sans text-xs text-on-surface-variant font-medium">{zone.capacityText}</span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-secondary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA Generate Report */}
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center flex flex-col items-center">
              <Sparkles className="text-secondary w-5 h-5 mb-2 animate-bounce" />
              <p className="font-sans font-bold text-primary text-sm">Need more occupancy data?</p>
              <p className="font-sans text-xs text-on-surface-variant mt-1 mb-4 leading-normal">Export comprehensive space utilization reports securely as PDF or CSV.</p>
              <button 
                onClick={() => onViewChange('data-import')}
                className="w-full py-2.5 bg-white border border-slate-200 hover:border-secondary hover:bg-secondary hover:text-white rounded-lg font-mono text-[10px] font-bold text-secondary transition-all shadow-sm tracking-wider"
              >
                GENERATE EXPORT
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) */}
      <button 
        onClick={onAddBuilding}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full primary-gradient shadow-2xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        <span className="material-symbols-outlined text-3xl group-hover:rotate-90 transition-transform duration-300">add</span>
      </button>
    </div>
  );
}
