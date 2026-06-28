import { useState, FormEvent } from 'react';
import { ViewType, Building, LogMessage } from './types';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SignInView from './components/SignInView';
import DashboardView from './components/DashboardView';
import FloorPlanView from './components/FloorPlanView';
import AnalyticsView from './components/AnalyticsView';
import BuildingsView from './components/BuildingsView';
import DataImportView from './components/DataImportView';
import AreaSetupView from './components/AreaSetupView';
import SettingsView from './components/SettingsView';

import { X, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('signin');
  const [userEmail, setUserEmail] = useState('');

  // Global Sync Logs State
  const [logs, setLogs] = useState<LogMessage[]>([
    { time: '14:40:02', type: 'info', text: 'FacilityIQ Core Sync boot sequence complete.' },
    { time: '14:40:15', type: 'success', text: 'Synced 142 wireless client records from gateway C-12.' },
    { time: '14:42:01', type: 'warn', text: 'Packet delay high on Wi-Fi Sensor 04 (Lounge Area).' }
  ]);

  const handleAddLog = (text: string, type: 'info' | 'success' | 'warn' | 'error' | 'sync') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [{ time, type, text }, ...prev]);
  };

  // Building Portfolio State
  const [buildings, setBuildings] = useState<Building[]>([
    {
      id: 'one-tech-plaza',
      name: 'One Tech Plaza',
      location: '104 Tech Boulevard',
      floors: 12,
      occupancyPercent: 72,
      status: 'OPTIMAL',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'innovation-hub',
      name: 'Innovation Hub',
      location: '88 Silicon Way',
      floors: 6,
      occupancyPercent: 89,
      status: 'CROWDED',
      imageUrl: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 'harbor-complex',
      name: 'Harbor Complex',
      location: 'Pier 14 Waterfront',
      floors: 4,
      occupancyPercent: 22,
      status: 'MAINTENANCE',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800'
    }
  ]);

  const [activeBuildingId, setActiveBuildingId] = useState('one-tech-plaza');

  // Control Center calibration states
  const [alertThreshold, setAlertThreshold] = useState(90);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [sensorOfflineWarning, setSensorOfflineWarning] = useState(true);
  const [predictiveNotifications, setPredictiveNotifications] = useState(false);
  const [operatingHoursStart, setOperatingHoursStart] = useState('08:00');
  const [operatingHoursEnd, setOperatingHoursEnd] = useState('20:00');
  const [maxLoadCapacity, setMaxLoadCapacity] = useState(1250);
  const [intelligenceMode, setIntelligenceMode] = useState('Balanced Intelligence');
  const [dataRetention, setDataRetention] = useState('90 Days (Enterprise)');

  // Modal layers states
  const [isAddBuildingOpen, setIsAddBuildingOpen] = useState(false);
  const [isEditBuildingOpen, setIsEditBuildingOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);

  // Modal form states
  const [newBName, setNewBName] = useState('');
  const [newBLocation, setNewBLocation] = useState('');
  const [newBFloors, setNewBFloors] = useState(5);
  const [newBOccupancy, setNewBOccupancy] = useState(50);
  const [newBStatus, setNewBStatus] = useState<'OPTIMAL' | 'CROWDED' | 'MAINTENANCE'>('OPTIMAL');

  const handleLogin = (email: string) => {
    setUserEmail(email);
    setCurrentView('dashboard');
    handleAddLog(`User authenticated as: ${email}. Initialising dashboard layouts...`, 'info');
  };

  const handleLogout = () => {
    setUserEmail('');
    setCurrentView('signin');
  };

  const activeBuilding = buildings.find(b => b.id === activeBuildingId) || buildings[0];

  const handleCreateBuilding = (e: FormEvent) => {
    e.preventDefault();
    if (!newBName || !newBLocation) return;

    const newBuilding: Building = {
      id: newBName.toLowerCase().replace(/\s+/g, '-'),
      name: newBName,
      location: newBLocation,
      floors: newBFloors,
      occupancyPercent: newBOccupancy,
      status: newBStatus,
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800'
    };

    setBuildings([...buildings, newBuilding]);
    setIsAddBuildingOpen(false);
    
    // Clear inputs
    setNewBName('');
    setNewBLocation('');
    setNewBFloors(5);
    setNewBOccupancy(50);
    setNewBStatus('OPTIMAL');

    handleAddLog(`Added new facility: ${newBName} placed into production queues.`, 'success');
  };

  const handleSaveEditBuilding = (e: FormEvent) => {
    e.preventDefault();
    if (!editingBuilding) return;

    setBuildings(buildings.map(b => b.id === editingBuilding.id ? editingBuilding : b));
    setIsEditBuildingOpen(false);
    setEditingBuilding(null);

    handleAddLog(`Updated parameters for facility: ${editingBuilding.name}.`, 'success');
  };

  const handleSaveCalibration = () => {
    handleAddLog(`Control parameters successfully updated. Current limit: ${alertThreshold}%, Mode: ${intelligenceMode}.`, 'success');
  };

  if (currentView === 'signin') {
    return <SignInView onLoginSuccess={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 font-sans">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onLogout={handleLogout} 
      />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header 
          currentView={currentView} 
          onViewChange={setCurrentView} 
          onLogout={handleLogout} 
          activeBuildingName={activeBuilding.name}
        />

        <main className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && (
            <div className="p-6">
              <DashboardView 
                onViewChange={setCurrentView} 
                buildings={buildings} 
                onAddBuilding={() => setIsAddBuildingOpen(true)}
              />
            </div>
          )}

          {currentView === 'floor-plan' && <FloorPlanView />}

          {currentView === 'analytics' && <AnalyticsView />}

          {currentView === 'buildings' && (
            <div className="p-6">
              <BuildingsView 
                buildings={buildings} 
                onAddBuilding={() => setIsAddBuildingOpen(true)}
                onEditBuilding={(b) => {
                  setEditingBuilding(b);
                  setIsEditBuildingOpen(true);
                }}
              />
            </div>
          )}

          {currentView === 'data-import' && (
            <DataImportView logs={logs} onAddLog={handleAddLog} />
          )}

          {currentView === 'area-setup' && <AreaSetupView />}

          {currentView === 'settings' && (
            <div className="p-6">
              <SettingsView 
                alertThreshold={alertThreshold}
                setAlertThreshold={setAlertThreshold}
                alertsEnabled={alertsEnabled}
                setAlertsEnabled={setAlertsEnabled}
                sensorOfflineWarning={sensorOfflineWarning}
                setSensorOfflineWarning={setSensorOfflineWarning}
                predictiveNotifications={predictiveNotifications}
                setPredictiveNotifications={setPredictiveNotifications}
                operatingHoursStart={operatingHoursStart}
                setOperatingHoursStart={setOperatingHoursStart}
                operatingHoursEnd={operatingHoursEnd}
                setOperatingHoursEnd={setOperatingHoursEnd}
                maxLoadCapacity={maxLoadCapacity}
                setMaxLoadCapacity={setMaxLoadCapacity}
                intelligenceMode={intelligenceMode}
                setIntelligenceMode={setIntelligenceMode}
                dataRetention={dataRetention}
                setDataRetention={setDataRetention}
                onSave={handleSaveCalibration}
              />
            </div>
          )}
        </main>
      </div>

      {/* Add Building modal */}
      {isAddBuildingOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/45 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 flex flex-col space-y-5 animate-scale-up">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-display text-lg font-bold text-primary">Add Facility Estate</h3>
              <button 
                onClick={() => setIsAddBuildingOpen(false)}
                className="text-slate-400 hover:text-primary transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBuilding} className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Building Name</label>
                <input 
                  type="text" 
                  required
                  value={newBName}
                  onChange={(e) => setNewBName(e.target.value)}
                  placeholder="One Tech Plaza"
                  className="bg-slate-50 border border-slate-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10 rounded-xl text-xs font-semibold py-2.5 px-4 outline-none"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Street Address</label>
                <input 
                  type="text" 
                  required
                  value={newBLocation}
                  onChange={(e) => setNewBLocation(e.target.value)}
                  placeholder="104 Tech Boulevard"
                  className="bg-slate-50 border border-slate-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10 rounded-xl text-xs font-semibold py-2.5 px-4 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Total Floors</label>
                  <input 
                    type="number" 
                    required
                    value={newBFloors}
                    onChange={(e) => setNewBFloors(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold py-2.5 px-3"
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Occupancy %</label>
                  <input 
                    type="number" 
                    required
                    value={newBOccupancy}
                    onChange={(e) => setNewBOccupancy(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold py-2.5 px-3"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Operational Status</label>
                <select 
                  value={newBStatus}
                  onChange={(e) => setNewBStatus(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold py-2.5 px-3 cursor-pointer"
                >
                  <option value="OPTIMAL">OPTIMAL</option>
                  <option value="CROWDED">CROWDED</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-secondary hover:bg-opacity-95 text-white font-sans font-bold text-xs rounded-full shadow-lg transition-all"
              >
                Provision Facility
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Building parameters modal */}
      {isEditBuildingOpen && editingBuilding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/45 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 flex flex-col space-y-5 animate-scale-up">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-display text-lg font-bold text-primary">Configure Facility</h3>
              <button 
                onClick={() => {
                  setIsEditBuildingOpen(false);
                  setEditingBuilding(null);
                }}
                className="text-slate-400 hover:text-primary transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBuilding} className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Building Name</label>
                <input 
                  type="text" 
                  required
                  value={editingBuilding.name}
                  onChange={(e) => setEditingBuilding({ ...editingBuilding, name: e.target.value })}
                  className="bg-slate-50 border border-slate-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10 rounded-xl text-xs font-semibold py-2.5 px-4 outline-none"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Street Address</label>
                <input 
                  type="text" 
                  required
                  value={editingBuilding.location}
                  onChange={(e) => setEditingBuilding({ ...editingBuilding, location: e.target.value })}
                  className="bg-slate-50 border border-slate-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10 rounded-xl text-xs font-semibold py-2.5 px-4 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Total Floors</label>
                  <input 
                    type="number" 
                    required
                    value={editingBuilding.floors}
                    onChange={(e) => setEditingBuilding({ ...editingBuilding, floors: Number(e.target.value) })}
                    className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold py-2.5 px-3"
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Occupancy %</label>
                  <input 
                    type="number" 
                    required
                    value={editingBuilding.occupancyPercent}
                    onChange={(e) => setEditingBuilding({ ...editingBuilding, occupancyPercent: Number(e.target.value) })}
                    className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold py-2.5 px-3"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Operational Status</label>
                <select 
                  value={editingBuilding.status}
                  onChange={(e) => setEditingBuilding({ ...editingBuilding, status: e.target.value as any })}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold py-2.5 px-3 cursor-pointer"
                >
                  <option value="OPTIMAL">OPTIMAL</option>
                  <option value="CROWDED">CROWDED</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-secondary hover:bg-opacity-95 text-white font-sans font-bold text-xs rounded-full shadow-lg transition-all"
              >
                Apply Parameters
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
