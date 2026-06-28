import { useState, MouseEvent } from 'react';
import { LayoutGrid, Grid, BadgeCheck, HelpCircle, AlertCircle, Plus, Sparkles, MapPin } from 'lucide-react';
import { Zone } from '../types';

export default function AreaSetupView() {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(2);
  const [drawnZones, setDrawnZones] = useState<Zone[]>([
    { id: 'z1', name: 'Original Lounge', code: 'ZONE A-1', occupancyPercent: 40, capacityText: '50 capacity', devices: '12', status: 'OPTIMAL' }
  ]);
  const [newZoneName, setNewZoneName] = useState('Engineering Sub-wing');
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [placedSensors, setPlacedSensors] = useState<{ id: string; name: string; x: number; y: number }[]>([]);

  const unplacedSensors = [
    { id: 's1', name: 'BLE Gateway 04', type: 'Bluetooth Hub' },
    { id: 's2', name: 'CO2 Monitor 02', type: 'CO2 Sensor' },
    { id: 's3', name: 'Occupancy Radar 08', type: 'Radar Sensor' }
  ].filter(s => !placedSensors.some(ps => ps.id === s.id));

  const handleSvgClick = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    if (selectedSensor) {
      // Place sensor instead of adding point
      const sensorDetails = unplacedSensors.find(s => s.id === selectedSensor);
      if (sensorDetails) {
        setPlacedSensors([...placedSensors, { id: sensorDetails.id, name: sensorDetails.name, x, y }]);
      }
      setSelectedSensor(null);
    } else {
      // Add polygon trace points
      setPoints([...points, { x, y }]);
    }
  };

  const handleClear = () => {
    setPoints([]);
  };

  const handleSaveZone = () => {
    if (points.length < 3) {
      alert('Please place at least 3 points to trace a completed zone boundary!');
      return;
    }

    const newZone: Zone = {
      id: String(Date.now()),
      name: newZoneName,
      code: `ZONE-${Math.floor(Math.random() * 900 + 100)}`,
      occupancyPercent: 0,
      capacityText: 'Configuring...',
      devices: `${placedSensors.length} Linked`,
      status: 'QUIET'
    };

    setDrawnZones([...drawnZones, newZone]);
    setPoints([]);
    setPlacedSensors([]);
    setCurrentStep(3);
  };

  return (
    <div className="flex-grow flex flex-col lg:flex-row relative h-[calc(100vh-80px)] overflow-hidden font-sans">
      
      {/* Main setup wizard frame on the left */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50">
        
        {/* Step Indicator */}
        <section className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-bold text-primary">Area Setup Wizard</h2>
              <p className="font-sans text-xs text-on-surface-variant font-medium">Define custom workspace areas and map IoT sensor topologies physically</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Step 1 */}
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-teal-50 text-secondary border border-teal-100 flex items-center justify-center font-mono text-[10px] font-bold">1</span>
                <span className="text-[10px] font-mono font-bold text-slate-400">FLOOR</span>
              </div>
              <div className="w-6 h-px bg-slate-200"></div>
              {/* Step 2 */}
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center font-mono text-[10px] font-bold shadow-md">2</span>
                <span className="text-[10px] font-mono font-bold text-primary">BOUNDARY</span>
              </div>
              <div className="w-6 h-px bg-slate-200"></div>
              {/* Step 3 */}
              <div className="flex items-center gap-1.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                  currentStep === 3 ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-400'
                }`}>3</span>
                <span className={`text-[10px] font-mono font-bold ${currentStep === 3 ? 'text-primary' : 'text-slate-400'}`}>SENSORS</span>
              </div>
            </div>
          </div>
        </section>

        {/* Wizard SVG Board */}
        <div className="glass-card rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping"></div>
              <span className="font-mono text-[10px] font-bold text-primary uppercase tracking-wider">TRACE BOUNDARY MODULE</span>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="text" 
                value={newZoneName} 
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="Zone Name" 
                className="bg-white border border-slate-200 rounded-lg text-xs font-semibold px-3 py-1 focus:border-secondary outline-none text-primary"
              />
            </div>
          </div>

          <div className="p-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3 text-secondary text-xs font-medium">
            <Sparkles className="w-4 h-4 animate-bounce" />
            <span>Click anywhere on the grid layout below to trace boundary points. Select a sensor on the right to place it.</span>
          </div>

          {/* Interactive Drawboard SVG */}
          <div className="h-96 relative bg-slate-50 flex items-center justify-center overflow-hidden">
            {/* Dots Grid background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-70"></div>
            
            <svg 
              onClick={handleSvgClick}
              className="w-full h-full cursor-crosshair z-10" 
              viewBox="0 0 800 400"
            >
              {/* Existing drawn boundaries */}
              {drawnZones.map((zone, idx) => (
                <rect 
                  key={idx} 
                  x="60" 
                  y="60" 
                  width="200" 
                  height="180" 
                  fill="rgba(0, 106, 97, 0.05)" 
                  stroke="rgba(0, 106, 97, 0.2)" 
                  strokeDasharray="4 4" 
                  strokeWidth="2"
                />
              ))}

              {/* Live drawing polygon face */}
              {points.length > 1 && (
                <polygon 
                  points={points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="rgba(0, 106, 97, 0.15)"
                  stroke="#006a61"
                  strokeWidth="2.5"
                />
              )}

              {/* Placed sensors visual markers */}
              {placedSensors.map((sensor) => (
                <g key={sensor.id} transform={`translate(${sensor.x}, ${sensor.y})`}>
                  <circle cx="0" cy="0" r="10" className="fill-secondary/25 animate-ping"></circle>
                  <circle cx="0" cy="0" r="5" fill="#006a61"></circle>
                  <text className="font-mono text-[9px] fill-slate-700 pointer-events-none" x="8" y="3">{sensor.name}</text>
                </g>
              ))}

              {/* Individual coordinate points */}
              {points.map((p, idx) => (
                <g key={idx} transform={`translate(${p.x}, ${p.y})`}>
                  <circle 
                    cx="0" 
                    cy="0" 
                    r="4.5" 
                    fill={idx === 0 ? '#ba1a1a' : '#006a61'} 
                    className="hover:scale-125 transition-transform cursor-pointer"
                  />
                  <text className="font-mono text-[9px] fill-slate-500 pointer-events-none" x="6" y="-6">P{idx + 1}</text>
                </g>
              ))}
            </svg>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/30">
            <button 
              onClick={handleClear}
              className="py-2 px-4 rounded-xl border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 text-xs font-bold transition-all bg-white shadow-sm"
            >
              Clear Points
            </button>
            <button 
              onClick={handleSaveZone}
              className="py-2.5 px-5 bg-secondary hover:bg-opacity-95 text-white text-xs font-bold font-sans rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <BadgeCheck className="w-4 h-4" /> Save Boundary & Link Sensors
            </button>
          </div>
        </div>
      </div>

      {/* Sensor Docking Sidebar Panel */}
      <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col p-6 z-10 h-full">
        <div>
          <h3 className="font-display text-lg font-bold text-primary">Sensor Repository</h3>
          <p className="text-on-surface-variant text-xs mt-1">Available physical nodes in workspace</p>
        </div>

        <div className="space-y-4 flex-grow overflow-y-auto mt-6 pr-1">
          {unplacedSensors.length > 0 ? (
            unplacedSensors.map((sensor) => {
              const isSelected = selectedSensor === sensor.id;
              return (
                <div 
                  key={sensor.id}
                  onClick={() => setSelectedSensor(isSelected ? null : sensor.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-teal-50/50 border-secondary shadow-sm' 
                      : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <p className="font-sans font-bold text-sm text-primary">{sensor.name}</p>
                  <p className="font-mono text-[9px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">{sensor.type}</p>
                  
                  {isSelected && (
                    <div className="mt-3 py-1.5 px-3 bg-secondary text-white text-[10px] font-bold font-mono rounded-lg text-center tracking-wider animate-pulse">
                      CLICK CANVAS TO PLACE
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="font-sans text-xs font-semibold text-primary">All Sensors Positioned</p>
              <p className="font-sans text-[11px] text-slate-400 mt-1 leading-normal">Drag-and-drop or browse workspace spreadsheets to add more gateways.</p>
            </div>
          )}

          {/* List of active mapped areas */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="text-[10px] font-mono font-bold text-slate-400 mb-4 uppercase tracking-wider">Active Custom Areas ({drawnZones.length})</h4>
            <div className="space-y-3">
              {drawnZones.map((z) => (
                <div key={z.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-sans font-bold text-xs text-primary">{z.name}</p>
                    <p className="font-mono text-[9px] text-slate-400 mt-0.5 font-bold">{z.code}</p>
                  </div>
                  <span className="font-mono text-[9px] font-bold text-secondary">{z.devices}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
