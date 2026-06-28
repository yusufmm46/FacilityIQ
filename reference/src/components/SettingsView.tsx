import { useState, FormEvent } from 'react';
import { ShieldCheck, Sliders, Bell, BrainCircuit, RefreshCw, BadgeCheck, HelpCircle } from 'lucide-react';

interface SettingsProps {
  alertThreshold: number;
  setAlertThreshold: (val: number) => void;
  alertsEnabled: boolean;
  setAlertsEnabled: (val: boolean) => void;
  sensorOfflineWarning: boolean;
  setSensorOfflineWarning: (val: boolean) => void;
  predictiveNotifications: boolean;
  setPredictiveNotifications: (val: boolean) => void;
  operatingHoursStart: string;
  setOperatingHoursStart: (val: string) => void;
  operatingHoursEnd: string;
  setOperatingHoursEnd: (val: string) => void;
  maxLoadCapacity: number;
  setMaxLoadCapacity: (val: number) => void;
  intelligenceMode: string;
  setIntelligenceMode: (val: string) => void;
  dataRetention: string;
  setDataRetention: (val: string) => void;
  onSave: () => void;
}

export default function SettingsView({
  alertThreshold, setAlertThreshold,
  alertsEnabled, setAlertsEnabled,
  sensorOfflineWarning, setSensorOfflineWarning,
  predictiveNotifications, setPredictiveNotifications,
  operatingHoursStart, setOperatingHoursStart,
  operatingHoursEnd, setOperatingHoursEnd,
  maxLoadCapacity, setMaxLoadCapacity,
  intelligenceMode, setIntelligenceMode,
  dataRetention, setDataRetention,
  onSave
}: SettingsProps) {
  // Local profile states
  const [profileName, setProfileName] = useState('Alex Rivera');
  const [profileEmail, setProfileEmail] = useState('alex.rivera@facilityiq.com');
  const [profileTitle, setProfileTitle] = useState('OPERATIONS HEAD');
  const [isSaved, setIsSaved] = useState(false);

  const intelligencePresets = [
    { name: 'Maximum Sensitivity', desc: 'Accelerates alert dispatches; highly precise micro-counts.' },
    { name: 'Balanced Intelligence', desc: 'Smooths sensor packet noise; standard enterprise calibration.' },
    { name: 'Conservative Auditing', desc: 'Triggers alerts only upon sustained congestion thresholds.' }
  ];

  const handleSaveAll = (e: FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    onSave();
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto w-full font-sans select-none pb-12">
      
      {/* Intro block */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 space-y-1">
        <h2 className="font-display text-2xl font-bold text-primary">System Control Center</h2>
        <p className="font-sans text-xs text-on-surface-variant font-medium">Configure deep neural calibrations, safety boundaries, and profile states globally.</p>
      </section>

      <form onSubmit={handleSaveAll} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left column: Profile & threshold */}
        <div className="md:col-span-7 space-y-6">
          
          {/* User Profile info */}
          <div className="glass-card rounded-2xl p-6 bg-white border border-slate-100/80 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border-2 border-secondary/20 overflow-hidden shadow-md">
                <img 
                  className="w-full h-full object-cover" 
                  alt="Profile Photo"
                  referrerPolicy="no-referrer"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZrOt3tbLUxQ-7BxYM6IpbGjilKQJMLqwJSAFQijkT1e7FK1RKaNfvVlECxRb6LtozVr9dD4dEEhxHGiDRWbkQMGq6HZ9qZZwX0EJpWwjSyCGNCdxHzrcOY3wMaayo7zmT2zxKIA-Cayhi0sMq7WJH_epvuFHzXMbjNd1n_V3kIH-hoU0XVMO_2Wz6MyM0bOdEefjy6v2L24yuAd6AAabRjjJpp89qxmwP8iEBz7cGBVtGRXdgkhHq5C4Sq1RzCFdQyeb5cpVnZwc"
                />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-primary">Alex Rivera</h3>
                <p className="font-mono text-[9px] font-bold text-secondary uppercase tracking-widest mt-1">OPERATIONS HEAD</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="font-mono text-[10px] uppercase font-bold text-slate-400">Display Name</label>
                <input 
                  type="text" 
                  value={profileName} 
                  onChange={(e) => setProfileName(e.target.value)}
                  className="bg-slate-50 border border-slate-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10 rounded-xl text-xs font-semibold py-2.5 px-4 outline-none transition-all"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="font-mono text-[10px] uppercase font-bold text-slate-400">Enterprise Email</label>
                <input 
                  type="email" 
                  value={profileEmail} 
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="bg-slate-50 border border-slate-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10 rounded-xl text-xs font-semibold py-2.5 px-4 outline-none transition-all"
                />
              </div>

              <div className="flex flex-col space-y-1 sm:col-span-2">
                <label className="font-mono text-[10px] uppercase font-bold text-slate-400">Designation Title</label>
                <input 
                  type="text" 
                  value={profileTitle} 
                  onChange={(e) => setProfileTitle(e.target.value)}
                  className="bg-slate-50 border border-slate-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10 rounded-xl text-xs font-semibold py-2.5 px-4 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Safety limits sliding panels */}
          <div className="glass-card rounded-2xl p-6 bg-white border border-slate-100/80 space-y-6">
            <div className="flex items-center gap-2.5">
              <Sliders className="text-secondary w-5 h-5" />
              <h3 className="font-display text-base font-bold text-primary">Safety & Load Threshold Limits</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-700">Congestion Alert Dispatch Threshold</span>
                <span className="font-mono font-extrabold text-secondary text-sm bg-teal-50 px-2.5 py-0.5 rounded">{alertThreshold}%</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="100" 
                value={alertThreshold} 
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-secondary"
              />
              <p className="text-[11px] text-on-surface-variant leading-normal">
                Dispatches high-priority notifications immediately to managers once building occupancy reaches this set parameter.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-5">
              <div className="flex flex-col space-y-1">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Max Capacity</label>
                <input 
                  type="number" 
                  value={maxLoadCapacity} 
                  onChange={(e) => setMaxLoadCapacity(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold py-2 px-3 outline-none"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Hours From</label>
                <input 
                  type="time" 
                  value={operatingHoursStart} 
                  onChange={(e) => setOperatingHoursStart(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold py-2 px-3 outline-none"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Hours To</label>
                <input 
                  type="time" 
                  value={operatingHoursEnd} 
                  onChange={(e) => setOperatingHoursEnd(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold py-2 px-3 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Toggles and Presets */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Intelligence Presets list */}
          <div className="glass-card rounded-2xl p-6 bg-white border border-slate-100/80 space-y-5">
            <div className="flex items-center gap-2.5">
              <BrainCircuit className="text-secondary w-5 h-5" />
              <h3 className="font-display text-base font-bold text-primary">Intelligence Modes</h3>
            </div>

            <div className="space-y-3">
              {intelligencePresets.map((preset) => {
                const isActive = intelligenceMode === preset.name;
                return (
                  <div 
                    key={preset.name}
                    onClick={() => setIntelligenceMode(preset.name)}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-teal-50/40 border-secondary' 
                        : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <p className={`font-sans font-bold text-xs ${isActive ? 'text-secondary' : 'text-primary'}`}>{preset.name}</p>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-normal">{preset.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Toggles panel */}
          <div className="glass-card rounded-2xl p-6 bg-white border border-slate-100/80 space-y-5">
            <div className="flex items-center gap-2.5">
              <Bell className="text-secondary w-5 h-5" />
              <h3 className="font-display text-base font-bold text-primary">Notifications & Sync</h3>
            </div>

            <div className="space-y-4">
              {/* Toggle 1 */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-primary">Live Alarm Notifications</p>
                  <p className="text-[11px] text-on-surface-variant">Sends alert dispatches instantly on critical loads.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={alertsEnabled}
                  onChange={(e) => setAlertsEnabled(e.target.checked)}
                  className="w-9 h-5 rounded-full appearance-none bg-slate-200 checked:bg-secondary cursor-pointer relative before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform"
                />
              </div>

              {/* Toggle 2 */}
              <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                <div>
                  <p className="text-xs font-bold text-primary">Sensor Offline Warnings</p>
                  <p className="text-[11px] text-on-surface-variant">Log warnings immediately when IoT signal pings are missing.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={sensorOfflineWarning}
                  onChange={(e) => setSensorOfflineWarning(e.target.checked)}
                  className="w-9 h-5 rounded-full appearance-none bg-slate-200 checked:bg-secondary cursor-pointer relative before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform"
                />
              </div>

              {/* Toggle 3 */}
              <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                <div>
                  <p className="text-xs font-bold text-primary">Predictive Notifications</p>
                  <p className="text-[11px] text-on-surface-variant">Forecasts building load trends 2 hours ahead using ML models.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={predictiveNotifications}
                  onChange={(e) => setPredictiveNotifications(e.target.checked)}
                  className="w-9 h-5 rounded-full appearance-none bg-slate-200 checked:bg-secondary cursor-pointer relative before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform"
                />
              </div>

              {/* Policy Dropdown */}
              <div className="flex flex-col space-y-1.5 border-t border-slate-50 pt-4">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Data Retention Strategy</label>
                <select 
                  value={dataRetention} 
                  onChange={(e) => setDataRetention(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold py-2 px-3 outline-none cursor-pointer"
                >
                  <option value="90 Days (Enterprise)">90 Days (Enterprise Retention)</option>
                  <option value="30 Days (Standard)">30 Days (Standard Retention)</option>
                  <option value="365 Days (Longterm)">365 Days (Longterm Archive)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submits */}
          <button 
            type="submit"
            disabled={isSaved}
            className={`w-full py-3.5 rounded-full font-display font-bold text-white shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer ${
              isSaved ? 'bg-[#2EA056]' : 'brand-gradient-btn hover:opacity-95'
            }`}
          >
            {isSaved ? (
              <>
                <BadgeCheck className="w-5 h-5" />
                <span>Configurations Saved</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Save Control Calibration</span>
              </>
            )}
          </button>

        </div>
      </form>

    </div>
  );
}
