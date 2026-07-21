/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Project, Item, Material, InventoryLog, Station } from '../types';
import { generateNextLogId } from '../utils';
import { 
  ShieldAlert, UserCheck, HardHat, Bolt, CheckCircle2, ChevronRight, 
  CornerDownRight, Layers, FileText, Search, Clock, Box, ShieldCheck, 
  PlusCircle, RefreshCw, Hammer, Radio, Settings, ClipboardCheck, X
} from 'lucide-react';

interface PrePageProps {
  allUsers: User[];
  currentOperator: User;
  activeStage: string;
  stations: Station[];
  onInduct: (user: User, stage: string, projectId?: string) => void;
  projects: Project[];
  items: Item[];
  materials: Material[];
  logs: InventoryLog[];
  onAddMaterialBatch: (newMat: Material, log: InventoryLog) => void;
}

export default function PrePage({
  allUsers,
  currentOperator,
  activeStage,
  stations,
  onInduct,
  projects,
  items,
  materials,
  logs,
  onAddMaterialBatch
}: PrePageProps) {
  // Select active state for operator and station
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Update selected user when allUsers are loaded or saved ID changes
  useEffect(() => {
    if (allUsers.length > 0) {
      const savedId = localStorage.getItem('operator_id');
      const found = savedId ? allUsers.find(u => u.id === savedId) : null;
      setSelectedUser(found || allUsers[2]); // Default to Jack Thompson (Worker)
    }
  }, [allUsers]);
  
  // Build stages list from database stations + "All Stages" option
  const standardStages = ['All Stages', ...stations.map(s => s.name)];

  const [selectedStage, setSelectedStage] = useState<string>(activeStage || 'All Stages');
  const [isEnteringStock, setIsEnteringStock] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // PIN verification handler for Manager Mode access
  const handlePinSubmit = () => {
    if (pinInput === '2026') {
      setShowPinModal(false);
      onInduct(selectedUser!, 'All Stages', selectedProjectId || undefined);
    } else {
      setPinError('INVALID PIN CODE • ACCESS DENIED');
      setPinInput('');
    }
  };

  // Redesigned physical Project Picker values
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    const savedProjId = localStorage.getItem('operator_project_id');
    const validProj = projects.find(p => p.id === savedProjId && p.notVisible !== 1);
    return validProj ? validProj.id : (projects.find(p => p.notVisible !== 1)?.id || null);
  });

  // Material Form States
  const [selectedMaterialTemplate, setSelectedMaterialTemplate] = useState<string>('custom');
  const [customName, setCustomName] = useState('');
  const [mType, setMType] = useState<Material['type']>('RHS');
  const [mDimensions, setMDimensions] = useState('');
  const [mGrade, setMGrade] = useState('');
  const [mQty, setMQty] = useState<number>(10);
  const [mUnit, setMUnit] = useState('Lengths');
  const [mSupplier, setMSupplier] = useState('');
  const [mBatchNo, setMBatchNo] = useState('');
  const [mInvoiceNo, setMInvoiceNo] = useState('');
  const [mPoNo, setMPoNo] = useState('');

  // Filter active (not hidden) project runs
  const activeProjects = projects.filter(p => p.notVisible !== 1);

  // Search filtered projects
  const searchedProjects = activeProjects.filter(p => {
    return (
      p.title.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.batchNo.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.jobCode && p.jobCode.toLowerCase().includes(projectSearch.toLowerCase()))
    );
  });

  // Get unique material profiles as templates
  const uniqueMaterials = materials.reduce((acc: Material[], current) => {
    const exists = acc.some(item => item.name.toLowerCase() === current.name.toLowerCase());
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);

  const handleSelectTemplate = (templateName: string) => {
    setSelectedMaterialTemplate(templateName);
    if (templateName === 'custom') {
      setCustomName('');
      setMDimensions('');
      setMGrade('');
      setMSupplier('');
      setMUnit('Lengths');
    } else {
      const template = uniqueMaterials.find(m => m.name === templateName);
      if (template) {
        setCustomName(template.name);
        setMType(template.type);
        setMDimensions(template.dimensions);
        setMGrade(template.grade);
        setMUnit(template.unit);
        setMSupplier(template.supplier);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = selectedMaterialTemplate === 'custom' ? customName.trim() : selectedMaterialTemplate;
    if (!finalName) {
      alert("Material template name or custom title is required.");
      return;
    }
    if (!mBatchNo.trim()) {
      alert("A unique Mill Heat Batch Number is required for ISO 9001 compliance.");
      return;
    }
    if (mQty <= 0) {
      alert("Received quantity must be greater than 0.");
      return;
    }

    const batchExists = materials.some(m => m.batchNo.toLowerCase() === mBatchNo.trim().toLowerCase());
    if (batchExists) {
      alert(`Error Trace: A structural stock batch with Mill Batch Code "${mBatchNo.toUpperCase()}" already exists in inventory. To follow ISO 9001 Clause 8.5.2, each incoming physical stock lot from your suppliers MUST register with a distinct, traceable batch number code.`);
      return;
    }

    const newMaterialId = `MAT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!selectedUser) {
      alert("Error: No operator selected. Please select an active worker before receiving stock.");
      return;
    }

    const newMaterial: Material = {
      id: newMaterialId,
      name: finalName,
      type: mType,
      dimensions: mDimensions || 'Standard Size',
      grade: mGrade || 'Grade 300 Steel',
      totalStock: Number(mQty),
      allocatedStock: 0,
      availableStock: Number(mQty),
      unit: mUnit || 'Lengths',
      supplier: mSupplier || 'Local Steel Distributor',
      batchNo: mBatchNo.toUpperCase().trim(),
      invoiceNo: mInvoiceNo.toUpperCase().trim() || 'INV-RE-TEMP',
      poNumber: mPoNo.toUpperCase().trim() || 'PO-RE-MOCK',
      receivedByUserId: selectedUser.id,
      receiptDate: new Date().toISOString().split('T')[0],
      materialCertUrl: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=1200'
    };

    // Build a temporary combined list so the generator checks against existing DB logs too
    const allLogsForIdGen = [...logs];
    
    const newLog: InventoryLog = {
      id: generateNextLogId(allLogsForIdGen),
      type: 'INCOME',
      date: new Date().toISOString().split('T')[0],
      materialId: newMaterialId,
      materialName: finalName,
      quantity: Number(mQty),
      batchNo: mBatchNo.toUpperCase().trim(),
      invoiceNo: mInvoiceNo.toUpperCase().trim() || undefined,
      poNumber: mPoNo.toUpperCase().trim() || undefined,
      userId: selectedUser.id,
      notes: `Raw physical steel shipment received on shift. [ISO 9001 compliance verification batch trace logged]`,
    };

    onAddMaterialBatch(newMaterial, newLog);
    setSuccessMessage(`Raw Stock Registered! Added Mill Batch Code "${mBatchNo.toUpperCase()}" as a separate trace batch ID.`);
  };

  // Compute stats of assigned tasks for the selected user to display live preview
  let assignedCount = 0;
  let inProgressCount = 0;
  (projects || []).forEach(proj => {
    (proj.subProjects || []).forEach(sub => {
      (sub.processes || []).forEach(p => {
        if (p && p.assignedUserId === selectedUser?.id) {
          assignedCount++;
          if (p.status === 'In Progress') inProgressCount++;
        }
      });
    });
  });

  const activeProjectRun = projects.find(p => p.id === selectedProjectId && !p.isDeleted);

  return (
    <div className="min-h-screen bg-black text-[#d1d5db] font-sans antialiased flex flex-col justify-start items-center p-4 sm:p-6 md:p-8 relative overflow-y-auto">
      {/* Background industrial circuit design */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-950/40 via-black to-black z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 z-0 pointer-events-none" />

      {/* Main Terminal Shell container */}
      <div className="w-full max-w-7xl bg-[#0b0b0b] border border-white/10 relative z-10 flex flex-col overflow-hidden shadow-[0_0_50px_rgba(249,115,22,0.04)] mb-8">
        
        {/* Header Block */}
        <div className="p-6 border-b border-white/10 bg-[#0e0e0e] flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-1.5 text-center md:text-left">
            <span className="text-[10px] text-[#f97316] font-black tracking-[0.4em] uppercase block">
              FACILITY SHOP FLOOR BAY 4 CONTROL TERMINAL
            </span>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <h1 className="font-sans font-black text-2xl tracking-widest text-white leading-none uppercase">
                ISO-9001 BATCH VERIFICATION CODES
              </h1>
              <span className="text-[10px] px-2 py-0.5 bg-green-950/50 border border-green-900/40 text-green-400 font-mono font-bold shrink-0 animate-pulse">
                STAMP SYNCED
              </span>
            </div>
            <p className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">
              Quality Assurance Management Tracer • Melbourne Headquarters Australia
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setIsEnteringStock(!isEnteringStock);
                setSuccessMessage(null);
              }}
              className="px-4 py-2 border border-[#f97316] text-[#f97316] hover:bg-[#f97316] hover:text-black transition-all text-xs font-mono tracking-widest uppercase font-black"
            >
              {isEnteringStock ? '← Shift Profile Selection' : '📥 ENTER INCOMING STEEL STOCK'}
            </button>
          </div>
        </div>

        {/* 2-Column Industrial Layout split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 border-b border-white/5 min-h-[580px]">
          
          {/* Column 1: Profile Selection Console */}
          <div className="lg:col-span-1 p-6 border-b lg:border-b-0 lg:border-r border-white/10 space-y-6">
            {isEnteringStock ? (
              successMessage ? (
                <div className="space-y-6 py-4 text-center animate-fadeIn">
                  <div className="w-14 h-14 bg-green-550/10 border border-green-500 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="text-green-500 w-7 h-7" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-black text-white uppercase tracking-wider">Raw Steel Batch Registered</h3>
                    <p className="text-[11px] text-green-400 max-w-sm mx-auto font-mono leading-relaxed px-2">
                      {successMessage}
                    </p>
                  </div>
                  
                  <div className="border border-white/10 bg-black p-4 text-left max-w-sm mx-auto space-y-3 font-mono text-[10px]">
                    <div className="flex justify-between text-[9px] uppercase font-bold text-zinc-500">
                      <span>SECURE RECORD</span>
                      <span className="text-[#f97316] font-black">ISO-9001 CERTIFIED</span>
                    </div>
                    <div className="border-b border-white/5 pb-2">
                      <span className="text-zinc-500 block uppercase font-bold">Standard Profile Name:</span>
                      <h4 className="font-extrabold text-white uppercase font-sans mt-0.5">{customName || selectedMaterialTemplate}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-zinc-440 font-mono">
                      <div>GRADE: <strong className="text-white">{mGrade || 'Grade 300'}</strong></div>
                      <div>BATCH/HEAT NO: <strong className="text-[#f97316] font-extrabold">{mBatchNo.toUpperCase()}</strong></div>
                      <div>QTY: <strong className="text-white">{mQty} {mUnit}</strong></div>
                      <div>STATION OP: <strong className="text-white truncate block">{selectedUser?.name || '—'}</strong></div>
                    </div>
                  </div>

                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSuccessMessage(null);
                        setCustomName('');
                        setMBatchNo('');
                        setMInvoiceNo('');
                        setMPoNo('');
                        setMQty(10);
                        setSelectedMaterialTemplate('custom');
                      }}
                      className="px-4 py-2 bg-black border border-white/10 hover:border-[#f97316] text-white font-bold text-[10px] uppercase tracking-wider rounded-none cursor-pointer"
                    >
                      Receive New Steel Lot
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEnteringStock(false);
                        setSuccessMessage(null);
                      }}
                      className="px-4 py-2 bg-[#f97316] hover:bg-orange-400 text-black font-black text-[10px] uppercase tracking-wider rounded-none cursor-pointer"
                    >
                      Return to Check-In
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4 py-1 animate-fadeIn max-h-[500px] overflow-y-auto pr-1 font-mono text-xs">
                  <div className="p-3 bg-orange-500/5 border border-orange-500/20 flex justify-between items-center text-[10px]">
                    <span className="text-zinc-500 uppercase font-bold">RECEIVING CLERK:</span>
                    <strong className="text-[#f97316] tracking-wide">{selectedUser?.name || '—'} ({selectedUser?.role || '—'})</strong>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wide text-zinc-500 font-bold block">Material Dimension Profile Template</label>
                    <select
                      value={selectedMaterialTemplate}
                      onChange={(e) => handleSelectTemplate(e.target.value)}
                      className="w-full bg-black text-white border border-white/10 px-3 py-2 text-xs outline-none focus:border-[#f97316]"
                    >
                      <option value="custom">-- CUSTOM / REGISTER NEW CLASSIFICATION --</option>
                      {uniqueMaterials.map(mat => (
                        <option key={mat.id} value={mat.name}>
                          [{mat.type}] {mat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedMaterialTemplate === 'custom' && (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wide text-zinc-500 font-bold block">Custom Material Section Name</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-black border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-[#f97316]"
                        placeholder="e.g. RHS 100x50x4.0mm x 6000mm length"
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-zinc-500 font-bold block">Industrial Type</label>
                      <select
                        value={mType}
                        onChange={e => setMType(e.target.value as any)}
                        className="w-full bg-black border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-[#f97316]"
                        disabled={selectedMaterialTemplate !== 'custom'}
                      >
                        <option value="RHS">RHS (Rectangular)</option>
                        <option value="SHS">SHS (Square)</option>
                        <option value="CHS">CHS (Circular / Tubes)</option>
                        <option value="Plate">Plate Sheet Steel</option>
                        <option value="H-Beam">H-Beam Girder</option>
                        <option value="Flat Bar">Flat Bar</option>
                        <option value="Other">Other Section</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-zinc-500 font-bold block">Steel Heat Grade</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-black border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-[#f97316]"
                        placeholder="e.g. Grade C350L0"
                        value={mGrade}
                        onChange={e => setMGrade(e.target.value)}
                        disabled={selectedMaterialTemplate !== 'custom'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-zinc-550 font-bold block">Section Size Details</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-black border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-[#f97316]"
                        placeholder="e.g. 100x50x4mm"
                        value={mDimensions}
                        onChange={e => setMDimensions(e.target.value)}
                        disabled={selectedMaterialTemplate !== 'custom'}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-zinc-550 font-bold block">Mill Vendor Supplier</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-black border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-[#f97316]"
                        placeholder="e.g. BlueScope Steel Ltd"
                        value={mSupplier}
                        onChange={e => setMSupplier(e.target.value)}
                        disabled={selectedMaterialTemplate !== 'custom'}
                      />
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase text-zinc-400 font-bold block">Lot Quantity Received</label>
                        <input
                          type="number"
                          min="1"
                          required
                          className="w-full bg-black border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-[#f97316]"
                          value={mQty}
                          onChange={e => setMQty(Number(e.target.value))}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase text-zinc-500 font-bold block">Delivery Unit</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-black border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-[#f97316]"
                          placeholder="Lengths / Sheets"
                          value={mUnit}
                          onChange={e => setMUnit(e.target.value)}
                          disabled={selectedMaterialTemplate !== 'custom'}
                        />
                      </div>
                    </div>

                    <div className="space-y-1 p-2 bg-neutral-900/50 border border-[#f97316]/20">
                      <label className="text-[10px] font-black uppercase text-[#f97316] block">Unique ID Mill Batch / Heat *</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-black border border-[#f97316]/50 px-3 py-2 text-sm text-[#f97316] outline-none font-bold text-center uppercase tracking-widest focus:border-orange-400"
                        placeholder="e.g. MILL-HEAT-3081"
                        value={mBatchNo}
                        onChange={e => setMBatchNo(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEnteringStock(false);
                      }}
                      className="px-4 py-2 border border-white/10 text-white bg-transparent text-[10px] font-bold uppercase tracking-wider rounded-none w-1/3 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#f97316] text-black text-[10px] font-black uppercase tracking-widest rounded-none w-2/3 cursor-pointer hover:bg-orange-400"
                    >
                      Receive Batch +
                    </button>
                  </div>
                </form>
              )
            ) : (
              <>
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-widest font-black text-white flex items-center gap-1.5">
                    <UserCheck size={14} className="text-[#f97316]" />
                    Step 1: Identify Active Operator
                  </h3>
                  
                  {/* High quality selection buttons */}
                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {allUsers.map((user) => {
                      const isSelected = selectedUser?.id === user.id;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => setSelectedUser(user)}
                          className={`p-3 text-left border relative transition-all rounded-none flex flex-col justify-between h-20 bg-transparent cursor-pointer ${
                            isSelected 
                              ? 'border-[#f97316] bg-amber-500/[0.03]' 
                              : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className={`w-6 h-6 text-[9px] font-bold flex items-center justify-center font-mono ${
                              isSelected ? 'bg-[#f97316] text-black' : 'bg-neutral-850 text-white'
                            }`}>
                              {user.avatar || user.name.split(' ').map(n => n[0]).join('')}
                            </span>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-ping"></span>
                            )}
                          </div>
                          <div className="mt-1.5 min-w-0">
                            <p className="text-[11px] font-black uppercase text-white truncate leading-none">{user.name}</p>
                            <p className="text-[9px] text-zinc-500 font-mono tracking-wide mt-1 uppercase">{user.role}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/5">
                  <label className="text-xs uppercase tracking-widest font-black text-white flex items-center gap-1.5">
                    <Bolt size={14} className="text-[#f97316]" />
                    Step 2: Assign Work Station Stage
                  </label>
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="w-full bg-black border border-white/10 p-3 text-xs text-white outline-none font-mono focus:border-[#f97316]"
                  >
                    {standardStages.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage === 'All Stages' ? 'ANY STATION (No Routing Limit)' : stage.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Status overview */}
                <div className="p-3 bg-black border border-white/5 flex justify-between items-center text-[10px] font-mono leading-none">
                  <div>
                    <span className="text-zinc-500 uppercase font-black block mb-1">Worker loadout</span>
                    <strong className="text-white text-[11px] font-sans">{selectedUser?.name || '—'}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[#fb923c] font-bold block mb-1">
                      {assignedCount} Tasks Assigned
                    </span>
                    <span className="text-zinc-500 text-[8px] uppercase">({inProgressCount} in progress)</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Column 2: Project Selection Console */}
          <div className="lg:col-span-1 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-xs uppercase tracking-widest font-black text-white flex items-center gap-1.5">
                  <ClipboardCheck size={14} className="text-[#f97316]" />
                  Step 3: Pick Traveler Job Run
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Redesigned shop floor run selection. Search or pick below:
                </p>
              </div>

              {/* Search projects block */}
              <div className="relative text-xs">
                <Search className="absolute left-2.5 top-2.5 text-zinc-500" size={13} />
                <input
                  type="text"
                  className="w-full bg-black border border-white/10 pl-8 pr-3 py-2 text-xs uppercase font-mono outline-none text-white focus:border-[#f97316]"
                  placeholder="FILTER RUN ID, BATCH OR CODE..."
                  value={projectSearch}
                  onChange={e => setProjectSearch(e.target.value)}
                />
              </div>

              {/* Interactive feed of redesigned project traveler cards */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {searchedProjects.map((proj) => {
                  const isSelected = selectedProjectId === proj.id;
                  
                  // Compute simple completions
                  let stepsTotal = 0;
                  let stepsDone = 0;
                  (proj.subProjects || []).forEach(sub => {
                    (sub.processes || []).forEach(p => {
                      stepsTotal++;
                      if (p && p.status === 'Completed') stepsDone++;
                    });
                  });
                  const completionPercentage = stepsTotal > 0 ? Math.round((stepsDone / stepsTotal) * 100) : 0;

                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        localStorage.setItem('operator_project_id', proj.id);
                      }}
                      className={`w-full p-3 text-left border transition-all rounded-none flex flex-col space-y-1.5 bg-[#0e0e0e]/55 relative overflow-hidden cursor-pointer ${
                        isSelected 
                          ? 'border-[#f97316] bg-amber-500/[0.02]' 
                          : 'border-white/5 hover:border-white/10 hover:bg-neutral-900/40'
                      }`}
                    >
                      {/* Technical ticket dashed top strip */}
                      <div className="flex justify-between items-center text-[8px] font-mono leading-none text-zinc-500 pb-1 border-b border-white/5">
                        <span className="font-bold">MEMBER RUN: {proj.id}</span>
                        <span className="text-[#fb923c] font-black uppercase">BATCH: {proj.batchNo}</span>
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-[11.5px] font-black uppercase text-white truncate max-w-[210px] leading-tight">
                          {proj.title}
                        </h4>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5 leading-none">
                          PO: {proj.jobCode || 'STANDARD'} • {proj.subProjects.length} Custom Parts
                        </p>
                      </div>

                      {/* Micro progress line */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[8px] text-zinc-400 font-mono">
                          <span>ROUTINGS STAMPED:</span>
                          <span className="font-bold text-white">{stepsDone}/{stepsTotal} ({completionPercentage}%)</span>
                        </div>
                        <div className="w-full bg-zinc-950 h-1 overflow-hidden">
                          <div 
                            className="bg-[#f97316] h-full transition-all duration-300" 
                            style={{ width: `${completionPercentage}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Selected corner triangle badge */}
                      {isSelected && (
                        <div className="absolute top-0 right-0 w-3 h-3 bg-[#f97316] rounded-bl-sm flex items-center justify-center">
                          <div className="w-1 h-1 bg-black rounded-full"></div>
                        </div>
                      )}
                    </button>
                  );
                })}

                {searchedProjects.length === 0 && (
                  <div className="text-center py-10 border border-dashed border-white/5 text-[10px] text-zinc-600 font-mono">
                    NO COMPLIANCE PROJECT RECORDS DETECTED FOR YOUR FILTER EXCELLENCE
                  </div>
                )}
              </div>

              {/* Visual mini specifications overview of selected project */}
              {activeProjectRun && (
                <div className="p-2.5 bg-black border border-white/5 text-[9px] font-mono text-zinc-400 space-y-1.5 animate-fadeIn">
                  <div className="flex justify-between">
                    <span>SELECTED MILestone:</span>
                    <strong className="text-white font-sans font-bold uppercase">{activeProjectRun.deadline}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>STATUS PHASE:</span>
                    <span className="text-orange-500 font-black uppercase">{activeProjectRun.status}</span>
                  </div>
                  <div className="flex justify-between hover:underline cursor-pointer" onClick={() => {
                    alert(`Job Traveler details for ${activeProjectRun.id}:\n\n- Title: ${activeProjectRun.title}\n- Client PO Code: ${activeProjectRun.jobCode}\n- Fabrication Components: ${activeProjectRun.subProjects.length} subprojects.\n- Weld Standard Grade: AS1554.1 certified.`);
                  }}>
                    <span>SPECS OVERVIEW:</span>
                    <span className="text-zinc-500 hover:text-white transition-colors">CLICK TO PREVIEW SPEC SHEET &rarr;</span>
                  </div>
                </div>
              )}

            </div>

            {/* Launch Inductions Launcher action bar */}
            <div className="pt-6 border-t border-white/5 flex gap-3 text-xs">
              <button
                onClick={() => {
                  if (!selectedUser) {
                    alert("Error: No operator selected. Please select an active worker before entering Manager mode.");
                    return;
                  }
                  if (selectedUser.role !== 'Admin' && selectedUser.role !== 'Production Manager') {
                    alert(`ACCESS DENIED:\n\nOnly Admin and Production Manager roles can access Manager Mode.\nCurrent role: ${selectedUser.role}`);
                    return;
                  }
                  setShowPinModal(true);
                  setPinInput('');
                  setPinError('');
                }}
                className="px-4 py-3 bg-[#111111] hover:bg-[#1c1c1c] text-white border border-white/10 text-[10px] font-bold uppercase tracking-widest transition-all w-2/5 text-center cursor-pointer"
              >
                Manager Mode
              </button>
              
              <button
                id="induct-operator-btn"
                onClick={() => onInduct(selectedUser, selectedStage, selectedProjectId || undefined)}
                className="px-5 py-3 bg-[#f97316] hover:bg-orange-400 text-black text-[10px] font-black uppercase tracking-widest transition-all w-3/5 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Launch Traveler Run
                <ChevronRight size={13} className="shrink-0" />
              </button>
            </div>
          </div>

          {/* PIN Access Modal for Manager Mode */}
          {showPinModal && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-[#0b0b0b] border border-orange-500/30 text-white relative shadow-[0_0_40px_rgba(249,115,22,0.1)]">
                <button
                  onClick={() => { setShowPinModal(false); setPinInput(''); setPinError(''); }}
                  className="absolute top-3 right-3 text-zinc-500 hover:text-orange-500 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>

                <div className="p-6 space-y-4">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/30 rounded-full flex items-center justify-center mx-auto">
                      <ShieldCheck size={24} className="text-orange-500" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Manager Mode Access</h3>
                    <p className="text-[10px] text-zinc-400 uppercase">
                      Authorized personnel only • PIN verification required
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">Security PIN Code</label>
                    <input
                      type="password"
                      autoComplete="off"
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        setPinError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handlePinSubmit();
                        }
                      }}
                      placeholder="••••"
                      maxLength={4}
                      className="w-full bg-black border border-white/10 p-3 text-center text-lg font-mono tracking-widest text-white outline-none focus:border-orange-500 uppercase"
                      autoFocus
                    />
                    {pinError && (
                      <p className="text-[9px] text-red-400 uppercase font-bold text-center">{pinError}</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handlePinSubmit}
                      disabled={!pinInput || pinInput.length !== 4}
                      className="w-full bg-orange-500 hover:bg-orange-400 text-black font-black uppercase tracking-widest py-3 text-[10px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Verify & Enter Manager Mode
                    </button>
                  </div>

                  <p className="text-[8px] text-zinc-600 uppercase text-center font-mono">
                    ISO 9001 Clause 8.5.2 • Operator Traceability Lock
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
