import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet, CheckCircle2, Terminal, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

const LOG_TYPE_STYLE = {
  success: 'text-green-400',
  error:   'text-red-400',
  warn:    'text-yellow-300',
  info:    'text-slate-400',
};

export default function DataImportView({ logs, onAddLog }) {
  const { areas, uploadCSV, isLoading, uploadedData, loadBuildings, loadFloors, loadAreas, buildings, floors } = useApp();
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const terminalRef = useRef();

  // Load all areas
  useEffect(() => {
    const load = async () => {
      const bs = await loadBuildings();
      for (const b of bs) {
        const fs = await loadFloors(b.id);
        for (const f of fs) await loadAreas(f.id);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!acceptedFiles.length || !selectedAreaId) return;
    const file = acceptedFiles[0];
    onAddLog(`Starting upload: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
    try {
      const result = await uploadCSV(file, selectedAreaId);
      setUploadResult(result);
      onAddLog(`Upload complete. ${result.records_processed} records processed.`, 'success');
      onAddLog(`Located ${result.devices_located} unique devices.`, 'success');
      onAddLog(`Timestamps in data: ${result.timestamps}`, 'info');
      onAddLog(`Zones with detected occupancy: ${result.zones_detected}`, 'success');
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      onAddLog(`Upload failed: ${msg}`, 'error');
    }
  };

  const selectedArea = areas.find(a => a.id === selectedAreaId);

  return (
    <div className="flex flex-col h-full font-sans bg-slate-50">
      <div className="p-6 pb-0">
        <h2 className="font-display text-2xl font-bold text-primary">Data Import</h2>
        <p className="font-sans text-sm text-on-surface-variant mt-1">Upload RSSI CSV data for occupancy analysis</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-auto">
        {/* Left: Upload Panel */}
        <div className="space-y-5">
          {/* Area selector */}
          <div className="glass-card p-5 rounded-2xl border border-slate-100">
            <label className="font-mono text-[9px] uppercase font-bold text-slate-400 block mb-2">Target Area</label>
            <select value={selectedAreaId} onChange={e => setSelectedAreaId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold py-2.5 px-4 outline-none focus:border-secondary">
              <option value="">-- Select an area --</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {selectedArea && (
              <div className="mt-3 flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Your CSV must have <code className="bg-amber-100 px-1 rounded">area_name</code> = <strong>"{selectedArea.name}"</strong> (exact match, case-sensitive).
                </p>
              </div>
            )}
          </div>

          {/* Dropzone */}
          <div {...getRootProps()} className={`glass-card border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${isDragActive ? 'border-secondary bg-teal-50' : 'border-slate-200 hover:border-secondary hover:bg-slate-50'}`}>
            <input {...getInputProps()} />
            <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            {acceptedFiles.length > 0 ? (
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FileSpreadsheet className="w-5 h-5 text-secondary" />
                  <p className="font-bold text-primary text-sm">{acceptedFiles[0].name}</p>
                </div>
                <p className="text-xs text-slate-400">{(acceptedFiles[0].size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="font-bold text-primary text-sm mb-1">
                  {isDragActive ? 'Drop CSV here...' : 'Drop your RSSI CSV file here'}
                </p>
                <p className="text-xs text-slate-400">or click to browse — .csv files only</p>
                <p className="text-xs text-slate-400 mt-2">
                  Required columns: timestamp, mac_address, ap_id, ap_x, ap_y, rssi, area_name
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!acceptedFiles.length || !selectedAreaId || isLoading}
            className="w-full py-3 bg-secondary disabled:opacity-40 hover:opacity-90 text-white font-bold text-sm rounded-full shadow-lg transition-all"
          >
            {isLoading ? 'Processing data...' : 'Upload & Process'}
          </button>

          {/* Upload result summary */}
          {uploadResult && (
            <div className="glass-card p-5 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-status-success" />
                <h4 className="font-display font-bold text-primary">Upload Complete</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Records Processed', uploadResult.records_processed],
                  ['Devices Located', uploadResult.devices_located],
                  ['Timestamps', uploadResult.timestamps],
                  ['Zones Detected', uploadResult.zones_detected],
                ].map(([label, val]) => (
                  <div key={label} className="p-3 bg-slate-50 rounded-xl">
                    <p className="font-mono text-[9px] uppercase text-slate-400 font-bold">{label}</p>
                    <p className="font-display font-bold text-primary text-xl mt-1">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Terminal log */}
        <div className="flex flex-col">
          <div className="glass-card flex-1 rounded-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="bg-primary px-5 py-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-secondary" />
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">Sync Console</span>
              <div className="ml-auto flex gap-1.5">
                {['bg-red-500', 'bg-yellow-500', 'bg-green-500'].map(c => (
                  <div key={c} className={`w-2.5 h-2.5 rounded-full ${c}`} />
                ))}
              </div>
            </div>

            <div ref={terminalRef} className="flex-1 bg-[#0a0f1c] p-4 font-mono text-xs overflow-y-auto space-y-1 max-h-96">
              {[...logs].reverse().map((log, i) => (
                <div key={i} className={`flex gap-3 ${LOG_TYPE_STYLE[log.type] || 'text-slate-400'}`}>
                  <span className="text-slate-600 shrink-0">{log.time}</span>
                  <span className="leading-relaxed">{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
