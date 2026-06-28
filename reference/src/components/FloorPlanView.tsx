import { useState } from 'react';
import { ZoomIn, ZoomOut, Compass, Info, ShieldAlert, BadgeCheck, CheckCircle2, SlidersHorizontal } from 'lucide-react';

export default function FloorPlanView() {
  const [activeTab, setActiveTab] = useState<'heatmap' | 'devices' | 'flow'>('heatmap');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [hoveredDevice, setHoveredDevice] = useState<number | null>(null);

  // Initial mockup devices
  const devices = [
    { id: 1, cx: 100, cy: 120 },
    { id: 2, cx: 120, cy: 150 },
    { id: 3, cx: 200, cy: 110 },
    { id: 4, cx: 250, cy: 200 },
    { id: 5, cx: 350, cy: 100 },
    { id: 6, cx: 380, cy: 150 },
    { id: 7, cx: 420, cy: 250 },
    { id: 8, cx: 480, cy: 120 },
    { id: 9, cx: 550, cy: 220 },
    { id: 10, cx: 580, cy: 80 },
    { id: 11, cx: 650, cy: 120 },
    { id: 12, cx: 670, cy: 150 },
    { id: 13, cx: 700, cy: 110 },
    { id: 14, cx: 750, cy: 200 },
    { id: 15, cx: 800, cy: 120 },
    { id: 16, cx: 820, cy: 150 },
    { id: 17, cx: 850, cy: 110 },
    { id: 18, cx: 900, cy: 200 }
  ];

  return (
    <div className="flex-1 flex flex-col relative h-[calc(100vh-80px)] overflow-hidden font-sans">
      
      {/* Tool bar & filter bar */}
      <section className="px-6 py-4 flex flex-wrap gap-4 items-center justify-between border-b border-slate-100 z-10 bg-white">
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-status-success animate-pulse"></span>
              <span className="text-[10px] font-mono font-bold text-on-surface uppercase tracking-wider">Live Mode</span>
            </div>
            <div className="h-4 w-[1px] bg-slate-200"></div>
            <span className="text-[10px] text-on-surface-variant font-mono font-semibold">OCT 12, 14:42:05</span>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-100">
            {(['heatmap', 'devices', 'flow'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider font-mono transition-all ${
                  activeTab === tab
                    ? 'bg-secondary text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-secondary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select className="bg-white border border-slate-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10 rounded-xl text-xs font-mono font-bold py-2 pl-4 pr-10 shadow-sm cursor-pointer">
            <option>Zone Status: All</option>
            <option>Optimal Only</option>
            <option>Warning Only</option>
            <option>Critical Only</option>
          </select>
          <select className="bg-white border border-slate-200 focus:border-secondary focus:ring-2 focus:ring-secondary/10 rounded-xl text-xs font-mono font-bold py-2 pl-4 pr-10 shadow-sm cursor-pointer">
            <option>Area: Engineering Wing</option>
            <option>Executive Floor</option>
            <option>Cafeteria Hub</option>
          </select>
          <button className="w-10 h-10 bg-white hover:bg-slate-50 rounded-xl shadow-sm border border-slate-200 flex items-center justify-center transition-colors">
            <SlidersHorizontal className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>
      </section>

      {/* Main floor map with status panel */}
      <div className="flex-1 flex relative overflow-hidden bg-slate-50/50">
        
        {/* Floor Plan Map Panel */}
        <div className="flex-1 relative flex items-center justify-center p-6 select-none overflow-hidden">
          <svg 
            className="w-full h-full drop-shadow-2xl max-w-4xl max-h-[500px]" 
            viewBox="0 0 1000 600" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background Floor Plate */}
            <path d="M50 50 L950 50 L950 550 L50 550 Z" fill="white" stroke="#c5c6ce" strokeWidth="2"></path>
            
            {/* Internal Walls */}
            <g fill="none" stroke="#dee2ed" strokeWidth="4">
              <path d="M300 50 L300 300 M300 350 L300 550"></path>
              <path d="M300 300 L600 300 M650 300 L950 300"></path>
              <path d="M600 50 L600 300"></path>
            </g>

            {/* Zone Overlays with high-contrast click indicators */}
            {/* Green Zone (COLAB_01) */}
            <path 
              onClick={() => setSelectedZone(selectedZone === 'colab' ? null : 'colab')}
              className={`transition-all duration-200 cursor-pointer ${
                selectedZone === 'colab' ? 'fill-secondary/35 stroke-secondary stroke-2' : 'fill-secondary/15 hover:fill-secondary/25'
              }`} 
              d="M50 50 L300 50 L300 300 L50 300 Z"
            ></path>
            <text className="font-mono font-bold text-[10px] fill-slate-700 pointer-events-none" x="70" y="80">COLAB_01 (42%)</text>

            {/* Yellow Zone (OPEN_WORK) */}
            <path 
              onClick={() => setSelectedZone(selectedZone === 'open' ? null : 'open')}
              className={`transition-all duration-200 cursor-pointer ${
                selectedZone === 'open' ? 'fill-yellow-500/35 stroke-yellow-500 stroke-2' : 'fill-yellow-500/15 hover:fill-yellow-500/25'
              }`} 
              d="M300 50 L600 50 L600 300 L300 300 Z"
            ></path>
            <text className="font-mono font-bold text-[10px] fill-slate-700 pointer-events-none" x="320" y="80">OPEN_WORK (68%)</text>

            {/* Red Zone (HUB_DELTA) */}
            <path 
              onClick={() => setSelectedZone(selectedZone === 'delta' ? null : 'delta')}
              className={`transition-all duration-200 cursor-pointer ${
                selectedZone === 'delta' ? 'fill-error/35 stroke-error stroke-2' : 'fill-error/15 hover:fill-error/25'
              }`} 
              d="M600 50 L950 50 L950 300 L600 300 Z"
            ></path>
            <text className="font-mono font-bold text-[10px] fill-slate-700 pointer-events-none" x="620" y="80">HUB_DELTA (92%)</text>

            {/* Main Hallway */}
            <path 
              onClick={() => setSelectedZone(selectedZone === 'hallway' ? null : 'hallway')}
              className={`transition-all duration-200 cursor-pointer ${
                selectedZone === 'hallway' ? 'fill-secondary/25 stroke-secondary stroke-2' : 'fill-secondary/10 hover:fill-secondary/20'
              }`} 
              d="M50 300 L950 300 L950 550 L50 550 Z"
            ></path>
            <text className="font-mono font-bold text-[10px] fill-slate-700 pointer-events-none" x="70" y="330">MAIN_HALLWAY (18%)</text>

            {/* Glowing Access Point (AP) Markers */}
            <g transform="translate(175, 175)">
              <circle className="fill-secondary/20" cx="0" cy="0" r="14"></circle>
              <circle cx="0" cy="0" fill="#006a61" r="5"></circle>
            </g>
            <g transform="translate(450, 150)">
              <circle className="fill-secondary/20" cx="0" cy="0" r="14"></circle>
              <circle cx="0" cy="0" fill="#006a61" r="5"></circle>
            </g>
            <g transform="translate(775, 175)">
              <circle className="fill-error/20" cx="0" cy="0" r="14"></circle>
              <circle cx="0" cy="0" fill="#ba1a1a" r="5"></circle>
            </g>

            {/* Devices View Render */}
            {(activeTab === 'heatmap' || activeTab === 'devices') && (
              <g fill="#1D4ED8" opacity="0.8">
                {devices.map((dev) => (
                  <circle 
                    key={dev.id} 
                    cx={dev.cx} 
                    cy={dev.cy} 
                    r={hoveredDevice === dev.id ? 6 : 3.5}
                    onMouseEnter={() => setHoveredDevice(dev.id)}
                    onMouseLeave={() => setHoveredDevice(null)}
                    className="transition-all duration-150 cursor-crosshair hover:fill-teal-500"
                  />
                ))}
              </g>
            )}

            {/* Simulating Flow View rendering direction vectors */}
            {activeTab === 'flow' && (
              <g stroke="#0D9488" strokeWidth="2" fill="none" opacity="0.7">
                <path d="M 100 150 L 150 150 M 140 145 L 150 150 L 140 155" />
                <path d="M 280 200 L 280 260 M 275 250 L 280 260 L 285 250" />
                <path d="M 500 180 L 550 180 M 540 175 L 550 180 L 540 185" />
                <path d="M 750 120 L 710 120 M 720 115 L 710 120 L 720 125" />
                <path d="M 400 450 L 490 450 M 480 445 L 490 450 L 480 455" />
              </g>
            )}
          </svg>

          {/* Floating Controls in bottom-left */}
          <div className="absolute bottom-6 left-6 flex flex-col gap-2">
            <button className="w-12 h-12 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all text-primary">
              <ZoomIn className="w-5 h-5" />
            </button>
            <button class="w-12 h-12 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all text-primary">
              <ZoomOut className="w-5 h-5" />
            </button>
            <button class="w-12 h-12 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all text-primary mt-2">
              <Compass className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right Status Panel */}
        <div class="h-full w-80 bg-white/95 backdrop-blur border-l border-slate-100 flex flex-col p-6 z-20">
          <div class="flex items-center justify-between mb-6">
            <h3 class="font-headline-md text-base font-bold text-primary">Zone Status</h3>
            <span class="text-[10px] font-mono bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded">AUTO-SYNC</span>
          </div>

          <div class="space-y-4 flex-grow overflow-y-auto pr-1">
            {/* Zone Card Critical */}
            <div 
              onClick={() => setSelectedZone('delta')}
              class={`p-4 rounded-xl border-l-4 border-error cursor-pointer transition-all ${
                selectedZone === 'delta' ? 'bg-red-50 border-error' : 'bg-white hover:bg-slate-50 shadow-sm'
              }`}
            >
              <div class="flex justify-between items-start mb-2">
                <span class="font-mono text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">HUB_DELTA</span>
                <span class="px-2 py-0.5 bg-red-100 text-error text-[9px] rounded-full font-bold">CRITICAL</span>
              </div>
              <div class="flex items-end justify-between">
                <div>
                  <p class="text-2xl font-bold font-headline-md text-primary">92%</p>
                  <p class="text-[9px] text-on-surface-variant uppercase font-mono font-bold tracking-wider">Occupancy</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold text-primary">48/52</p>
                  <p class="text-[9px] text-on-surface-variant uppercase font-mono font-bold tracking-wider">Devices</p>
                </div>
              </div>
            </div>

            {/* Zone Card Medium */}
            <div 
              onClick={() => setSelectedZone('open')}
              class={`p-4 rounded-xl border-l-4 border-yellow-500 cursor-pointer transition-all ${
                selectedZone === 'open' ? 'bg-yellow-50 border-yellow-500' : 'bg-white hover:bg-slate-50 shadow-sm'
              }`}
            >
              <div class="flex justify-between items-start mb-2">
                <span class="font-mono text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">OPEN_WORK</span>
                <span class="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[9px] rounded-full font-bold">WARNING</span>
              </div>
              <div class="flex items-end justify-between">
                <div>
                  <p class="text-2xl font-bold font-headline-md text-primary">68%</p>
                  <p class="text-[9px] text-on-surface-variant uppercase font-mono font-bold tracking-wider">Occupancy</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold text-primary">124/180</p>
                  <p class="text-[9px] text-on-surface-variant uppercase font-mono font-bold tracking-wider">Devices</p>
                </div>
              </div>
            </div>

            {/* Zone Card Optimal */}
            <div 
              onClick={() => setSelectedZone('colab')}
              class={`p-4 rounded-xl border-l-4 border-status-success cursor-pointer transition-all ${
                selectedZone === 'colab' ? 'bg-teal-50 border-status-success' : 'bg-white hover:bg-slate-50 shadow-sm'
              }`}
            >
              <div class="flex justify-between items-start mb-2">
                <span class="font-mono text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">COLAB_01</span>
                <span class="px-2 py-0.5 bg-teal-100 text-secondary text-[9px] rounded-full font-bold">OPTIMAL</span>
              </div>
              <div class="flex items-end justify-between">
                <div>
                  <p class="text-2xl font-bold font-headline-md text-primary">42%</p>
                  <p class="text-[9px] text-on-surface-variant uppercase font-mono font-bold tracking-wider">Occupancy</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold text-primary">34/80</p>
                  <p class="text-[9px] text-on-surface-variant uppercase font-mono font-bold tracking-wider">Devices</p>
                </div>
              </div>
            </div>

            {/* Legend Group */}
            <div class="mt-8 pt-6 border-t border-slate-100">
              <h4 class="text-[10px] font-mono font-bold text-on-surface-variant mb-4 uppercase tracking-wider">Device Sensors</h4>
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <div class="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                  <span class="text-xs text-on-surface font-medium">Active Device (BLE/Wi-Fi)</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-2.5 h-2.5 rounded-full bg-secondary"></div>
                  <span class="text-xs text-on-surface font-medium">Access Point (Online)</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-2.5 h-2.5 rounded-full bg-error"></div>
                  <span class="text-xs text-on-surface font-medium">Access Point (Offline)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Summary Info */}
      <footer class="h-16 bg-white border-t border-slate-100 px-6 flex items-center justify-between z-30 shrink-0 select-none">
        <div class="flex items-center gap-8">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">Total Occupants</span>
            <span class="text-sm font-bold text-primary">1,204</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">Avg Density</span>
            <span class="text-sm font-bold text-secondary">Optimal</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">Active APs</span>
            <span class="text-sm font-bold text-primary">18/20</span>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <div class="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-secondary w-[62%] rounded-full"></div>
          </div>
          <span class="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">Network Load: 62%</span>
        </div>
      </footer>

    </div>
  );
}
