import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:8000/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [organisations, setOrganisations] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [selectedFloorId, setSelectedFloorId] = useState(null);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);

  const [dxfData, setDxfData] = useState(null);
  const [zones, setZones] = useState([]);
  const [accessPoints, setAccessPoints] = useState([]);

  const [uploadedData, setUploadedData] = useState(null);
  const [timestamps, setTimestamps] = useState([]);
  const [selectedTimestamp, setSelectedTimestampState] = useState(null);
  const [occupancyData, setOccupancyData] = useState(null);
  const [deviceData, setDeviceData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  const [currentView, setCurrentView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
    const delay = type === 'error' ? 5000 : type === 'warning' ? 4000 : 3000;
    setTimeout(() => setNotification(null), delay);
  }, []);

  const loadOrganisations = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/organisations`);
      setOrganisations(res.data);
      return res.data;
    } catch (e) {
      showNotification('error', 'Failed to load organisations');
      return [];
    }
  }, [showNotification]);

  const loadBuildings = useCallback(async (orgId) => {
    try {
      const params = orgId ? { org_id: orgId } : {};
      const res = await axios.get(`${API}/buildings`, { params });
      setBuildings(res.data);
      return res.data;
    } catch (e) {
      showNotification('error', 'Failed to load buildings');
      return [];
    }
  }, [showNotification]);

  const loadFloors = useCallback(async (buildingId) => {
    try {
      const res = await axios.get(`${API}/floors`, { params: { building_id: buildingId } });
      setFloors(prev => {
        const other = prev.filter(f => f.building_id !== buildingId);
        return [...other, ...res.data];
      });
      return res.data;
    } catch (e) {
      showNotification('error', 'Failed to load floors');
      return [];
    }
  }, [showNotification]);

  const loadAreas = useCallback(async (floorId) => {
    try {
      const res = await axios.get(`${API}/areas`, { params: { floor_id: floorId } });
      setAreas(prev => {
        const other = prev.filter(a => a.floor_id !== floorId);
        return [...other, ...res.data];
      });
      return res.data;
    } catch (e) {
      showNotification('error', 'Failed to load areas');
      return [];
    }
  }, [showNotification]);

  const selectArea = useCallback(async (areaId) => {
    setSelectedAreaId(areaId);
    setIsLoading(true);
    try {
      // Find area in local state or fetch
      const found = areas.find(a => a.id === areaId);
      if (found) {
        setSelectedArea(found);
        setZones(found.zones || []);
        setAccessPoints(found.access_points || []);
        if (found.dxf_parsed_data) setDxfData(found.dxf_parsed_data);
      }
      // Load timestamps
      const tsRes = await axios.get(`${API}/timestamps`, { params: { area_id: areaId } });
      const tsList = tsRes.data.timestamps || [];
      setTimestamps(tsList);
      if (tsList.length > 0) {
        const latest = tsList[tsList.length - 1];
        setSelectedTimestampState(latest);
        await Promise.all([
          loadOccupancy(areaId, latest),
          loadDevices(areaId, latest),
        ]);
      }
      await loadAnalytics(areaId);
    } catch (e) {
      // silent — area may have no data yet
    } finally {
      setIsLoading(false);
    }
  }, [areas]);

  const loadOccupancy = useCallback(async (areaId, timestamp) => {
    try {
      const res = await axios.get(`${API}/occupancy`, {
        params: { area_id: areaId, timestamp },
      });
      setOccupancyData(res.data);
      return res.data;
    } catch (e) {
      return null;
    }
  }, []);

  const loadDevices = useCallback(async (areaId, timestamp) => {
    try {
      const res = await axios.get(`${API}/devices`, {
        params: { area_id: areaId, timestamp },
      });
      setDeviceData(res.data);
      return res.data;
    } catch (e) {
      return null;
    }
  }, []);

  const loadAnalytics = useCallback(async (areaId) => {
    try {
      const res = await axios.get(`${API}/analytics`, { params: { area_id: areaId } });
      setAnalyticsData(res.data);
      return res.data;
    } catch (e) {
      return null;
    }
  }, []);

  const setSelectedTimestamp = useCallback(async (ts) => {
    setSelectedTimestampState(ts);
    if (selectedAreaId) {
      await Promise.all([
        loadOccupancy(selectedAreaId, ts),
        loadDevices(selectedAreaId, ts),
      ]);
    }
  }, [selectedAreaId, loadOccupancy, loadDevices]);

  const uploadDXF = useCallback(async (file, areaId) => {
    const form = new FormData();
    form.append('file', file);
    form.append('area_id', areaId);
    setIsLoading(true);
    try {
      const res = await axios.post(`${API}/dxf/parse`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDxfData(res.data);
      setAccessPoints(res.data.access_points || []);
      showNotification('success', `DXF parsed: ${res.data.access_points?.length || 0} APs found`);
      // Refresh area
      const aid = areaId || selectedAreaId;
      if (aid) await refreshArea(aid);
      return res.data;
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      showNotification('error', `DXF parse failed: ${msg}`);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [selectedAreaId, showNotification]);

  const refreshArea = useCallback(async (areaId) => {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    const floorAreas = await loadAreas(area.floor_id);
    const updated = floorAreas.find(a => a.id === areaId);
    if (updated) {
      setSelectedArea(updated);
      setZones(updated.zones || []);
      setAccessPoints(updated.access_points || []);
      if (updated.dxf_parsed_data) setDxfData(updated.dxf_parsed_data);
    }
  }, [areas, loadAreas]);

  const createZone = useCallback(async (zoneData) => {
    try {
      const res = await axios.post(`${API}/zones`, zoneData);
      setZones(prev => [...prev, res.data]);
      showNotification('success', `Zone "${res.data.name}" created`);
      return res.data;
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      showNotification('error', `Failed to create zone: ${msg}`);
      throw e;
    }
  }, [showNotification]);

  const updateZone = useCallback(async (zoneId, updates) => {
    try {
      const res = await axios.put(`${API}/zones/${zoneId}`, updates);
      setZones(prev => prev.map(z => z.id === zoneId ? res.data : z));
      showNotification('success', 'Zone updated');
      return res.data;
    } catch (e) {
      showNotification('error', 'Failed to update zone');
      throw e;
    }
  }, [showNotification]);

  const deleteZone = useCallback(async (zoneId) => {
    try {
      await axios.delete(`${API}/zones/${zoneId}`);
      setZones(prev => prev.filter(z => z.id !== zoneId));
      showNotification('success', 'Zone deleted');
    } catch (e) {
      showNotification('error', 'Failed to delete zone');
      throw e;
    }
  }, [showNotification]);

  const uploadCSV = useCallback(async (file, areaId) => {
    const form = new FormData();
    form.append('file', file);
    form.append('area_id', areaId);
    setIsLoading(true);
    try {
      const res = await axios.post(`${API}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadedData(res.data);
      showNotification('success', `Processed ${res.data.records_processed} records, ${res.data.devices_located} devices located`);
      // Reload occupancy data
      const tsRes = await axios.get(`${API}/timestamps`, { params: { area_id: areaId } });
      const tsList = tsRes.data.timestamps || [];
      setTimestamps(tsList);
      if (tsList.length > 0) {
        const latest = tsList[tsList.length - 1];
        setSelectedTimestampState(latest);
        await Promise.all([
          loadOccupancy(areaId, latest),
          loadDevices(areaId, latest),
          loadAnalytics(areaId),
        ]);
      }
      return res.data;
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      showNotification('error', `Upload failed: ${msg}`);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [showNotification, loadOccupancy, loadDevices, loadAnalytics]);

  const createBuilding = useCallback(async (data) => {
    try {
      const res = await axios.post(`${API}/buildings`, data);
      setBuildings(prev => [...prev, res.data]);
      showNotification('success', `Building "${res.data.name}" created`);
      return res.data;
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      showNotification('error', `Failed to create building: ${msg}`);
      throw e;
    }
  }, [showNotification]);

  const updateBuilding = useCallback(async (id, data) => {
    try {
      const res = await axios.put(`${API}/buildings/${id}`, data);
      setBuildings(prev => prev.map(b => b.id === id ? res.data : b));
      showNotification('success', 'Building updated');
      return res.data;
    } catch (e) {
      showNotification('error', 'Failed to update building');
      throw e;
    }
  }, [showNotification]);

  const deleteBuilding = useCallback(async (id) => {
    try {
      await axios.delete(`${API}/buildings/${id}`);
      setBuildings(prev => prev.filter(b => b.id !== id));
      showNotification('success', 'Building deleted');
    } catch (e) {
      showNotification('error', 'Failed to delete building');
      throw e;
    }
  }, [showNotification]);

  const createFloor = useCallback(async (data) => {
    try {
      const res = await axios.post(`${API}/floors`, data);
      setFloors(prev => [...prev, res.data]);
      showNotification('success', `Floor "${res.data.name}" created`);
      return res.data;
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      showNotification('error', `Failed to create floor: ${msg}`);
      throw e;
    }
  }, [showNotification]);

  const deleteFloor = useCallback(async (id) => {
    try {
      await axios.delete(`${API}/floors/${id}`);
      setFloors(prev => prev.filter(f => f.id !== id));
      showNotification('success', 'Floor deleted');
    } catch (e) {
      showNotification('error', 'Failed to delete floor');
      throw e;
    }
  }, [showNotification]);

  const createArea = useCallback(async (data) => {
    try {
      const res = await axios.post(`${API}/areas`, data);
      setAreas(prev => [...prev, res.data]);
      showNotification('success', `Area "${res.data.name}" created`);
      return res.data;
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      showNotification('error', `Failed to create area: ${msg}`);
      throw e;
    }
  }, [showNotification]);

  const deleteArea = useCallback(async (id) => {
    try {
      await axios.delete(`${API}/areas/${id}`);
      setAreas(prev => prev.filter(a => a.id !== id));
      showNotification('success', 'Area deleted');
    } catch (e) {
      showNotification('error', 'Failed to delete area');
      throw e;
    }
  }, [showNotification]);

  const createOrganisation = useCallback(async (name) => {
    try {
      const res = await axios.post(`${API}/organisations`, { name });
      setOrganisations(prev => [...prev, res.data]);
      showNotification('success', `Organisation "${res.data.name}" created`);
      return res.data;
    } catch (e) {
      showNotification('error', 'Failed to create organisation');
      throw e;
    }
  }, [showNotification]);

  const value = {
    // Data
    organisations, buildings, floors, areas,
    selectedOrgId, setSelectedOrgId,
    selectedBuildingId, setSelectedBuildingId,
    selectedFloorId, setSelectedFloorId,
    selectedAreaId, selectedArea,
    dxfData, zones, accessPoints,
    uploadedData, timestamps, selectedTimestamp,
    occupancyData, deviceData, analyticsData,
    currentView, isLoading, error, notification,

    // Actions
    loadOrganisations, loadBuildings, loadFloors, loadAreas,
    selectArea, refreshArea,
    createOrganisation,
    createBuilding, updateBuilding, deleteBuilding,
    createFloor, deleteFloor,
    createArea, deleteArea,
    uploadDXF, createZone, updateZone, deleteZone,
    uploadCSV, loadOccupancy, loadDevices, loadAnalytics,
    setSelectedTimestamp,
    showNotification,
    setCurrentView,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
