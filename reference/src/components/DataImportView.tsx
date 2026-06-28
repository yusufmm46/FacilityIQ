import { useState, useRef, DragEvent, FormEvent } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, ShieldAlert, AlertTriangle, Play, HelpCircle, Terminal } from 'lucide-react';
import { LogMessage } from '../types';

interface DataImportViewProps {
  logs: LogMessage[];
  onAddLog: (logText: string, type: 'info' | 'success' | 'warn' | 'error' | 'sync') => void;
}

export default function DataImportView({ logs, onAddLog }: DataImportViewProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [parseState, setParseState] = useState<'idle' | 'parsing' | 'verified' | 'committed'>('idle');
  const [customLog, setCustomLog] = useState('');

  const parsedData = [
    { ts: '2026-10-12 14:30', building: 'one-tech-plaza', level: '0', occupancy: '72%', aps: '18/20' },
    { ts: '2026-10-12 14:35', building: 'innovation-hub', level: '3', occupancy: '89%', aps: '24/25' },
    { ts: '2026-10-12 14:40', building: 'harbor-complex', level: '1', occupancy: '22%', aps: '12/15' },
    { ts: '2026-10-12 14:45', building: 'one-tech-plaza', level: '1', occupancy: '42%', aps: '10/10' },
  ];

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setFileUploaded(true);
    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);
    setParseState('idle');
    onAddLog(`Detected drag-drop file payload: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
  };

  const triggerUpload = () => {
    // Simulated upload trigger
    setFileUploaded(true);
    setFileName('occupancy_weekly_audit.csv');
    setFileSize('14.2 KB');
    setParseState('idle');
    onAddLog('Simulated workspace browse: Loaded occupancy_weekly_audit.csv (14.2 KB)', 'info');
  };

  const handleVerify = () => {
    setParseState('parsing');
    onAddLog('Starting cryptographic data verification sequence...', 'sync');
    
    setTimeout(() => {
      setParseState('verified');
      onAddLog('Crypto verification success: All 1,482 lines comply with JSON schema specifications.', 'success');
    }, 1200);
  };

  const handleCommit = () => {
    onAddLog('Initiating transaction write to FacilityIQ Cloud Sync...', 'sync');
    
    setTimeout(() => {
      setParseState('committed');
      onAddLog('SYNC SUCCESS: Database state committed. 4 active buildings updated in real time.', 'success');
    }, 1000);
  };

  const handleSendCustomLog = (e: FormEvent) => {
    e.preventDefault();
    if (!customLog.trim()) return;
    onAddLog(customLog, 'info');
    setCustomLog('');
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row relative h-[calc(100vh-80px)] overflow-hidden font-sans">
      
      {/* Left main workspace */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <section className="bg-white rounded-2xl p-6 border border-slate-100 space-y-1">
          <h2 className="font-display text-2xl font-bold text-primary">CSV Data Import & Sync</h2>
          <p className="font-sans text-xs text-on-surface-variant font-medium leading-relaxed">
            Upload custom IoT metrics, Wi-Fi client databases, or spatial grids to calibrate heatmaps and adjust system thresholds globally.
          </p>
        </section>

        {/* Drag and Drop Container */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`h-80 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all relative ${
            dragActive 
              ? 'border-secondary bg-teal-50/30' 
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          {fileUploaded ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto text-secondary border border-teal-100">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-sans font-bold text-primary text-base">{fileName}</h4>
                <p className="font-mono text-xs text-slate-400 mt-1">{fileSize}</p>
              </div>

              {parseState === 'idle' && (
                <button 
                  onClick={handleVerify}
                  className="brand-gradient-btn text-white text-xs font-bold py-2.5 px-6 rounded-full cursor-pointer shadow-md flex items-center justify-center gap-2 mx-auto"
                >
                  <Play className="w-4 h-4 fill-white" /> Verify Records
                </button>
              )}

              {parseState === 'parsing' && (
                <div className="flex items-center gap-2.5 text-secondary font-mono text-xs font-bold justify-center">
                  <svg className="animate-spin h-4 w-4 text-secondary" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>PARSING DATA FIELDS...</span>
                </div>
              )}

              {parseState === 'verified' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 justify-center text-status-success font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Schema Verification Succeeded!</span>
                  </div>
                  <button 
                    onClick={handleCommit}
                    className="bg-secondary hover:bg-opacity-90 text-white text-xs font-bold py-2.5 px-6 rounded-full cursor-pointer shadow-md flex items-center justify-center gap-2 mx-auto"
                  >
                    Commit Synced Data
                  </button>
                </div>
              )}

              {parseState === 'committed' && (
                <div className="text-center p-4 bg-teal-50 border border-teal-100 rounded-xl max-w-sm mx-auto space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-secondary mx-auto mb-2" />
                  <h5 className="font-sans font-bold text-primary text-sm">Synchronisation Completed</h5>
                  <p className="font-sans text-xs text-on-surface-variant">Database records successfully committed into production nodes.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-100">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-sans font-bold text-primary text-base">Drag & Drop Database files</h4>
                <p className="font-sans text-xs text-on-surface-variant font-medium">Supports CSV or Microsoft Excel spreadsheets up to 25MB</p>
              </div>
              <button 
                onClick={triggerUpload}
                className="w-40 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-secondary rounded-xl font-mono text-[10px] font-bold text-secondary transition-all shadow-sm tracking-wider mx-auto cursor-pointer"
              >
                BROWSE WORKSPACE
              </button>
            </div>
          )}
        </div>

        {/* Parsed records table (visible when parsing or verified) */}
        {fileUploaded && (parseState === 'verified' || parseState === 'committed' || parseState === 'parsing') && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="font-mono text-[10px] font-bold text-primary uppercase tracking-wider">Parsed CSV Entries ({parsedData.length})</h4>
              <span className="font-mono text-[9px] bg-teal-50 text-secondary font-bold px-2 py-0.5 rounded">READY</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-mono text-[9px] uppercase tracking-wider">
                    <th className="py-3 px-6 font-bold">Timestamp</th>
                    <th className="py-3 px-6 font-bold">Building ID</th>
                    <th className="py-3 px-6 font-bold">Level</th>
                    <th className="py-3 px-6 font-bold">Occupancy Ratio</th>
                    <th className="py-3 px-6 font-bold">Active AP Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-sans font-medium text-slate-700">
                  {parsedData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-[11px] font-semibold text-slate-600">{row.ts}</td>
                      <td className="py-3.5 px-6">{row.building}</td>
                      <td className="py-3.5 px-6 font-mono font-bold">{row.level}</td>
                      <td className="py-3.5 px-6">{row.occupancy}</td>
                      <td className="py-3.5 px-6 font-mono font-bold text-slate-600">{row.aps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Right Log Console Sidebar */}
      <div className="w-full lg:w-96 bg-[#00071b] border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-full text-slate-200 z-10 font-mono text-[11px]">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="text-secondary w-4.5 h-4.5" />
            <h3 className="font-bold tracking-wide uppercase">System Sync Logs</h3>
          </div>
          <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
        </div>

        {/* Logs container list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono leading-relaxed select-text">
          {logs.map((log, idx) => {
            const isSuccess = log.type === 'success';
            const isWarn = log.type === 'warn';
            const isError = log.type === 'error';
            const isSync = log.type === 'sync';

            return (
              <div key={idx} className="flex gap-3">
                <span className="text-slate-500 shrink-0 select-none font-bold">[{log.time}]</span>
                <p className={`${
                  isSuccess ? 'text-secondary font-bold' : isWarn ? 'text-yellow-400 font-bold' : isError ? 'text-red-400 font-bold' : isSync ? 'text-sky-400 font-bold' : 'text-slate-300'
                }`}>
                  <span className="font-bold mr-1">{log.type.toUpperCase()}:</span>
                  {log.text}
                </p>
              </div>
            );
          })}
        </div>

        {/* Custom log input console prompt */}
        <form onSubmit={handleSendCustomLog} className="p-4 border-t border-slate-800 bg-[#020b22] flex items-center shrink-0">
          <span className="text-secondary mr-2 font-bold select-none">&gt;</span>
          <input
            type="text"
            value={customLog}
            onChange={(e) => setCustomLog(e.target.value)}
            placeholder="Type sync command or custom log text..."
            className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-xs font-mono font-bold text-white placeholder-slate-600"
          />
        </form>
      </div>

    </div>
  );
}
