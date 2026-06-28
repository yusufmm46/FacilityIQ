import React, { useState } from 'react';
import { Sliders, Bell, BrainCircuit, RefreshCw, BadgeCheck } from 'lucide-react';

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-secondary' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

const INTELLIGENCE_PRESETS = [
  { name: 'Maximum Sensitivity', desc: 'Accelerates alert dispatches; highly precise micro-counts.' },
  { name: 'Balanced Intelligence', desc: 'Smooths sensor packet noise; standard enterprise calibration.' },
  { name: 'Conservative Auditing', desc: 'Triggers alerts only upon sustained congestion thresholds.' },
];

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
  onSave,
}) {
  const [profileName, setProfileName] = useState('Alex Rivera');
  const [profileEmail, setProfileEmail] = useState('alex.rivera@facilityiq.com');
  const [profileTitle, setProfileTitle] = useState('OPERATIONS HEAD');
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveAll = (e) => {
    e.preventDefault();
    setIsSaved(true);
    onSave();
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto w-full font-sans select-none pb-12">

      {/* Intro */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 space-y-1">
        <h2 className="font-display text-2xl font-bold text-primary">System Control Center</h2>
        <p className="font-sans text-xs text-on-surface-variant font-medium">
          Configure deep neural calibrations, safety boundaries, and profile states globally.
        </p>
      </section>

      <form onSubmit={handleSaveAll} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

        {/* Left column */}
        <div className="md:col-span-7 space-y-6">

          {/* Profile card */}
          <div className="glass-card rounded-2xl p-6 bg-white border border-slate-100/80 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border-2 border-secondary/20 bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center shadow-md">
                <span className="text-2xl font-bold text-secondary">AR</span>
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
                  onChange={e => setProfileName(e.target.value)}
                  className="bg-slate-50 border border-slate-200 focus:border-secondary rounded-xl text-xs font-semibold py-2.5 px-4 outline-none transition-all"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="font-mono text-[10px] uppercase font-bold text-slate-400">Enterprise Email</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={e => setProfileEmail(e.target.value)}
                  className="bg-slate-50 border border-slate-200 focus:border-secondary rounded-xl text-xs font-semibold py-2.5 px-4 outline-none transition-all"
                />
              </div>
              <div className="flex flex-col space-y-1 sm:col-span-2">
                <label className="font-mono text-[10px] uppercase font-bold text-slate-400">Designation Title</label>
                <input
                  type="text"
                  value={profileTitle}
                  onChange={e => setProfileTitle(e.target.value)}
                  className="bg-slate-50 border border-slate-200 focus:border-secondary rounded-xl text-xs font-semibold py-2.5 px-4 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Safety thresholds */}
          <div className="glass-card rounded-2xl p-6 bg-white border border-slate-100/80 space-y-6">
            <div className="flex items-center gap-2.5">
              <Sliders className="text-secondary w-5 h-5" />
              <h3 className="font-display text-base font-bold text-primary">Safety & Load Threshold Limits</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-700">Congestion Alert Dispatch Threshold</span>
                <span className="font-mono font-extrabold text-secondary text-sm bg-teal-50 px-2.5 py-0.5 rounded">
                  {alertThreshold}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={alertThreshold}
                onChange={e => setAlertThreshold(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-secondary"
              />
              <p className="text-[11px] text-on-surface-variant leading-normal">
                Dispatches high-priority notifications to managers once building occupancy reaches this set parameter.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-5">
              <div className="flex flex-col space-y-1">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Max Capacity</label>
                <input
                  type="number"
                  value={maxLoadCapacity}
                  onChange={e => setMaxLoadCapacity(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold py-2 px-3 outline-none"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Hours From</label>
                <input
                  type="time"
                  value={operatingHoursStart}
                  onChange={e => setOperatingHoursStart(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold py-2 px-3 outline-none"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Hours To</label>
                <input
                  type="time"
                  value={operatingHoursEnd}
                  onChange={e => setOperatingHoursEnd(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold py-2 px-3 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="md:col-span-5 space-y-6">

          {/* Intelligence modes */}
          <div className="glass-card rounded-2xl p-6 bg-white border border-slate-100/80 space-y-5">
            <div className="flex items-center gap-2.5">
              <BrainCircuit className="text-secondary w-5 h-5" />
              <h3 className="font-display text-base font-bold text-primary">Intelligence Modes</h3>
            </div>
            <div className="space-y-3">
              {INTELLIGENCE_PRESETS.map(preset => {
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
                    <p className={`font-sans font-bold text-xs ${isActive ? 'text-secondary' : 'text-primary'}`}>
                      {preset.name}
                    </p>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-normal">{preset.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notifications */}
          <div className="glass-card rounded-2xl p-6 bg-white border border-slate-100/80 space-y-5">
            <div className="flex items-center gap-2.5">
              <Bell className="text-secondary w-5 h-5" />
              <h3 className="font-display text-base font-bold text-primary">Notifications & Sync</h3>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: 'Live Alarm Notifications',
                  desc: 'Sends alert dispatches instantly on critical loads.',
                  val: alertsEnabled,
                  set: setAlertsEnabled,
                },
                {
                  label: 'Sensor Offline Warnings',
                  desc: 'Log warnings immediately when IoT signal pings are missing.',
                  val: sensorOfflineWarning,
                  set: setSensorOfflineWarning,
                },
                {
                  label: 'Predictive Notifications',
                  desc: 'Forecasts building load trends 2 hours ahead using ML models.',
                  val: predictiveNotifications,
                  set: setPredictiveNotifications,
                },
              ].map((toggle, i) => (
                <div key={toggle.label} className={`flex items-center justify-between ${i > 0 ? 'border-t border-slate-50 pt-3' : ''}`}>
                  <div>
                    <p className="text-xs font-bold text-primary">{toggle.label}</p>
                    <p className="text-[11px] text-on-surface-variant">{toggle.desc}</p>
                  </div>
                  <Toggle checked={toggle.val} onChange={toggle.set} />
                </div>
              ))}

              <div className="flex flex-col space-y-1.5 border-t border-slate-50 pt-4">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Data Retention Strategy</label>
                <select
                  value={dataRetention}
                  onChange={e => setDataRetention(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold py-2 px-3 outline-none cursor-pointer"
                >
                  <option value="90 Days (Enterprise)">90 Days (Enterprise Retention)</option>
                  <option value="30 Days (Standard)">30 Days (Standard Retention)</option>
                  <option value="365 Days (Longterm)">365 Days (Longterm Archive)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save button */}
          <button
            type="submit"
            disabled={isSaved}
            className={`w-full py-3.5 rounded-full font-display font-bold text-white shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer ${
              isSaved ? 'bg-status-success' : 'brand-gradient-btn hover:opacity-95'
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
