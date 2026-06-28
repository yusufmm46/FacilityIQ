import { useState, MouseEvent } from 'react';
import { ArrowUp, HelpCircle, Activity, Download, FileText, LayoutGrid, Calendar } from 'lucide-react';

export default function AnalyticsView() {
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; time: string; pers: number } | null>(null);

  // Generate cells for heatmap
  const heatmapData = [];
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  const intensityColors = [
    'bg-secondary/10',
    'bg-secondary/20',
    'bg-secondary/40',
    'bg-secondary/60',
    'bg-secondary/80',
    'bg-secondary'
  ];

  for (let d = 0; d < 5; d++) {
    for (let h = 0; h < 12; h++) {
      let intensity = Math.floor(Math.random() * 3);
      if (h >= 3 && h <= 6) intensity += 2; // Lunch rush
      if (d === 1 || d === 2) intensity += 1; // Midweek peaks
      heatmapData.push({
        day: days[d],
        hour: h + 8,
        colorClass: intensityColors[Math.min(intensity, 5)],
        intensity: Math.min(intensity * 20, 100)
      });
    }
  }

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pct = x / rect.width;
    const hour = Math.floor(pct * 14) + 8;
    const pers = Math.floor(Math.random() * 200) + 600;

    setTooltipData({
      x: x + 15,
      y: y - 40,
      time: `${hour}:00`,
      pers
    });
  };

  return (
    <div className="space-y-6 p-6 max-w-[1440px] mx-auto w-full font-sans select-none">
      
      {/* Bento Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1 */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between border border-slate-100">
          <div>
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Occupancy</span>
            <div className="mt-2 flex items-baseline gap-2">
              <h2 className="font-display text-4xl font-extrabold text-primary tracking-tight">842</h2>
              <span className="text-status-success font-bold flex items-center text-xs">
                <ArrowUp className="w-3.5 h-3.5 mr-0.5" /> 12%
              </span>
            </div>
          </div>
          <div className="mt-4 h-12 w-full overflow-hidden">
            <svg className="w-full h-full stroke-chart-teal fill-none opacity-45" viewBox="0 0 200 40">
              <path d="M0,35 C20,35 30,10 50,15 C70,20 80,5 100,25 C120,45 130,15 150,10 C170,5 180,30 200,30" strokeLinecap="round" strokeWidth="2.5"></path>
            </svg>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between border border-slate-100">
          <div>
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg. Dwell Time</span>
            <div className="mt-2 flex items-baseline gap-2">
              <h2 className="font-display text-4xl font-extrabold text-primary tracking-tight">
                4.2<span className="text-lg font-bold text-on-surface-variant ml-1">hrs</span>
              </h2>
              <span className="text-on-surface-variant/60 font-semibold text-xs">vs 3.8 prev</span>
            </div>
          </div>
          <div className="mt-4 flex gap-1 items-end h-8">
            {[40, 60, 50, 80, 100, 70, 55].map((h, i) => (
              <div 
                key={i} 
                className={`flex-1 rounded-sm ${i === 4 ? 'bg-secondary' : 'bg-slate-200 hover:bg-secondary/60 transition-all'}`}
                style={{ height: `${h}%` }}
              ></div>
            ))}
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between border border-slate-100">
          <div>
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">Energy Efficiency</span>
            <div className="mt-2 flex items-baseline gap-2">
              <h2 className="font-display text-4xl font-extrabold text-secondary tracking-tight">A+</h2>
              <span className="text-status-success font-bold text-xs">Optimal</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-grow h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-secondary w-[92%] rounded-full"></div>
            </div>
            <span className="font-mono text-[10px] text-slate-400 font-bold">92%</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-12 gap-6">
        {/* Hourly Trend Curve Chart */}
        <div className="col-span-12 lg:col-span-8 bg-[#0f1f3d] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between group">
          <div className="relative z-10 flex justify-between items-start mb-6">
            <div>
              <h3 className="font-display text-lg font-bold text-white tracking-wide">Hourly Occupancy Trend</h3>
              <p className="text-slate-400 text-xs mt-1">Real-time sensor data across all facility levels</p>
            </div>
            <div className="flex gap-2 font-mono text-[10px] font-bold">
              <button className="px-3 py-1 rounded-md border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">LIVE</button>
              <button className="px-3 py-1 rounded-md bg-secondary text-white shadow-sm">24H</button>
            </div>
          </div>

          <div 
            className="relative h-64 w-full cursor-crosshair overflow-visible mt-2" 
            id="hourly-chart-container"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltipData(null)}
          >
            {/* Chart Lines with nice visual glow area */}
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 200">
              <defs>
                <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0D9488" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0D9488" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Horizontal Grid guidelines */}
              <line stroke="#ffffff10" strokeWidth="1" x1="0" x2="1000" y1="50" y2="50" />
              <line stroke="#ffffff10" strokeWidth="1" x1="0" x2="1000" y1="100" y2="100" />
              <line stroke="#ffffff10" strokeWidth="1" x1="0" x2="1000" y1="150" y2="150" />

              {/* Area Shading */}
              <path d="M0,180 L0,140 C50,130 100,160 150,110 C200,60 250,40 300,50 C350,60 400,20 450,30 C500,40 550,90 600,120 C650,150 700,130 750,110 C800,90 850,50 900,40 C950,30 1000,60 1000,60 L1000,180 Z" fill="url(#areaGradient)" />
              {/* Glow trace line */}
              <path d="M0,140 C50,130 100,160 150,110 C200,60 250,40 300,50 C350,60 400,20 450,30 C500,40 550,90 600,120 C650,150 700,130 750,110 C800,90 850,50 900,40 C950,30 1000,60 1000,60" fill="none" stroke="#0D9488" strokeLinecap="round" strokeWidth="3" />
            </svg>

            {/* Hover Tooltip display */}
            {tooltipData && (
              <div 
                className="absolute bg-primary border border-slate-700/60 p-3 rounded-xl shadow-2xl z-20 transition-all duration-75 text-left pointer-events-none"
                style={{ left: `${tooltipData.x}px`, top: `${tooltipData.y}px` }}
              >
                <p className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-wider">TIME: {tooltipData.time}</p>
                <h4 className="text-white font-display font-bold text-lg mt-0.5">{tooltipData.pers} Pers.</h4>
                <p className="text-status-success font-mono text-[9px] font-semibold mt-0.5">+4% Peak Delta</p>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-3 font-mono text-[9px] text-slate-400 font-bold px-1">
            <span>08:00</span>
            <span>12:00</span>
            <span className="text-white font-bold">14:00</span>
            <span>18:00</span>
            <span>22:00</span>
          </div>
        </div>

        {/* Zone Distribution Donut */}
        <div className="col-span-12 lg:col-span-4 glass-card rounded-2xl p-6 flex flex-col justify-between border border-slate-100">
          <div>
            <h3 className="font-display text-lg font-bold text-primary">Zone Distribution</h3>
            <p className="text-on-surface-variant text-xs mt-1">Capacity utilization by sector</p>
          </div>

          <div className="flex-1 flex items-center justify-center relative my-6">
            <svg className="w-44 h-44 -rotate-90">
              <circle cx="88" cy="86" fill="none" r="70" stroke="#eaeef9" strokeWidth="20" />
              {/* Workstations 62% */}
              <circle cx="88" cy="86" fill="none" r="70" stroke="#0D9488" strokeWidth="20" strokeDasharray="440" strokeDashoffset="167" />
              {/* Meeting Rooms 24% */}
              <circle cx="88" cy="86" fill="none" r="70" stroke="#1D4ED8" strokeWidth="20" strokeDasharray="440" strokeDashoffset="340" />
              {/* Lounges 14% */}
              <circle cx="88" cy="86" fill="none" r="70" stroke="#00071b" strokeWidth="20" strokeDasharray="440" strokeDashoffset="401" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-display font-extrabold text-primary">82%</span>
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">CAPACITY</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-chart-teal"></span>
                <span>Workstations</span>
              </div>
              <span className="font-mono font-bold text-slate-700">62%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-chart-blue"></span>
                <span>Meeting Rooms</span>
              </div>
              <span className="font-mono font-bold text-slate-700">24%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                <span>Lounges</span>
              </div>
              <span className="font-mono font-bold text-slate-700">14%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Heatmap & Popularity */}
      <div className="grid grid-cols-12 gap-6">
        {/* Heatmap Grid */}
        <div className="col-span-12 lg:col-span-7 glass-card rounded-2xl p-6 border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-display text-lg font-bold text-primary">Weekly Peak Heatmap</h3>
              <p className="text-on-surface-variant text-xs mt-1">Historical density by day and hour</p>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold text-slate-400 tracking-wider">
              <span>LOW</span>
              <div className="flex gap-0.5">
                <div className="w-2.5 h-2.5 bg-secondary/10"></div>
                <div className="w-2.5 h-2.5 bg-secondary/40"></div>
                <div className="w-2.5 h-2.5 bg-secondary/70"></div>
                <div className="w-2.5 h-2.5 bg-secondary"></div>
              </div>
              <span>HIGH</span>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col justify-between py-2 text-[10px] font-mono font-bold text-slate-400">
              {days.map(d => <span key={d}>{d}</span>)}
            </div>
            
            <div className="flex-grow">
              <div className="grid grid-cols-12 gap-1.5 h-44">
                {heatmapData.map((cell, idx) => (
                  <div 
                    key={idx} 
                    title={`Density: ${cell.intensity}%`}
                    className={`rounded-sm cursor-pointer hover:scale-110 transition-transform ${cell.colorClass}`}
                  ></div>
                ))}
              </div>
              <div className="grid grid-cols-12 gap-1.5 mt-2 font-mono text-[9px] text-slate-400 text-center font-bold">
                <span>08</span>
                <span></span>
                <span>10</span>
                <span></span>
                <span>12</span>
                <span></span>
                <span>14</span>
                <span></span>
                <span>16</span>
                <span></span>
                <span>18</span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Zone Popularity */}
        <div className="col-span-12 lg:col-span-5 glass-card rounded-2xl p-6 border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-primary">Zone Popularity</h3>
            <p className="text-on-surface-variant text-xs mt-1">Most frequented areas this week</p>
          </div>

          <div className="space-y-5 my-4">
            {/* Pop 1 */}
            <div className="group cursor-pointer">
              <div className="flex justify-between items-end mb-1 text-xs">
                <span className="font-semibold text-slate-700">Creative Studio A</span>
                <span className="font-mono font-bold text-secondary text-[10px]">98% PEAK</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-secondary to-chart-teal w-[98%] rounded-full group-hover:opacity-85 transition-opacity"></div>
              </div>
            </div>

            {/* Pop 2 */}
            <div className="group cursor-pointer">
              <div className="flex justify-between items-end mb-1 text-xs">
                <span className="font-semibold text-slate-700">Cafeteria Hub</span>
                <span className="font-mono font-bold text-secondary text-[10px]">82% PEAK</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-secondary to-chart-teal w-[82%] rounded-full group-hover:opacity-85 transition-opacity"></div>
              </div>
            </div>

            {/* Pop 3 */}
            <div className="group cursor-pointer">
              <div className="flex justify-between items-end mb-1 text-xs">
                <span className="font-semibold text-slate-700">Conference Level 4</span>
                <span className="font-mono font-bold text-secondary text-[10px]">65% PEAK</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-secondary to-chart-teal w-[65%] rounded-full group-hover:opacity-85 transition-opacity"></div>
              </div>
            </div>

            {/* Pop 4 */}
            <div className="group cursor-pointer">
              <div className="flex justify-between items-end mb-1 text-xs">
                <span className="font-semibold text-slate-700">Quiet Zone West</span>
                <span className="font-mono font-bold text-secondary text-[10px]">42% PEAK</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-secondary to-chart-teal w-[42%] rounded-full group-hover:opacity-85 transition-opacity"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer legal elements */}
      <footer className="py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 font-mono tracking-wider pt-8">
        <span>FACILITYIQ ANALYTICS ENGINE v4.2.0</span>
        <div className="flex space-x-4 mt-2 sm:mt-0">
          <button className="hover:text-secondary flex items-center gap-1 font-semibold transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button className="hover:text-secondary flex items-center gap-1 font-semibold transition-colors">
            <FileText className="w-3.5 h-3.5" /> Generate PDF Report
          </button>
        </div>
      </footer>
    </div>
  );
}
