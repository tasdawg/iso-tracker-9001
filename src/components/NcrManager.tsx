import React, { useState } from 'react';
import { NCRReport, User, Project, Item, Material } from '../types';
import { Search, Plus, Trash2, ShieldAlert, Edit, X, CheckCircle2, AlertTriangle, AlertOctagon, FolderOpen, Archive, ChevronUp, ChevronDown, Layers, Box } from 'lucide-react';

interface NcrManagerProps {
  ncrs: NCRReport[];
  currentUser: User;
  projects: Project[];
  items: Item[];
  materials: Material[];
  onUpdateNcrs: (updatedNcrs: NCRReport[]) => void;
}

export default function NcrManager({
  ncrs,
  currentUser,
  projects,
  items,
  materials,
  onUpdateNcrs
}: NcrManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'OPEN' | 'RESOLVED'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | NCRReport['severity']>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNcr, setEditingNcr] = useState<NCRReport | null>(null);

  // Form states (used for both adding and editing)
  const [subProjectBatch, setSubProjectBatch] = useState('');
  const [partName, setPartName] = useState('');
  const [defectNotes, setDefectNotes] = useState('');
  const [severity, setSeverity] = useState<NCRReport['severity']>('MINOR');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [raisedBy, setRaisedBy] = useState('');
  const [raisedDate, setRaisedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Advanced ISO 9001 fields
  const [materialId, setMaterialId] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [materialBatch, setMaterialBatch] = useState('');
  const [materialSupplier, setMaterialSupplier] = useState('');
  const [defectCategory, setDefectCategory] = useState<NCRReport['defectCategory']>('GEOMETRIC_OUT_OF_TOLERANCE');
  const [disposition, setDisposition] = useState<NCRReport['disposition']>('REWORK');
  const [quarantineLocation, setQuarantineLocation] = useState('');
  const [assignedWelderStamp, setAssignedWelderStamp] = useState('');
  const [rootCause, setRootCause] = useState('');

  // Project selection states
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showCompletedDropdown, setShowCompletedDropdown] = useState(false);
  const [showInProgressDropdown, setShowInProgressDropdown] = useState(false);

  // Item selection states (appears when project is selected)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  // Material traceability states (appears when item is selected)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);

  const activeNcrs = ncrs.filter(ncr => !ncr.status.includes('DELETED'));

  const filteredNcrs = activeNcrs.filter(ncr => {
    const matchesSearch = 
      ncr.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ncr.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ncr.subProjectBatch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ncr.defectNotes.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ncr.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || ncr.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  // Filter projects for NCR selection
  const activeProjects = projects.filter(p => p.notVisible !== 1);
  const completedProjects = activeProjects.filter(p => p.status === 'Completed');
  const inProcessProjects = activeProjects.filter(p => p.status !== 'Completed' && p.status !== 'Shipped');

  const openAddForm = () => {
    setEditingNcr(null);
    setSubProjectBatch('');
    setPartName('');
    setDefectNotes('');
    setSeverity('MINOR');
    setCorrectiveAction('');
    setRaisedBy(currentUser.name);
    setRaisedDate(new Date().toISOString().split('T')[0]);
    setMaterialId('');
    setMaterialName('');
    setMaterialBatch('');
    setMaterialSupplier('');
    setDefectCategory('GEOMETRIC_OUT_OF_TOLERANCE');
    setDisposition('REWORK');
    setQuarantineLocation('');
    setAssignedWelderStamp('');
    setRootCause('');
    setSelectedProjectId(null);
    setShowAddForm(true);
  };

  const openEditForm = (ncr: NCRReport) => {
    setEditingNcr(ncr);
    setSubProjectBatch(ncr.subProjectBatch);
    setPartName(ncr.partName);
    setDefectNotes(ncr.defectNotes);
    setSeverity(ncr.severity);
    setCorrectiveAction(ncr.correctiveAction);
    setRaisedBy(ncr.raisedBy);
    setRaisedDate(ncr.raisedDate);
    setMaterialId(ncr.materialId || '');
    setMaterialName(ncr.materialName || '');
    setMaterialBatch(ncr.materialBatch || '');
    setMaterialSupplier(ncr.materialSupplier || '');
    setDefectCategory(ncr.defectCategory || 'GEOMETRIC_OUT_OF_TOLERANCE');
    setDisposition(ncr.disposition || 'REWORK');
    setQuarantineLocation(ncr.quarantineLocation || '');
    setAssignedWelderStamp(ncr.assignedWelderStamp || '');
    setRootCause(ncr.rootCause || '');
    setShowAddForm(true);
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedItemId(null);
    setSelectedMaterialId(null);
    setDefectNotes('');
    setMaterialId('');
    setMaterialName('');
    setMaterialBatch('');
    setMaterialSupplier('');
    
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setSubProjectBatch(project.id);
      setPartName(project.title || project.batchNo);
    }
  };

  // Get items for selected project from subProjects
  const getProjectItems = () => {
    if (!selectedProjectId) return [];
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project?.subProjects) return [];
    
    const itemIds = [...new Set(project.subProjects.map(sp => sp.itemId))];
    return items.filter(item => itemIds.includes(item.id) && !item.isDeleted);
  };

  // Get materials for selected project from includeStockItems
  const getProjectMaterials = () => {
    if (!selectedProjectId) return [];
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project?.includeStockItems) return [];
    
    const materialIds = [...new Set(project.includeStockItems.map(msi => msi.materialId))];
    return materials.filter(mat => materialIds.includes(mat.id) && !mat.isDeleted);
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    setSelectedMaterialId(null);
    
    const item = items.find(i => i.id === itemId);
    if (item) {
      setDefectNotes(item.description || `${item.name} - Non-conformance observed during inspection`);
    }
  };

  const handleMaterialSelect = (materialId: string) => {
    setSelectedMaterialId(materialId);
    
    const material = materials.find(m => m.id === materialId);
    if (material) {
      setMaterialId(material.id);
      setMaterialName(material.name);
      setMaterialBatch(material.batchNo);
      setMaterialSupplier(material.supplier);
    }
  };

  const handleSoftDelete = (id: string) => {
    if (confirm('SOFT-DELETE WARNING:\n\nArchive this NCR report? This removes it from active views but retains historical compliance records.')) {
      const updated = ncrs.map(ncr => 
        ncr.id === id ? { ...ncr, status: 'DELETED' as any } : ncr
      );
      onUpdateNcrs(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName || !correctiveAction) {
      alert("Please complete the required fields: Part Name and Corrective Action Plan.");
      return;
    }

    if (editingNcr) {
      // Edit mode
      const updated = ncrs.map(ncr => ncr.id === editingNcr.id ? {
        ...ncr,
        subProjectBatch,
        partName,
        defectNotes,
        severity,
        correctiveAction,
        raisedBy,
        raisedDate,
        materialId: materialId || undefined,
        materialName: materialName || undefined,
        materialBatch: materialBatch || undefined,
        materialSupplier: materialSupplier || undefined,
        defectCategory: defectCategory || undefined,
        disposition: disposition || undefined,
        quarantineLocation: quarantineLocation || undefined,
        assignedWelderStamp: assignedWelderStamp || undefined,
        rootCause: rootCause || undefined
      } : ncr);
      onUpdateNcrs(updated);
    } else {
      // Add mode
      const newId = `NCR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newNcr: NCRReport = {
        id: newId,
        subProjectBatch: subProjectBatch || 'UNASSIGNED',
        partName,
        defectNotes,
        severity,
        correctiveAction,
        raisedBy: raisedBy || currentUser.name,
        raisedDate,
        status: 'OPEN',
        materialId: materialId || undefined,
        materialName: materialName || undefined,
        materialBatch: materialBatch || undefined,
        materialSupplier: materialSupplier || undefined,
        defectCategory: defectCategory || undefined,
        disposition: disposition || undefined,
        quarantineLocation: quarantineLocation || undefined,
        assignedWelderStamp: assignedWelderStamp || undefined,
        rootCause: rootCause || undefined
      };

      onUpdateNcrs([...ncrs, newNcr]);
    }

    setShowAddForm(false);
  };

  const handleResolveNCR = (id: string) => {
    if (confirm('CONFIRM RESOLUTION:\n\nMark this NCR as resolved? This requires documented corrective action verification.')) {
      const updated = ncrs.map(ncr => 
        ncr.id === id ? {
          ...ncr,
          status: 'RESOLVED' as const,
          resolvedBy: currentUser.name,
          resolvedDate: new Date().toISOString().split('T')[0]
        } : ncr
      );
      onUpdateNcrs(updated);
    }
  };

  const getSeverityIcon = (sev: NCRReport['severity']) => {
    switch (sev) {
      case 'MINOR': return <AlertTriangle size={14} className="text-yellow-500" />;
      case 'MAJOR': return <AlertTriangle size={16} className="text-orange-500" />;
      case 'CRITICAL_AUDIT': return <AlertOctagon size={18} className="text-red-500" />;
      default: return null;
    }
  };

  const getSeverityColor = (sev: NCRReport['severity']) => {
    switch (sev) {
      case 'MINOR': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'MAJOR': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'CRITICAL_AUDIT': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return '';
    }
  };

  const getStatusColor = (status: NCRReport['status']) => {
    switch (status) {
      case 'OPEN': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'RESOLVED': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return '';
    }
  };

  return (
    <div className="space-y-6 font-mono animate-fadeIn">
      
      {/* Search and filters tab section */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-zinc-950 p-3 border border-zinc-800">
        <div className="flex flex-wrap items-center gap-3 flex-grow">
          <div className="relative text-xs text-white w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 text-zinc-500" size={13} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search NCR by ID, Part Name, Defect..."
              className="w-full bg-black border border-zinc-800 pl-8 pr-3 py-1.5 outline-none focus:border-orange-500 text-xs uppercase"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 uppercase text-[10px] font-bold">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-black border border-zinc-800 text-zinc-300 py-1 px-2.5 text-[10px] uppercase font-bold outline-none cursor-pointer focus:border-orange-500"
            >
              <option value="all">All Status</option>
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 uppercase text-[10px] font-bold">Severity:</span>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value as any)}
              className="bg-black border border-zinc-800 text-zinc-300 py-1 px-2.5 text-[10px] uppercase font-bold outline-none cursor-pointer focus:border-orange-500"
            >
              <option value="all">All Severities</option>
              <option value="MINOR">Minor</option>
              <option value="MAJOR">Major</option>
              <option value="CRITICAL_AUDIT">Critical Audit</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={openAddForm}
            className="bg-orange-500 hover:bg-orange-400 text-black py-2 px-4 text-xs font-extrabold tracking-widest uppercase cursor-pointer whitespace-nowrap"
          >
            + Raise NCR Report
          </button>
        </div>
      </div>

      {/* Popout Registration Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 text-white relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 right-0 p-3 z-10">
              <button
                onClick={() => setShowAddForm(false)}
                className="text-zinc-500 hover:text-orange-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
              <span className="text-[9px] uppercase tracking-widest text-orange-500 font-bold block mb-1">
                ISO 9001 Clause 8.7 Non-Conformance
              </span>
              <h3 className="font-bold text-base uppercase tracking-widest text-[#cbd5e1] font-sans">
                {editingNcr ? 'Edit NCR Report' : 'Raise New Non-Conformance Report'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-mono">
              
              {/* Project Selection Section */}
              <div className="border border-zinc-800 bg-zinc-950/50 p-4">
                <button
                  type="button"
                  onClick={() => setShowProjectPicker(!showProjectPicker)}
                  className="flex items-center justify-between w-full text-left mb-3"
                >
                  <span className="text-[10px] uppercase tracking-widest text-orange-500 font-bold">
                    {showProjectPicker ? 'Hide' : 'Show'} Project Reference Picker
                  </span>
                  {showProjectPicker ? (
                    <span className="text-zinc-400"><ChevronUp size={16} /></span>
                  ) : (
                    <span className="text-zinc-400"><ChevronDown size={16} /></span>
                  )}
                </button>

                {showProjectPicker && (
                  <div className="space-y-4">
                    {/* Completed Projects Custom Dropdown */}
                    {completedProjects.length > 0 && (
                      <div className="relative">
                        <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-2 flex items-center gap-1.5">
                          <Archive size={12} className="text-emerald-500" />
                          Completed Projects
                        </label>
                        <button
                          type="button"
                          onClick={() => { setShowCompletedDropdown(!showCompletedDropdown); setShowInProgressDropdown(false); }}
                          className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none text-left flex items-center justify-between"
                        >
                          <span className={selectedProjectId && completedProjects.find(p => p.id === selectedProjectId) ? 'text-white' : 'text-zinc-500'}>
                            {selectedProjectId && completedProjects.find(p => p.id === selectedProjectId) 
                              ? `${completedProjects.find(p => p.id === selectedProjectId)!.id} • ${completedProjects.find(p => p.id === selectedProjectId)!.title || 'Untitled'}`
                              : '-- Select Completed Project --'}
                          </span>
                          <ChevronDown size={14} className="text-zinc-500" />
                        </button>
                        
                        {showCompletedDropdown && (
                          <div className="absolute z-20 w-full mt-1 bg-zinc-950 border border-zinc-800 max-h-48 overflow-y-auto shadow-xl">
                            {completedProjects.map(proj => (
                              <button
                                key={proj.id}
                                type="button"
                                onClick={() => { handleProjectSelect(proj.id); setShowCompletedDropdown(false); }}
                                className={`w-full p-3 text-left border-b border-zinc-900 last:border-b-0 transition-all ${
                                  selectedProjectId === proj.id ? 'bg-orange-500/10' : 'hover:bg-zinc-900'
                                }`}
                              >
                                <div className="text-sm font-bold text-white mb-1">{proj.id}</div>
                                <div className="text-[11px] text-zinc-300 mb-1 truncate">{proj.title || 'Untitled Project'}</div>
                                <div className="text-[9px] text-zinc-500 font-mono">Batch: {proj.batchNo}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* In-Process Projects Custom Dropdown */}
                    {inProcessProjects.length > 0 && (
                      <div className="relative">
                        <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-2 flex items-center gap-1.5">
                          <FolderOpen size={12} className="text-blue-500" />
                          In Process Projects
                        </label>
                        <button
                          type="button"
                          onClick={() => { setShowInProgressDropdown(!showInProgressDropdown); setShowCompletedDropdown(false); }}
                          className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none text-left flex items-center justify-between"
                        >
                          <span className={selectedProjectId && inProcessProjects.find(p => p.id === selectedProjectId) ? 'text-white' : 'text-zinc-500'}>
                            {selectedProjectId && inProcessProjects.find(p => p.id === selectedProjectId) 
                              ? `${inProcessProjects.find(p => p.id === selectedProjectId)!.id} • ${inProcessProjects.find(p => p.id === selectedProjectId)!.title || 'Untitled'}`
                              : '-- Select In Process Project --'}
                          </span>
                          <ChevronDown size={14} className="text-zinc-500" />
                        </button>
                        
                        {showInProgressDropdown && (
                          <div className="absolute z-20 w-full mt-1 bg-zinc-950 border border-zinc-800 max-h-48 overflow-y-auto shadow-xl">
                            {inProcessProjects.map(proj => (
                              <button
                                key={proj.id}
                                type="button"
                                onClick={() => { handleProjectSelect(proj.id); setShowInProgressDropdown(false); }}
                                className={`w-full p-3 text-left border-b border-zinc-900 last:border-b-0 transition-all ${
                                  selectedProjectId === proj.id ? 'bg-orange-500/10' : 'hover:bg-zinc-900'
                                }`}
                              >
                                <div className="text-sm font-bold text-white mb-1">{proj.id}</div>
                                <div className="text-[11px] text-zinc-300 mb-1 truncate">{proj.title || 'Untitled Project'}</div>
                                <div className="text-[9px] text-zinc-500 font-mono">Batch: {proj.batchNo}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {completedProjects.length === 0 && inProcessProjects.length === 0 && (
                      <p className="text-[10px] text-zinc-500 text-center py-4">No projects available</p>
                    )}

                    {selectedProjectId && (
                      <div className="pt-2 border-t border-zinc-800">
                        <span className="text-[9px] uppercase text-zinc-500 block mb-1">Selected Project:</span>
                        <strong className="text-orange-400 text-xs">{projects.find(p => p.id === selectedProjectId)?.id}</strong>
                      </div>
                    )}
                  </div>
                )}

              {/* Item Selection Dropdown (appears when project is selected) */}
              {selectedProjectId && getProjectItems().length > 0 && (
                <div className="border border-zinc-800 bg-zinc-950/50 p-4">
                  <label className="text-[9px] uppercase tracking-widest text-orange-500 font-bold block mb-2 flex items-center gap-1.5">
                    <Layers size={12} />
                    Select Item / Part (Auto-fills Defect Description)
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowItemDropdown(!showItemDropdown); setShowMaterialDropdown(false); }}
                      className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none text-left flex items-center justify-between"
                    >
                      <span className={selectedItemId ? 'text-white' : 'text-zinc-500'}>
                        {selectedItemId 
                          ? `${items.find(i => i.id === selectedItemId)?.itemCode || ''} • ${items.find(i => i.id === selectedItemId)?.name || ''}`
                          : '-- Select Item --'}
                      </span>
                      <ChevronDown size={14} className="text-zinc-500" />
                    </button>
                    
                    {showItemDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-zinc-950 border border-zinc-800 max-h-48 overflow-y-auto shadow-xl">
                        {getProjectItems().map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => { handleItemSelect(item.id); setShowItemDropdown(false); }}
                            className={`w-full p-3 text-left border-b border-zinc-900 last:border-b-0 transition-all ${
                              selectedItemId === item.id ? 'bg-orange-500/10' : 'hover:bg-zinc-900'
                            }`}
                          >
                            <div className="text-sm font-bold text-white mb-1">{item.itemCode || item.id}</div>
                            <div className="text-[11px] text-zinc-300 mb-1 truncate">{item.name}</div>
                            <div className="text-[9px] text-zinc-500 font-mono line-clamp-2">{item.description}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Material Traceability Dropdown (appears when item is selected) */}
              {selectedItemId && getProjectMaterials().length > 0 && (
                <div className="border border-zinc-800 bg-zinc-950/50 p-4">
                  <label className="text-[9px] uppercase tracking-widest text-orange-500 font-bold block mb-2 flex items-center gap-1.5">
                    <Box size={12} />
                    Material Traceability (Pre-select)
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowMaterialDropdown(!showMaterialDropdown); setShowItemDropdown(false); }}
                      className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none text-left flex items-center justify-between"
                    >
                      <span className={selectedMaterialId ? 'text-white' : 'text-zinc-500'}>
                        {selectedMaterialId 
                          ? `${materials.find(m => m.id === selectedMaterialId)?.batchNo || ''} • ${materials.find(m => m.id === selectedMaterialId)?.name || ''}`
                          : '-- Select Material --'}
                      </span>
                      <ChevronDown size={14} className="text-zinc-500" />
                    </button>
                    
                    {showMaterialDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-zinc-950 border border-zinc-800 max-h-48 overflow-y-auto shadow-xl">
                        {getProjectMaterials().map(mat => (
                          <button
                            key={mat.id}
                            type="button"
                            onClick={() => { handleMaterialSelect(mat.id); setShowMaterialDropdown(false); }}
                            className={`w-full p-3 text-left border-b border-zinc-900 last:border-b-0 transition-all ${
                              selectedMaterialId === mat.id ? 'bg-orange-500/10' : 'hover:bg-zinc-900'
                            }`}
                          >
                            <div className="text-sm font-bold text-white mb-1">{mat.batchNo}</div>
                            <div className="text-[11px] text-zinc-300 mb-1 truncate">{mat.name}</div>
                            <div className="text-[9px] text-zinc-500 font-mono">Supplier: {mat.supplier} • Grade: {mat.grade}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                
                <div className="space-y-1 col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Sub-Project Batch Ref <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PRJ-2026-001"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={subProjectBatch}
                    onChange={e => setSubProjectBatch(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Part Name / Assembly <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Frame Rail A"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={partName}
                    onChange={e => setPartName(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Severity Classification <span className="text-orange-500">*</span>
                  </label>
                  <select
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={severity}
                    onChange={e => setSeverity(e.target.value as any)}
                  >
                    <option value="MINOR">Minor - Cosmetic / Documentation</option>
                    <option value="MAJOR">Major - Functional Impact</option>
                    <option value="CRITICAL_AUDIT">Critical Audit - Safety/Certification</option>
                  </select>
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Defect Category
                  </label>
                  <select
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={defectCategory}
                    onChange={e => setDefectCategory(e.target.value as any)}
                  >
                    <option value="GEOMETRIC_OUT_OF_TOLERANCE">Geometric Out of Tolerance</option>
                    <option value="METALLURGICAL_LAMINATION">Metallurgical Lamination</option>
                    <option value="WELDING_DEFECT_HYDROGEN">Welding Defect (Hydrogen)</option>
                    <option value="COATING_GALVANIZING_DEFECT">Coating / Galvanizing Defect</option>
                    <option value="DOCUMENTATION_DISCREPANCY">Documentation Discrepancy</option>
                    <option value="SUBCONTRACTOR_OUTSOURCE_FAILURE">Subcontractor Outsourcing Failure</option>
                  </select>
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Corrective Action Plan <span className="text-orange-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Document the prescribed remedy, rework procedure, or disposition..."
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none resize-none"
                    value={correctiveAction}
                    onChange={e => setCorrectiveAction(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Raised By Inspector
                  </label>
                  <input
                    type="text"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={raisedBy}
                    onChange={e => setRaisedBy(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Date Observed
                  </label>
                  <input
                    type="date"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={raisedDate}
                    onChange={e => setRaisedDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Root Cause Analysis
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Identify underlying cause (5 Whys, Fishbone, etc.)..."
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none resize-none"
                    value={rootCause}
                    onChange={e => setRootCause(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-2 border-t border-zinc-800 pt-4">
                  <h4 className="text-[10px] uppercase tracking-widest text-orange-500 font-bold mb-3">Material Traceability (Optional)</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 col-span-1">
                      <label className="block text-[9px] uppercase font-bold text-zinc-500">Material ID</label>
                      <input
                        type="text"
                        placeholder="e.g. MAT-2026-0042"
                        className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                        value={materialId}
                        onChange={e => setMaterialId(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1 col-span-1">
                      <label className="block text-[9px] uppercase font-bold text-zinc-500">Material Name</label>
                      <input
                        type="text"
                        placeholder="e.g. RHS 100x50x4mm"
                        className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                        value={materialName}
                        onChange={e => setMaterialName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1 col-span-1">
                      <label className="block text-[9px] uppercase font-bold text-zinc-500">Mill Batch Code</label>
                      <input
                        type="text"
                        placeholder="e.g. MILL-HEAT-2900"
                        className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                        value={materialBatch}
                        onChange={e => setMaterialBatch(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1 col-span-1">
                      <label className="block text-[9px] uppercase font-bold text-zinc-500">Supplier</label>
                      <input
                        type="text"
                        placeholder="e.g. BlueScope Steel"
                        className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                        value={materialSupplier}
                        onChange={e => setMaterialSupplier(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1 col-span-2 border-t border-zinc-800 pt-4">
                  <h4 className="text-[10px] uppercase tracking-widest text-orange-500 font-bold mb-3">Disposition & Quarantine</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 col-span-1">
                      <label className="block text-[9px] uppercase font-bold text-zinc-500">Disposition</label>
                      <select
                        className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                        value={disposition}
                        onChange={e => setDisposition(e.target.value as any)}
                      >
                        <option value="REWORK">Rework</option>
                        <option value="SCRAP">Scrap</option>
                        <option value="CONCESSION_USE_AS_IS">Concession (Use As-Is)</option>
                        <option value="RETURN_TO_SUPPLIER">Return to Supplier</option>
                      </select>
                    </div>

                    <div className="space-y-1 col-span-1">
                      <label className="block text-[9px] uppercase font-bold text-zinc-500">Quarantine Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Rack Q-B Bay 3"
                        className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                        value={quarantineLocation}
                        onChange={e => setQuarantineLocation(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1 col-span-2">
                      <label className="block text-[9px] uppercase font-bold text-zinc-500">Assigned Welder Stamp (if applicable)</label>
                      <input
                        type="text"
                        placeholder="e.g. WPS-1554-AUS-2026"
                        className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                        value={assignedWelderStamp}
                        onChange={e => setAssignedWelderStamp(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-black hover:bg-zinc-900 text-zinc-400 px-4 py-2 uppercase tracking-wider text-[10px] border border-zinc-800"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-400 text-black font-extrabold px-6 py-2 uppercase tracking-wider text-[10px]"
                >
                  {editingNcr ? 'Update NCR' : 'Confirm & Log NCR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NCR Register Table */}
      <div className="border border-zinc-800 overflow-x-auto">
        <table className="w-full text-left text-[10.5px] border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-zinc-950 border-b border-zinc-800 uppercase tracking-wider text-[8.5px] text-zinc-500">
              <th className="p-3 font-bold">NCR ID</th>
              <th className="p-3 font-bold">Batch Ref</th>
              <th className="p-3 font-bold">Part Name</th>
              <th className="p-3 font-bold">Defect Category</th>
              <th className="p-3 font-bold">Severity</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold">Raised Date</th>
              <th className="p-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 font-mono">
            {filteredNcrs.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-zinc-500 uppercase tracking-widest text-[10px]">
                  No NCR reports match your filters. Raise a new report to begin.
                </td>
              </tr>
            ) : (
              filteredNcrs.map((ncr) => (
                <tr key={ncr.id} className="hover:bg-zinc-900/30 text-zinc-300">
                  <td className="p-3">
                    <span className="font-sans font-bold text-white block">{ncr.id}</span>
                    {ncr.materialBatch && (
                      <span className="text-[8px] text-zinc-500 block uppercase">Batch: {ncr.materialBatch}</span>
                    )}
                  </td>
                  <td className="p-3 text-zinc-400 font-bold">{ncr.subProjectBatch}</td>
                  <td className="p-3">
                    <span className="font-sans font-bold text-white block truncate max-w-[150px]">{ncr.partName}</span>
                    {ncr.defectCategory && (
                      <span className="text-[8px] text-zinc-500 block uppercase">{ncr.defectCategory.replace(/_/g, ' ')}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`px-1.5 py-0.5 border text-[8px] uppercase font-bold ${getStatusColor(ncr.status)}`}>
                      {ncr.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      {getSeverityIcon(ncr.severity)}
                      <span className={`px-1.5 py-0.5 border text-[8px] uppercase font-bold ${getSeverityColor(ncr.severity)}`}>
                        {ncr.severity.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-1.5 py-0.5 border text-[8px] uppercase font-bold ${getStatusColor(ncr.status)}`}>
                      {ncr.status}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-400">{ncr.raisedDate}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {ncr.status === 'OPEN' && (
                        <button
                          onClick={() => handleResolveNCR(ncr.id)}
                          className="text-green-500 hover:text-green-400 transition-colors cursor-pointer"
                          title="Mark as Resolved"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => openEditForm(ncr)}
                        className="text-zinc-400 hover:text-orange-500 transition-colors cursor-pointer"
                        title="Edit NCR"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleSoftDelete(ncr.id)}
                        className="text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                        title="Archive NCR"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 text-[10px] uppercase tracking-widest">
        <div className="bg-zinc-950 border border-zinc-800 p-3">
          <span className="text-zinc-500 block mb-1">Total NCRs</span>
          <strong className="text-white text-sm font-sans">{ncrs.length}</strong>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-3">
          <span className="text-red-400 block mb-1">Open</span>
          <strong className="text-white text-sm font-sans">{ncrs.filter(n => n.status === 'OPEN').length}</strong>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-3">
          <span className="text-green-400 block mb-1">Resolved</span>
          <strong className="text-white text-sm font-sans">{ncrs.filter(n => n.status === 'RESOLVED').length}</strong>
        </div>
      </div>
    </div>
  );
}
