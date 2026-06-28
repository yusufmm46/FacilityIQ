import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const API = 'http://127.0.0.1:8000';

export default function Upload({ onDataLoaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback(accepted => {
    if (accepted[0]) { setFile(accepted[0]); setError(''); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'] }, maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const form = new FormData();
      form.append('file', file);

      const uploadRes = await axios.post(`${API}/upload`, form);
      const [occRes, devRes, tsRes] = await Promise.all([
        axios.get(`${API}/occupancy`),
        axios.get(`${API}/devices`),
        axios.get(`${API}/timestamps`),
      ]);

      onDataLoaded({
        summary: uploadRes.data,
        occupancy: occRes.data,
        devices: devRes.data,
        timestamps: tsRes.data.timestamps,
      });
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed. Check API is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-wrap">
      <div className="upload-card">
        <h2>📡 Upload RSSI Data</h2>
        <p>Upload your Wi-Fi RSSI CSV file to generate occupancy analytics</p>

        <div {...getRootProps()} className={`drop-zone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <div className="icon">📂</div>
          <p>{isDragActive ? 'Drop it here!' : 'Drag & drop CSV file, or click to browse'}</p>
        </div>

        {file && <div className="file-name">✅ {file.name}</div>}
        {error && <div className="error">❌ {error}</div>}

        <button
          className={`upload-btn ${loading ? 'loading' : ''}`}
          onClick={handleUpload}
          disabled={!file || loading}
        >
          {loading ? '⏳ Processing...' : '🚀 Analyse Occupancy'}
        </button>

        <p style={{ marginTop: 16, fontSize: 12, color: '#94A3B8' }}>
          Required columns: timestamp, mac_address, ap_id, ap_x, ap_y, rssi
        </p>
      </div>
    </div>
  );
}