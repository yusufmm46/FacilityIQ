import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SignInView from './components/SignInView';
import DashboardView from './components/DashboardView';
import FloorPlanView from './components/FloorPlanView';
import AnalyticsView from './components/AnalyticsView';
import BuildingsView from './components/BuildingsView';
import AreaSetupView from './components/AreaSetupView';
import SettingsView from './components/SettingsView';

import './index.css';

function Toast() {
  const { notification } = useApp();
  if (!notification) return null;

  const cfg = {
    success: { icon: CheckCircle2, cls: 'bg-green-50 border-green-200 text-green-800' },
    error:   { icon: XCircle,       cls: 'bg-red-50 border-red-200 text-error' },
    warning: { icon: AlertTriangle,  cls: 'bg-amber-50 border-amber-200 text-amber-800' },
    info:    { icon: Info,           cls: 'bg-blue-50 border-blue-200 text-blue-800' },
  };
  const { icon: Icon, cls } = cfg[notification.type] || cfg.info;

  return (
    <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-xl animate-scale-up max-w-sm ${cls}`}>
      <Icon className="w-5 h-5 shrink-0" />
      <p className="font-sans text-sm font-semibold">{notification.message}</p>
    </div>
  );
}

function AppInner() {
  // Restore session from sessionStorage so a page refresh keeps the user signed in
  const [isSignedIn, setIsSignedIn] = useState(() => sessionStorage.getItem('fiq_signed_in') === 'true');
  const [userEmail, setUserEmail] = useState(() => sessionStorage.getItem('fiq_user_email') || '');
  const { currentView, setCurrentView, loadBuildings, loadOrganisations, showNotification } = useApp();

  // On a refresh where we were already signed in, re-bootstrap data from the API
  useEffect(() => {
    if (isSignedIn) {
      loadOrganisations();
      loadBuildings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Settings — UI preferences, persisted to localStorage so they survive refresh
  const persisted = (() => {
    try { return JSON.parse(localStorage.getItem('fiq_settings') || '{}'); }
    catch { return {}; }
  })();
  const [alertThreshold, setAlertThreshold] = useState(persisted.alertThreshold ?? 90);
  const [alertsEnabled, setAlertsEnabled] = useState(persisted.alertsEnabled ?? true);
  const [sensorOfflineWarning, setSensorOfflineWarning] = useState(persisted.sensorOfflineWarning ?? true);
  const [predictiveNotifications, setPredictiveNotifications] = useState(persisted.predictiveNotifications ?? false);
  const [operatingHoursStart, setOperatingHoursStart] = useState(persisted.operatingHoursStart ?? '08:00');
  const [operatingHoursEnd, setOperatingHoursEnd] = useState(persisted.operatingHoursEnd ?? '20:00');
  const [maxLoadCapacity, setMaxLoadCapacity] = useState(persisted.maxLoadCapacity ?? 1250);

  const persistSettings = () => {
    localStorage.setItem('fiq_settings', JSON.stringify({
      alertThreshold, alertsEnabled, sensorOfflineWarning, predictiveNotifications,
      operatingHoursStart, operatingHoursEnd, maxLoadCapacity,
    }));
  };

  const handleLogin = async (email) => {
    setUserEmail(email);
    setIsSignedIn(true);
    setCurrentView('dashboard');
    sessionStorage.setItem('fiq_signed_in', 'true');
    sessionStorage.setItem('fiq_user_email', email);
    // Bootstrap data
    await loadOrganisations();
    await loadBuildings();
  };

  const handleLogout = () => {
    setIsSignedIn(false);
    setUserEmail('');
    setCurrentView('dashboard');
    sessionStorage.removeItem('fiq_signed_in');
    sessionStorage.removeItem('fiq_user_email');
  };

  if (!isSignedIn) {
    return <SignInView onLoginSuccess={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 font-sans">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header
          currentView={currentView}
          onViewChange={setCurrentView}
          onLogout={handleLogout}
          userEmail={userEmail}
        />
        <main className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && (
            <div className="p-6"><DashboardView onViewChange={setCurrentView} /></div>
          )}
          {currentView === 'floor-plan' && <FloorPlanView />}
          {currentView === 'analytics' && <AnalyticsView />}
          {currentView === 'buildings' && (
            <div className="p-6"><BuildingsView /></div>
          )}
          {currentView === 'area-setup' && <AreaSetupView onViewChange={setCurrentView} />}
          {currentView === 'settings' && (
            <div className="p-6">
              <SettingsView
                alertThreshold={alertThreshold} setAlertThreshold={setAlertThreshold}
                alertsEnabled={alertsEnabled} setAlertsEnabled={setAlertsEnabled}
                sensorOfflineWarning={sensorOfflineWarning} setSensorOfflineWarning={setSensorOfflineWarning}
                predictiveNotifications={predictiveNotifications} setPredictiveNotifications={setPredictiveNotifications}
                operatingHoursStart={operatingHoursStart} setOperatingHoursStart={setOperatingHoursStart}
                operatingHoursEnd={operatingHoursEnd} setOperatingHoursEnd={setOperatingHoursEnd}
                maxLoadCapacity={maxLoadCapacity} setMaxLoadCapacity={setMaxLoadCapacity}
                userEmail={userEmail}
                onSave={() => { persistSettings(); showNotification('success', 'Settings saved.'); }}
              />
            </div>
          )}
        </main>
      </div>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
