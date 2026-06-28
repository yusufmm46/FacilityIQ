import React, { useState, useEffect } from 'react';
import { Building2, Plus, X, Edit2, Trash2, Layers, MapPin, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 flex flex-col space-y-5 animate-scale-up">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <h3 className="font-display text-lg font-bold text-primary">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-primary transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldInput({ label, ...props }) {
  return (
    <div className="flex flex-col space-y-1">
      <label className="font-mono text-[9px] uppercase font-bold text-slate-400">{label}</label>
      <input {...props} className="bg-slate-50 border border-slate-200 focus:border-secondary rounded-xl text-xs font-semibold py-2.5 px-4 outline-none" />
    </div>
  );
}

export default function BuildingsView() {
  const {
    buildings, floors, areas, organisations,
    loadBuildings, loadFloors, loadAreas,
    createBuilding, updateBuilding, deleteBuilding,
    createFloor, deleteFloor,
    createArea, deleteArea,
    createOrganisation,
  } = useApp();

  const [expandedBuildings, setExpandedBuildings] = useState({});
  const [expandedFloors, setExpandedFloors] = useState({});
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [showEditBuilding, setShowEditBuilding] = useState(false);
  const [showAddFloor, setShowAddFloor] = useState(null);
  const [showAddArea, setShowAddArea] = useState(null);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [bForm, setBForm] = useState({ name: '', address: '', city: '', country: '' });
  const [fForm, setFForm] = useState({ name: '', level_number: 1 });
  const [aForm, setAForm] = useState({ name: '' });

  useEffect(() => { loadBuildings(); }, []);

  const toggleBuilding = async (bid) => {
    const next = !expandedBuildings[bid];
    setExpandedBuildings(prev => ({ ...prev, [bid]: next }));
    if (next) {
      const flrs = await loadFloors(bid);
      for (const f of flrs) await loadAreas(f.id);
    }
  };

  const toggleFloor = (fid) => setExpandedFloors(prev => ({ ...prev, [fid]: !prev[fid] }));
  const buildingFloors = (bid) => floors.filter(f => f.building_id === bid);
  const floorAreas = (fid) => areas.filter(a => a.floor_id === fid);

  const handleAddBuilding = async (e) => {
    e.preventDefault();
    let orgId = organisations[0]?.id;
    if (!orgId) {
      const org = await createOrganisation('Default Organisation');
      orgId = org.id;
    }
    await createBuilding({ ...bForm, org_id: orgId });
    setBForm({ name: '', address: '', city: '', country: '' });
    setShowAddBuilding(false);
    await loadBuildings();
  };

  const handleEditBuilding = async (e) => {
    e.preventDefault();
    await updateBuilding(editingBuilding.id, {
      name: editingBuilding.name,
      address: editingBuilding.address,
      city: editingBuilding.city,
      country: editingBuilding.country,
    });
    setShowEditBuilding(false);
    setEditingBuilding(null);
  };

  const handleDeleteBuilding = async (bid) => {
    if (!window.confirm('Delete this building and all its data?')) return;
    await deleteBuilding(bid);
  };

  const handleAddFloor = async (e) => {
    e.preventDefault();
    await createFloor({ building_id: showAddFloor, ...fForm });
    setFForm({ name: '', level_number: 1 });
    setShowAddFloor(null);
    await loadFloors(showAddFloor);
  };

  const handleDeleteFloor = async (fid, bid) => {
    if (!window.confirm('Delete this floor?')) return;
    await deleteFloor(fid);
    await loadFloors(bid);
  };

  const handleAddArea = async (e) => {
    e.preventDefault();
    await createArea({ floor_id: showAddArea, ...aForm });
    setAForm({ name: '' });
    setShowAddArea(null);
    await loadAreas(showAddArea);
  };

  const handleDeleteArea = async (aid, fid) => {
    if (!window.confirm('Delete this area?')) return;
    await deleteArea(aid);
    await loadAreas(fid);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-primary">Facilities</h2>
          <p className="font-sans text-sm text-on-surface-variant mt-1">
            {buildings.length} building{buildings.length !== 1 ? 's' : ''} in your portfolio
          </p>
        </div>
        <button
          onClick={() => setShowAddBuilding(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-secondary hover:opacity-90 text-white font-sans font-bold text-sm rounded-full shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Building
        </button>
      </div>

      {buildings.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center border border-slate-100">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-display text-lg font-bold text-primary mb-2">No buildings yet</h3>
          <p className="text-sm text-on-surface-variant mb-6">Add your first building to get started.</p>
          <button onClick={() => setShowAddBuilding(true)} className="px-6 py-2.5 bg-secondary text-white rounded-full font-bold text-sm hover:opacity-90 transition-all">
            Add Building
          </button>
        </div>
      )}

      <div className="space-y-4">
        {buildings.map(b => {
          const bFloors = buildingFloors(b.id);
          const isExpanded = expandedBuildings[b.id];
          return (
            <div key={b.id} className="glass-card rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-5 flex items-center gap-4">
                <button onClick={() => toggleBuilding(b.id)} className="flex items-center gap-3 flex-1 text-left">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center shadow">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-primary text-base">{b.name}</h3>
                    <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                      {[b.address, b.city, b.country].filter(Boolean).join(', ') || 'No address set'}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowAddFloor(b.id)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-secondary transition-colors" title="Add Floor">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setEditingBuilding({ ...b }); setShowEditBuilding(true); }} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-secondary transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteBuilding(b.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-error transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50">
                  {bFloors.length === 0 && (
                    <div className="p-4 text-center">
                      <p className="text-sm text-slate-400 mb-3">No floors added yet</p>
                      <button onClick={() => setShowAddFloor(b.id)} className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 hover:border-secondary hover:text-secondary rounded-full transition-all">
                        Add First Floor
                      </button>
                    </div>
                  )}
                  {bFloors.map(f => {
                    const fAreas = floorAreas(f.id);
                    const floorExpanded = expandedFloors[f.id];
                    return (
                      <div key={f.id} className="border-b border-slate-100 last:border-0">
                        <div className="px-6 py-3 flex items-center gap-3">
                          <button onClick={() => toggleFloor(f.id)} className="flex items-center gap-2 flex-1 text-left">
                            {floorExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                            <Layers className="w-4 h-4 text-slate-400" />
                            <span className="font-sans font-semibold text-sm text-primary">{f.name}</span>
                            <span className="font-mono text-[9px] text-slate-400 uppercase ml-1">Level {f.level_number}</span>
                            <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded-full font-mono text-[9px] text-slate-500">
                              {fAreas.length} area{fAreas.length !== 1 ? 's' : ''}
                            </span>
                          </button>
                          <button onClick={() => { setShowAddArea(f.id); setExpandedFloors(prev => ({ ...prev, [f.id]: true })); }} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-secondary transition-colors" title="Add Area">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteFloor(f.id, b.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-error transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {floorExpanded && (
                          <div className="px-10 pb-3 space-y-2">
                            {fAreas.length === 0 && (
                              <p className="text-xs text-slate-400 italic">No areas yet</p>
                            )}
                            {fAreas.map(area => (
                              <div key={area.id} className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-100">
                                <MapPin className="w-4 h-4 text-secondary shrink-0" />
                                <span className="font-sans text-sm font-medium text-primary flex-1">{area.name}</span>
                                <div className={`w-2 h-2 rounded-full ${area.dxf_parsed_data ? 'bg-status-success' : 'bg-slate-300'}`} title={area.dxf_parsed_data ? 'DXF uploaded' : 'No DXF'} />
                                <button onClick={() => handleDeleteArea(area.id, f.id)} className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-error transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button onClick={() => setShowAddArea(f.id)} className="w-full py-2 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 hover:text-secondary hover:border-secondary transition-all font-medium">
                              + Add Area
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="p-3">
                    <button onClick={() => setShowAddFloor(b.id)} className="w-full py-2 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 hover:text-secondary hover:border-secondary transition-all font-medium">
                      + Add Floor
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={() => setShowAddBuilding(true)} className="fixed bottom-8 right-8 w-14 h-14 rounded-full primary-gradient shadow-2xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all z-50 text-2xl font-light">+</button>

      {showAddBuilding && (
        <Modal title="Add Building" onClose={() => setShowAddBuilding(false)}>
          <form onSubmit={handleAddBuilding} className="space-y-4">
            <FieldInput label="Building Name *" required value={bForm.name} onChange={e => setBForm(p => ({ ...p, name: e.target.value }))} placeholder="One Tech Plaza" />
            <FieldInput label="Street Address" value={bForm.address} onChange={e => setBForm(p => ({ ...p, address: e.target.value }))} placeholder="104 Tech Boulevard" />
            <div className="grid grid-cols-2 gap-4">
              <FieldInput label="City" value={bForm.city} onChange={e => setBForm(p => ({ ...p, city: e.target.value }))} placeholder="London" />
              <FieldInput label="Country" value={bForm.country} onChange={e => setBForm(p => ({ ...p, country: e.target.value }))} placeholder="UK" />
            </div>
            <button type="submit" className="w-full py-3 bg-secondary hover:opacity-90 text-white font-bold text-xs rounded-full shadow-lg transition-all">Create Building</button>
          </form>
        </Modal>
      )}

      {showEditBuilding && editingBuilding && (
        <Modal title="Edit Building" onClose={() => { setShowEditBuilding(false); setEditingBuilding(null); }}>
          <form onSubmit={handleEditBuilding} className="space-y-4">
            <FieldInput label="Building Name *" required value={editingBuilding.name} onChange={e => setEditingBuilding(p => ({ ...p, name: e.target.value }))} />
            <FieldInput label="Street Address" value={editingBuilding.address || ''} onChange={e => setEditingBuilding(p => ({ ...p, address: e.target.value }))} />
            <div className="grid grid-cols-2 gap-4">
              <FieldInput label="City" value={editingBuilding.city || ''} onChange={e => setEditingBuilding(p => ({ ...p, city: e.target.value }))} />
              <FieldInput label="Country" value={editingBuilding.country || ''} onChange={e => setEditingBuilding(p => ({ ...p, country: e.target.value }))} />
            </div>
            <button type="submit" className="w-full py-3 bg-secondary hover:opacity-90 text-white font-bold text-xs rounded-full shadow-lg transition-all">Save Changes</button>
          </form>
        </Modal>
      )}

      {showAddFloor && (
        <Modal title="Add Floor" onClose={() => setShowAddFloor(null)}>
          <form onSubmit={handleAddFloor} className="space-y-4">
            <FieldInput label="Floor Name *" required value={fForm.name} onChange={e => setFForm(p => ({ ...p, name: e.target.value }))} placeholder="Ground Floor" />
            <div className="flex flex-col space-y-1">
              <label className="font-mono text-[9px] uppercase font-bold text-slate-400">Level Number</label>
              <input type="number" value={fForm.level_number} onChange={e => setFForm(p => ({ ...p, level_number: Number(e.target.value) }))} className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold py-2.5 px-4 outline-none" />
            </div>
            <button type="submit" className="w-full py-3 bg-secondary hover:opacity-90 text-white font-bold text-xs rounded-full shadow-lg transition-all">Add Floor</button>
          </form>
        </Modal>
      )}

      {showAddArea && (
        <Modal title="Add Area" onClose={() => setShowAddArea(null)}>
          <form onSubmit={handleAddArea} className="space-y-4">
            <FieldInput label="Area Name *" required value={aForm.name} onChange={e => setAForm(p => ({ ...p, name: e.target.value }))} placeholder="cafeteria" />
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                <strong>Important:</strong> This name must <strong>exactly</strong> match the{' '}
                <code className="bg-amber-100 px-1 rounded">area_name</code> column in your CSV. It is case-sensitive.
              </p>
            </div>
            <button type="submit" className="w-full py-3 bg-secondary hover:opacity-90 text-white font-bold text-xs rounded-full shadow-lg transition-all">Create Area</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
