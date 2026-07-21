import React, { useState, useEffect } from 'react';
import { Project, Item, Material, User } from '../types';
import { 
  ShieldAlert, UserCheck, Plus, Check, RefreshCw, Milestone, 
  FileWarning, Search, Eye, FileText, Ban, Trash2, ArrowUpRight, CheckCircle2, CloudAlert
} from 'lucide-react';

interface ComplianceRegisterProps {
  project: Project;
  allItems: Item[];
  allMaterials: Material[];
  allUsers: User[];
  onUpdateProject: (updatedProject: Project) => void;
}

export interface WelderCertification {
  id: string;
  name: string;
  stampId: string;
  standard: string; // e.g. "AS/NZS 1554.1 Cat SP", "ASME IX Pressure Pipe", "ISO 9606 TIG"
  expiryDate: string;
  status: 'ACTIVE' | 'EXPIRED';
}

export interface NCRReport {
  id: string;
  subProjectBatch: string;
  partName: string;
  defectNotes: string;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL_AUDIT';
  correctiveAction: string;
  raisedBy: string;
  raisedDate: string;
  status: 'OPEN' | 'RESOLVED';
  resolvedBy?: string;
  resolvedDate?: string;
  
  // Material trace properties (ISO 9001 quality system requirements)
  materialId?: string;
  materialName?: string;
  materialBatch?: string;
  materialSupplier?: string;
  defectCategory?: 'GEOMETRIC_OUT_OF_TOLERANCE' | 'METALLURGICAL_LAMINATION' | 'WELDING_DEFECT_HYDROGEN' | 'COATING_GALVANIZING_DEFECT' | 'DOCUMENTATION_DISCREPANCY' | 'SUBCONTRACTOR_OUTSOURCE_FAILURE';
  disposition?: 'REWORK' | 'SCRAP' | 'CONCESSION_USE_AS_IS' | 'RETURN_TO_SUPPLIER';
  quarantineLocation?: string; 
  assignedWelderStamp?: string; 
  rootCause?: string;
}

export default function ComplianceRegister({ 
  project, 
  allItems, 
  allMaterials, 
  allUsers, 
  onUpdateProject 
}: ComplianceRegisterProps) {
  
  const [welders, setWelders] = useState<WelderCertification[]>([]);
  const [ncrs, setNcrs] = useState<NCRReport[]>([]);
  const [activeNcrTab, setActiveNcrTab] = useState<'REGISTER' | 'TRACE' | 'TAG_PREVIEW'>('REGISTER');
  const [selectedTagNcr, setSelectedTagNcr] = useState<NCRReport | null>(null);

  // Form states for creating a welder stamp entry
  const [showWelderForm, setShowWelderForm] = useState(false);
  const [newWelderName, setNewWelderName] = useState('');
  const [newWelderStamp, setNewWelderStamp] = useState('');
  const [newWelderStandard, setNewWelderStandard] = useState('AS/NZS 1554.1 Class SP');
  const [newWelderExpiry, setNewWelderExpiry] = useState('2028-12-31');

  // Form states for raising a Non-Conformance Report
  const [showNCRForm, setShowNCRForm] = useState(false);
  const [ncrPartRef, setNcrPartRef] = useState('');
  const [ncrDefect, setNcrDefect] = useState('');
  const [ncrSeverity, setNcrSeverity] = useState<'MINOR' | 'MAJOR' | 'CRITICAL_AUDIT'>('MINOR');
  const [ncrCAPA, setNcrCAPA] = useState('');
  const [ncrInspector, setNcrInspector] = useState('');
  
  // Advanced ISO 9001 Traceability Form states
  const [ncrMaterialId, setNcrMaterialId] = useState('');
  const [ncrDefectCategory, setNcrDefectCategory] = useState<'GEOMETRIC_OUT_OF_TOLERANCE' | 'METALLURGICAL_LAMINATION' | 'WELDING_DEFECT_HYDROGEN' | 'COATING_GALVANIZING_DEFECT' | 'DOCUMENTATION_DISCREPANCY' | 'SUBCONTRACTOR_OUTSOURCE_FAILURE'>('GEOMETRIC_OUT_OF_TOLERANCE');
  const [ncrDisposition, setNcrDisposition] = useState<'REWORK' | 'SCRAP' | 'CONCESSION_USE_AS_IS' | 'RETURN_TO_SUPPLIER'>('REWORK');
  const [ncrQuarantineLoc, setNcrQuarantineLoc] = useState('Quarantine Rack Q-B');
  const [ncrWelderStamp, setNcrWelderStamp] = useState('');
  const [ncrRootCause, setNcrRootCause] = useState('');

  // Initial Seed Lodging for Welder Certifications and NCR registers
  useEffect(() => {
    // Load Welders
    const cachedWelders = localStorage.getItem('iso_welder_certs');
    if (cachedWelders) {
      try {
        const parsed = JSON.parse(cachedWelders);
        if (Array.isArray(parsed)) {
          setWelders(parsed);
        } else {
          initializeDefaultWelders();
        }
      } catch {
        initializeDefaultWelders();
      }
    } else {
      initializeDefaultWelders();
    }

    // NCR storage
    const cachedNcrs = localStorage.getItem(`iso_ncrs_${project.id}`);
    if (cachedNcrs) {
      try {
        const parsed = JSON.parse(cachedNcrs);
        if (Array.isArray(parsed)) {
          setNcrs(parsed);
        } else {
          initializeDefaultNcrs();
        }
      } catch {
        initializeDefaultNcrs();
      }
    } else {
      initializeDefaultNcrs();
    }
  }, [project.id]);

  const initializeDefaultWelders = () => {
    const defaults: WelderCertification[] = [
      {
        id: 'W-01',
        name: 'David Vance',
        stampId: 'ST-DV-4412',
        standard: 'AS/NZS 1554.1 Class SP (Structural Heavy)',
        expiryDate: '2027-10-15',
        status: 'ACTIVE',
      },
      {
        id: 'W-02',
        name: 'Amelia Sterling',
        stampId: 'ST-AS-1029',
        standard: 'ASME Section IX (Pressure Vessel MIG/TIG)',
        expiryDate: '2028-04-30',
        status: 'ACTIVE',
      },
      {
        id: 'W-03',
        name: 'Markus Kowalski',
        stampId: 'ST-MK-3022',
        standard: 'ISO 9606-1 Structural Alloys (MMAW/GMAW)',
        expiryDate: '2026-02-12',
        status: 'EXPIRED',
      }
    ];
    setWelders(defaults);
    localStorage.setItem('iso_welder_certs', JSON.stringify(defaults));
  };

  const initializeDefaultNcrs = () => {
    if (project.id === 'PRJ-EXP-0001') {
      const defaults: NCRReport[] = [
        {
          id: 'NCR-2026-EXP01',
          subProjectBatch: 'SUB-EXP-001-A',
          partName: 'EXP-001 Security camera corner mount housing (Plexiglass Lens Shield)',
          defectNotes: 'Facilities inspection on behalf of Royal Brisbane Hospital Trust identified fine surface scratching and haze on the sand-polished outer corner of the plexiglass viewing lens, violating patient safety surveillance optical clarity thresholds (exceeding 2% haze tolerance).',
          severity: 'MINOR',
          correctiveAction: 'Quarantine and process the affected PMMA acrylic boards from Action Aluminium (Invoice #75239363). Perform micro-abrasive wet sanding using 1200, 1500, then 2000-grit silicon carbide paper. Finish with Novus Level-2 fine scratch remover compound followed by an isopropanol wash and anti-static anti-microbial cleanroom wipe. Final inspection with high-intensity LED lightbox transmissive grid scanning.',
          raisedBy: 'Amelia Sterling (Auditor Stamp #1029)',
          raisedDate: '2026-06-21',
          status: 'OPEN',
          materialId: 'MAT-ACT-0013',
          materialName: 'Optical PMMA Plexiglass Panel 4mm',
          materialBatch: 'ACT-75239363-EXP2',
          materialSupplier: 'Action Aluminium PMMA Division',
          defectCategory: 'GEOMETRIC_OUT_OF_TOLERANCE',
          disposition: 'REWORK',
          quarantineLocation: 'Yellow Tagged Quarantine Cage - Rework Bay A',
          assignedWelderStamp: 'ST-DV-4412',
          rootCause: 'Protective blue polyethylene paper shielding on Action Aluminium Plate sheets was removed prematurely prior to corner fillet TIG welding. Weld spatter and abrasive aluminum routing grit contaminated the PMMA lens plate.'
        }
      ];
      setNcrs(defaults);
      localStorage.setItem(`iso_ncrs_${project.id}`, JSON.stringify(defaults));
      return;
    }

    const firstSub = (project.subProjects || [])[0];
    const item = firstSub ? allItems.find(i => i.id === firstSub.itemId) : null;
    
    // Attempt to automatically link some material if available
    let seedMatId = '';
    let seedMatName = '';
    let seedMatBatch = '';
    let seedMatSupplier = '';

    if (project.includeStockItems && project.includeStockItems.length > 0) {
      const match = allMaterials.find(m => m.id === project.includeStockItems[0].materialId);
      if (match) {
        seedMatId = match.id;
        seedMatName = match.name;
        seedMatBatch = project.includeStockItems[0].batchNoUsed || match.batchNo;
        seedMatSupplier = match.supplier;
      }
    } else if (item && item.materials && item.materials.length > 0) {
      const match = allMaterials.find(m => m.id === item.materials[0].materialId);
      if (match) {
        seedMatId = match.id;
        seedMatName = match.name;
        seedMatBatch = match.batchNo;
        seedMatSupplier = match.supplier;
      }
    }

    if (!seedMatSupplier) {
      seedMatSupplier = 'Liberty Steel Australia';
    }
    const defaults: NCRReport[] = [
      {
        id: 'NCR-2026-003a',
        subProjectBatch: firstSub ? firstSub.batchNo : 'B-998',
        partName: item ? item.name : 'Steel Frame Spacer Chassis',
        defectNotes: 'Acoustic / Dye-penetrant ultrasonic weld scan identified serialized root-line slag inclusions near structural gusset weldments.',
        severity: 'MAJOR',
        correctiveAction: 'Mechanically gouge weld root flush using a carbide steel burr tool, pre-heat base structural material to 125°C, and complete dual-shield MIG welding pass adhering to AS1554.1 WPS-08 REV B.',
        raisedBy: 'Amelia Sterling (Auditor Stamp #1029)',
        raisedDate: new Date().toISOString().split('T')[0],
        status: 'OPEN',
        materialId: seedMatId || 'MAT-2026-0005',
        materialName: seedMatName || '350 Grade Steel Base Plate RHS',
        materialBatch: seedMatBatch || 'HEAT-9923412-X',
        materialSupplier: seedMatSupplier,
        defectCategory: 'WELDING_DEFECT_HYDROGEN',
        disposition: 'REWORK',
        quarantineLocation: 'Rework Bay 4 - Quarantine Yellow Tagged',
        assignedWelderStamp: 'ST-DV-4412',
        rootCause: 'Incorrect gas shielding flow level (dropping below 12 L/min) combined with heavy localized surface moisture during morning startup.'
      }
    ];
    setNcrs(defaults);
    localStorage.setItem(`iso_ncrs_${project.id}`, JSON.stringify(defaults));
  };

  const saveWeldersState = (updatedList: WelderCertification[]) => {
    setWelders(updatedList);
    localStorage.setItem('iso_welder_certs', JSON.stringify(updatedList));
  };

  const saveNCRsState = (updatedNCRs: NCRReport[]) => {
    setNcrs(updatedNCRs);
    localStorage.setItem(`iso_ncrs_${project.id}`, JSON.stringify(updatedNCRs));
  };

  const handleCreateWelder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWelderName.trim() || !newWelderStamp.trim()) return;

    const newCert: WelderCertification = {
      id: `W-${Math.floor(Math.random() * 1000 + 100)}`,
      name: newWelderName.trim(),
      stampId: newWelderStamp.trim().toUpperCase(),
      standard: newWelderStandard,
      expiryDate: newWelderExpiry,
      status: new Date(newWelderExpiry) > new Date() ? 'ACTIVE' : 'EXPIRED'
    };

    const list = [...welders, newCert];
    saveWeldersState(list);

    setNewWelderName('');
    setNewWelderStamp('');
    setShowWelderForm(false);
  };

  const handleCreateNCR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ncrDefect.trim()) return;

    const matchedSub = (project.subProjects || []).find(s => s.batchNo === ncrPartRef) || (project.subProjects || [])[0];
    const subItem = matchedSub ? allItems.find(i => i.id === matchedSub.itemId) : null;

    // Resolve material info for tracing
    const resolvedMaterial = allMaterials.find(m => m.id === ncrMaterialId);
    let traceMatId = ncrMaterialId;
    let traceMatName = resolvedMaterial ? resolvedMaterial.name : 'Unspecified material / Generic Steel';
    let traceMatBatch = 'HEAT-UNKNOWN';
    let traceMatSupplier = resolvedMaterial ? resolvedMaterial.supplier : 'Unresolved vendor';

    // Auto find batch code if project allocated it
    if (project.includeStockItems) {
      const allocation = project.includeStockItems.find(a => a.materialId === ncrMaterialId);
      if (allocation) {
        traceMatBatch = allocation.batchNoUsed;
      } else if (resolvedMaterial) {
        traceMatBatch = resolvedMaterial.batchNo;
      }
    } else if (resolvedMaterial) {
      traceMatBatch = resolvedMaterial.batchNo;
    }

    const newNcr: NCRReport = {
      id: `NCR-2026-${Math.floor(Math.random() * 900 + 100)}`,
      subProjectBatch: matchedSub ? matchedSub.batchNo : 'B-QUARANTINE',
      partName: subItem ? subItem.name : 'Structural Assembly',
      defectNotes: ncrDefect.trim(),
      severity: ncrSeverity,
      correctiveAction: ncrCAPA.trim(),
      raisedBy: ncrInspector || 'Lead Auditor Stamp #1029',
      raisedDate: new Date().toISOString().split('T')[0],
      status: 'OPEN',
      materialId: traceMatId,
      materialName: traceMatName,
      materialBatch: traceMatBatch,
      materialSupplier: traceMatSupplier,
      defectCategory: ncrDefectCategory,
      disposition: ncrDisposition,
      quarantineLocation: ncrQuarantineLoc,
      assignedWelderStamp: ncrDisposition === 'REWORK' ? ncrWelderStamp : undefined,
      rootCause: ncrRootCause.trim() || 'Undetermined (Under investigations)'
    };

    const list = [...ncrs, newNcr];
    saveNCRsState(list);

    // Reset Form
    setNcrDefect('');
    setNcrCAPA('');
    setNcrRootCause('');
    setShowNCRForm(false);
  };

  const handleResolveNCR = (id: string, reviewerName: string) => {
    const list = ncrs.map(n => {
      if (n.id === id) {
        return {
          ...n,
          status: 'RESOLVED' as const,
          resolvedBy: reviewerName,
          resolvedDate: new Date().toISOString().split('T')[0]
        };
      }
      return n;
    });
    saveNCRsState(list);
  };

  const handleDeleteNCR = (id: string) => {
    if (confirm('Delete this quality record? ISO 9001 requires keeping audit trails of deleted items.')) {
      const list = ncrs.filter(n => n.id !== id);
      saveNCRsState(list);
      if (selectedTagNcr?.id === id) {
        setSelectedTagNcr(null);
      }
    }
  };

  // Helper properties to check material allocations inside this project
  const allocatedItemsCount = project?.includeStockItems ? project.includeStockItems.length : 0;
  
  // Calculate verified Mill Certs ratio
  let certsVerified = 0;
  let totalCertsChecked = 0;
  const projectMaterialsFlat: { id: string; name: string; batch: string; supplier: string; hasCert: boolean; certUrl?: string }[] = [];

  // Match Direct Allocations
  if (project?.includeStockItems) {
    project.includeStockItems.forEach(alloc => {
      const mat = (allMaterials || []).find(m => m?.id === alloc?.materialId);
      if (mat) {
        totalCertsChecked++;
        if (mat.materialCertUrl) certsVerified++;
        projectMaterialsFlat.push({
          id: mat.id,
          name: mat.name,
          batch: alloc.batchNoUsed || mat.batchNo,
          supplier: mat.supplier,
          hasCert: !!mat.materialCertUrl,
          certUrl: mat.materialCertUrl
        });
      }
    });
  }

  // Staggered validation status
  const heatCertScore = totalCertsChecked > 0 ? Math.round((certsVerified / totalCertsChecked) * 100) : 100;
  
  // Welding audit check
  const hasExpiredWeldersUsed = (welders || []).some(w => w?.status === 'EXPIRED');

  // Selected Welder Expiry Warning
  const selectedWelderObj = (welders || []).find(w => w?.stampId === ncrWelderStamp);
  const isSelectedWelderExpired = selectedWelderObj?.status === 'EXPIRED';

  return (
    <div className="space-y-6">
      
      {/* ISO 9001 METRICS SUMMARY PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="p-4 bg-black border border-white/5 space-y-1">
          <div className="text-[10px] uppercase font-mono tracking-widest text-gray-500">MTR (Mill Certificate) Tracking</div>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold font-mono text-white">{heatCertScore}%</span>
            <span className="text-xs font-mono text-gray-400">({certsVerified}/{totalCertsChecked})</span>
          </div>
          <div className="w-full bg-white/5 h-1 mt-2">
            <div 
              className="bg-green-500 h-1 transition-all duration-300" 
              style={{ width: `${heatCertScore}%` }}
            />
          </div>
          <p className="text-[9px] text-gray-400 font-mono mt-1 pt-1 border-t border-white/5">
            ISO Clause 8.4: Heat Certificate trace coverage.
          </p>
        </div>

        <div className="p-4 bg-black border border-white/5 space-y-1">
          <div className="text-[10px] uppercase font-mono tracking-widest text-gray-500">Active NCR Violations</div>
          <div className="flex justify-between items-baseline">
            <span className={`text-2xl font-bold font-mono ${ncrs.filter(n => n.status === 'OPEN').length > 0 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
              {ncrs.filter(n => n.status === 'OPEN').length}
            </span>
            <span className="text-xs font-mono text-gray-400">
              {ncrs.filter(n => n.status === 'RESOLVED').length} Closed
            </span>
          </div>
          <div className="w-full bg-white/5 h-1 mt-2">
            <div 
              className={`h-1 transition-all duration-300 ${ncrs.filter(n => n.status === 'OPEN').some(n => n.severity === 'CRITICAL_AUDIT') ? 'bg-red-600' : 'bg-red-400'}`}
              style={{ width: `${ncrs.length > 0 ? (ncrs.filter(n => n.status === 'OPEN').length / ncrs.length) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[9px] text-gray-400 font-mono mt-1 pt-1 border-t border-white/5">
            ISO Clause 10.2 Non-Conformance corrective logs.
          </p>
        </div>

        <div className="p-4 bg-black border border-white/5 space-y-1">
          <div className="text-[10px] uppercase font-mono tracking-widest text-gray-500">Welder Stamps Audited</div>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold font-mono text-white">
              {welders.filter(w => w.status === 'ACTIVE').length} / {welders.length}
            </span>
            <span className={`text-[10px] px-1 font-mono uppercase bg-white/5 border ${hasExpiredWeldersUsed ? 'text-red-500 border-red-500/20' : 'text-green-500 border-green-500/20'}`}>
              {hasExpiredWeldersUsed ? 'Audit Alert' : 'Active'}
            </span>
          </div>
          <div className="w-full bg-white/5 h-1 mt-2">
            <div 
              className={`h-1 transition-all duration-300 ${hasExpiredWeldersUsed ? 'bg-orange-500' : 'bg-green-500'}`} 
              style={{ width: `${welders.length > 0 ? (welders.filter(w => w.status === 'ACTIVE').length / welders.length) * 100 : 100}%` }}
            />
          </div>
          <p className="text-[9px] text-gray-400 font-mono mt-1 pt-1 border-t border-white/5">
            Personnel competency stamps verification (AS1554).
          </p>
        </div>

        <div className="p-4 bg-black border border-white/5 space-y-1">
          <div className="text-[10px] uppercase font-mono tracking-widest text-gray-500">Manufacturing Quality Rating</div>
          <div className="flex justify-between items-baseline">
            {ncrs.filter(n => n.status === 'OPEN').length === 0 ? (
              <span className="text-2xl font-bold font-mono text-green-500">AAA COMPLIANT</span>
            ) : ncrs.filter(n => n.status === 'OPEN').some(n => n.severity === 'CRITICAL_AUDIT') ? (
              <span className="text-2xl font-bold font-mono text-red-500">AUDIT HOLD</span>
            ) : (
              <span className="text-2xl font-bold font-mono text-yellow-500">MINOR HOLD</span>
            )}
          </div>
          <div className="text-[9px] text-gray-400 mt-2 font-mono">
            {ncrs.filter(n => n.status === 'OPEN').length > 0 ? (
              <span className="text-red-400">Resolve open NCRs before generating compliance certificates.</span>
            ) : (
              <span className="text-green-400">All materials and welding processes pass structural checks.</span>
            )}
          </div>
        </div>

      </div>

      {/* SECTION TABS */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setActiveNcrTab('REGISTER')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeNcrTab === 'REGISTER' 
              ? 'border-red-500 text-red-500 bg-white/5' 
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          NCR Deviations Register ({ncrs.length})
        </button>
        <button
          onClick={() => setActiveNcrTab('TRACE')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeNcrTab === 'TRACE' 
              ? 'border-blue-500 text-blue-500 bg-white/5' 
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          ISO 9001 Material Traceability List
        </button>
        <button
          onClick={() => {
            if (ncrs.length > 0 && !selectedTagNcr) {
              setSelectedTagNcr(ncrs[0]);
            }
            setActiveNcrTab('TAG_PREVIEW');
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeNcrTab === 'TAG_PREVIEW' 
              ? 'border-yellow-500 text-yellow-500 bg-white/5' 
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Quarantine Tag & MTR Draft
        </button>
      </div>

      {/* RENDER TAB 1: NCR REGISTER */}
      {activeNcrTab === 'REGISTER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: NCR Log (8 columns) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 bg-black border border-white/5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h4 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <FileWarning size={16} className="text-red-500" />
                  ISO Clause 10.2: Defect Non-Conformance Log
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const firstSub = (project.subProjects || [])[0];
                    if (firstSub) {
                      setNcrPartRef(firstSub.batchNo);
                    }
                    // Auto select first material associated with first subProject
                    const item = firstSub ? allItems.find(i => i.id === firstSub.itemId) : null;
                    if (item && item.materials && item.materials.length > 0) {
                      setNcrMaterialId(item.materials[0].materialId);
                    } else if (project.includeStockItems && project.includeStockItems.length > 0) {
                      setNcrMaterialId(project.includeStockItems[0].materialId);
                    }
                    setShowNCRForm(!showNCRForm);
                  }}
                  className="bg-red-950/40 hover:bg-red-900/40 text-red-500 hover:text-red-400 border border-red-900/50 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 transition-colors"
                >
                  + Raise formal NCR
                </button>
              </div>

              <p className="text-xs text-gray-400">
                To fulfill ISO 9001 safety-critical compliance, raise a Non-Conformance Report (NCR) for material lamination faults, weld cracking, dimensional deviations, or missing certificates. All material-linked NCRs must be dispositioned and resolved before shipping.
              </p>

              {/* Advanced NCR Form */}
              {showNCRForm && (
                <form onSubmit={handleCreateNCR} className="bg-[#0e0e0e] p-5 border border-red-500/30 space-y-4">
                  <div className="font-bold text-xs uppercase tracking-widest text-red-500 border-b border-white/5 pb-1 flex items-center gap-1.5">
                    <CloudAlert size={14} /> Log Deviation Incident Form (ISO 9001 Compliant)
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-mono">1. Defective Assembly / Part Batch</label>
                      <select
                        value={ncrPartRef}
                        onChange={e => {
                          setNcrPartRef(e.target.value);
                          // Auto find the material requirements for that part
                          const sub = (project.subProjects || []).find(s => s.batchNo === e.target.value);
                          const itm = sub ? allItems.find(i => i.id === sub.itemId) : null;
                          if (itm && itm.materials && itm.materials.length > 0) {
                            setNcrMaterialId(itm.materials[0].materialId);
                          }
                        }}
                        className="w-full bg-black border border-white/10 p-2 text-white outline-none select-none"
                      >
                        {(project.subProjects || []).map(s => {
                          const item = allItems.find(i => i.id === s.itemId);
                          return (
                            <option key={s.batchNo} value={s.batchNo}>
                              {item ? item.name : 'Unknown'} (Batch: {s.batchNo})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-mono font-sans">2. Linked Material Component</label>
                      <select
                        value={ncrMaterialId}
                        onChange={e => setNcrMaterialId(e.target.value)}
                        className="w-full bg-black border border-white/10 p-2 text-white outline-none"
                      >
                        <option value="">-- Choose Material linked to Part --</option>
                        {allMaterials.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.dimensions}) &mdash; Batch: {m.batchNo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {ncrMaterialId && (
                    <div className="text-[10px] p-3 bg-blue-950/20 border border-blue-900/30 font-mono text-gray-300 space-y-1.5">
                      <div className="text-blue-400 font-bold uppercase text-[9px] tracking-wider">Traced Material Audit Preview:</div>
                      {(() => {
                        const m = allMaterials.find(x => x.id === ncrMaterialId);
                        if (!m) return <span>Material record not found in system.</span>;
                        const specBatch = project.includeStockItems?.find(a => a.materialId === m.id)?.batchNoUsed || m.batchNo;
                        return (
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div><strong>Name:</strong> {m.name}</div>
                            <div><strong>Mill Heat/Batch:</strong> {specBatch}</div>
                            <div><strong>Supplier:</strong> {m.supplier || 'N/A'}</div>
                            <div><strong>MTR Mill Certificate:</strong> {m.materialCertUrl ? <span className="text-green-400">Verified ✓</span> : <span className="text-red-400 font-bold">MISSING! ✕</span>}</div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-mono">3. Defect Category group</label>
                      <select
                        value={ncrDefectCategory}
                        onChange={e => setNcrDefectCategory(e.target.value as any)}
                        className="w-full bg-black border border-white/10 p-2 text-white outline-none"
                      >
                        <option value="GEOMETRIC_OUT_OF_TOLERANCE">Dimensional / Geometric Offset (Above tolerance)</option>
                        <option value="METALLURGICAL_LAMINATION">Metallurgical Lamination / Base Metal Flaw</option>
                        <option value="WELDING_DEFECT_HYDROGEN">Welding Slag / Hydrogen Cracking / Porosity</option>
                        <option value="COATING_GALVANIZING_DEFECT">Surface / Coating Thickness Failure (Zinc/Epoxy)</option>
                        <option value="DOCUMENTATION_DISCREPANCY">Documentation Discrepancy (Missing Heat Stamp/MTR)</option>
                        <option value="SUBCONTRACTOR_OUTSOURCE_FAILURE">Outsourced Laser/Bending processing failure</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-mono">4. Incident Discovered Severity</label>
                      <select
                        value={ncrSeverity}
                        onChange={e => setNcrSeverity(e.target.value as any)}
                        className="w-full bg-black border border-white/10 p-2 text-white outline-none"
                      >
                        <option value="MINOR">Minor Deviation (Rework using qualified standard)</option>
                        <option value="MAJOR">Major Fault (Scrap & Replace base steel)</option>
                        <option value="CRITICAL_AUDIT">Critical Audit Hazard (Total Quarantine block)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-mono">5. Primary Disposition Plan</label>
                      <select
                        value={ncrDisposition}
                        onChange={e => setNcrDisposition(e.target.value as any)}
                        className="w-full bg-black border border-white/10 p-2 text-white outline-none"
                      >
                        <option value="REWORK">Rework base Material to drawing specifications</option>
                        <option value="SCRAP">Scrap Part & Re-allocate new verified raw stock</option>
                        <option value="CONCESSION_USE_AS_IS">Accept As-Is (Requires Client concession permit)</option>
                        <option value="RETURN_TO_SUPPLIER">Quarantine incoming stock and return to supplier</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-mono">6. Quarantine Physical Area</label>
                      <input
                        type="text"
                        required
                        value={ncrQuarantineLoc}
                        onChange={e => setNcrQuarantineLoc(e.target.value)}
                        className="w-full bg-black border border-white/10 p-2 text-white outline-none"
                        placeholder="e.g. Yellow Quarantine Area Cage B"
                      />
                    </div>
                  </div>

                  {ncrDisposition === 'REWORK' && (
                    <div className="space-y-1 text-xs">
                      <label className="text-[10px] text-[brand-orange-400] font-bold uppercase tracking-widest block font-mono">
                        7. Assigned Welder Rework Stamp
                      </label>
                      <select
                        value={ncrWelderStamp}
                        onChange={e => setNcrWelderStamp(e.target.value)}
                        className={`w-full bg-black border p-2 text-white outline-none ${
                          isSelectedWelderExpired ? 'border-red-500' : 'border-white/10'
                        }`}
                        required
                      >
                        <option value="">-- Assign Qualified Welder for repair --</option>
                        {welders.map(wd => (
                          <option key={wd.id} value={wd.stampId}>
                            {wd.name} (Stamp: {wd.stampId}) &mdash; {wd.status === 'EXPIRED' ? 'EXPIRED TICKET!!' : 'Active AS1554'}
                          </option>
                        ))}
                      </select>
                      {isSelectedWelderExpired && (
                        <p className="text-[10px] text-red-500 font-mono animate-pulse mt-1">
                          ⚠️ CRITICAL ALERT (ISO Clause 7.2): Welder ticket has expired! Assigning an unqualified technician will cause an Audit Failure. Please select an active stamp or renew the ticket.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-mono">8. Root Cause Analysis (ISO 9001:2015 Clause 10.2.1a)</label>
                    <textarea
                      rows={2}
                      required
                      value={ncrRootCause}
                      onChange={e => setNcrRootCause(e.target.value)}
                      className="w-full bg-black border border-white/10 p-2 text-white outline-none focus:border-red-500"
                      placeholder="e.g. Laser cut parameters were set to 12m plate profiles instead of 10mm, resulting in slag and rough fusion edge profile."
                    />
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-mono">9. Defect Deviation Details & Observations</label>
                    <textarea
                      rows={2}
                      required
                      value={ncrDefect}
                      onChange={e => setNcrDefect(e.target.value)}
                      className="w-full bg-black border border-white/10 p-2 text-white outline-none focus:border-red-500"
                      placeholder="Describe failure dimensions or metallurgical problems detected during quality check."
                    />
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-mono">10. Immediate Corrective & Containment Action (CAPA)</label>
                    <textarea
                      rows={2}
                      required
                      value={ncrCAPA}
                      onChange={e => setNcrCAPA(e.target.value)}
                      className="w-full bg-black border border-white/10 p-2 text-white outline-none focus:border-red-500"
                      placeholder="Specify quarantine and scrap actions, grinding, weld passes, and safety validation."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-mono font-sans">Authorized Inspector / Quality Auditor signature</label>
                      <input
                        type="text"
                        required
                        value={ncrInspector}
                        onChange={e => setNcrInspector(e.target.value)}
                        className="w-full bg-black border border-white/10 p-2 text-white outline-none"
                        placeholder="Amelia Sterling (Quality Supervisor)"
                      />
                    </div>
                    <div className="flex justify-end gap-2 items-end">
                      <button
                        type="button"
                        onClick={() => setShowNCRForm(false)}
                        className="bg-black hover:bg-white/5 border border-white/10 text-xs px-4 py-2 hover:text-white"
                      >
                        Ignore
                      </button>
                      <button
                        type="submit"
                        disabled={isSelectedWelderExpired}
                        className="bg-red-950/80 hover:bg-red-900/60 border border-red-500/30 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Log formal NCR report
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* List of NCR Reports */}
              <div className="space-y-4">
                {ncrs.length > 0 ? (
                  ncrs.map((n) => {
                    const getBadge = (sev: typeof n.severity) => {
                      switch (sev) {
                        case 'CRITICAL_AUDIT':
                          return 'bg-red-600/10 border border-red-500 text-red-500';
                        case 'MAJOR':
                          return 'bg-orange-500/10 border border-orange-500 text-amber-500';
                        default:
                          return 'bg-yellow-500/10 border border-yellow-500/50 text-yellow-400';
                      }
                    };
                    return (
                      <div key={n.id} className={`p-5 bg-black border ${n.status === 'OPEN' ? 'border-red-900/40' : 'border-white/5'} space-y-4`}>
                        <div className="flex justify-between items-start gap-2 border-b border-white/5 pb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold uppercase bg-white/5 text-gray-400 border border-white/10 px-2 py-0.5">
                                {n.id}
                              </span>
                              <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 border ${
                                n.status === 'OPEN' ? 'border-red-500/30 text-red-400 bg-red-500/5' : 'border-green-500/40 text-green-400 bg-green-500/5'
                              }`}>
                                {n.status}
                              </span>
                            </div>
                            <h5 className="text-sm font-bold text-white mt-1 uppercase tracking-wider">
                              Assembly: {n.partName} <span className="text-gray-500 font-mono text-xs">({n.subProjectBatch})</span>
                            </h5>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 font-mono ${getBadge(n.severity)}`}>
                              {n.severity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteNCR(n.id)}
                              className="text-gray-600 hover:text-red-400 transition-colors"
                              title="Delete quality record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Material Info Block */}
                        {n.materialId && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-white/[0.02] border border-white/5 text-[11px] font-mono text-gray-300">
                            <div>
                              <strong className="text-gray-400 block text-[9px] uppercase font-sans tracking-wide">Traced Material ID:</strong>
                              <span>{n.materialName} ({n.materialId})</span>
                            </div>
                            <div>
                              <strong className="text-gray-400 block text-[9px] uppercase font-sans tracking-wide">Mill Heat / Batch Trace:</strong>
                              <span className="text-blue-400 font-bold">{n.materialBatch || 'Pending Heat Verify'}</span>
                            </div>
                            <div>
                              <strong className="text-gray-400 block text-[9px] uppercase font-sans tracking-wide">Supplier Code / Vendor:</strong>
                              <span>{n.materialSupplier || 'Unlisted supplier'}</span>
                            </div>
                            <div>
                              <strong className="text-gray-400 block text-[9px] uppercase font-sans tracking-wide font-sans">Physical Quarantine Location:</strong>
                              <span className="text-yellow-500 font-bold">{n.quarantineLocation || 'Rework floor'}</span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="text-xs text-gray-300 bg-red-950/5 border-l border-red-500/40 p-3 font-mono space-y-1">
                            <strong className="text-red-400 block text-[10px] uppercase font-sans">10.2.1 Deviation Details:</strong>
                            <p>{n.defectNotes}</p>
                            {n.rootCause && (
                              <div className="pt-2 border-t border-white/5 mt-1 text-[11px] text-gray-400">
                                <strong className="text-gray-400 block uppercase font-sans text-[9px]">Confirmed Root Cause:</strong>
                                    {n.rootCause}
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-gray-300 bg-green-950/5 border-l border-green-500/40 p-3 font-mono space-y-1">
                            <strong className="text-green-400 block text-[10px] uppercase font-sans">CAPA Actions & Disposition:</strong>
                            <p>{n.correctiveAction}</p>
                            {n.assignedWelderStamp && (
                              <div className="pt-2 border-t border-white/5 mt-1 text-[11px] text-gray-400">
                                <strong className="text-brand-orange-400 block uppercase font-sans text-[9px]">Assigned Welder Rework Ticket:</strong>
                                Stamp: {n.assignedWelderStamp} (AS1554.1 Code Compliance)
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-between items-center text-[10px] text-gray-500 font-mono pt-2 border-t border-white/5">
                          <span>Raised under ISO 9001 Audit by: <strong className="text-gray-300">{n.raisedBy}</strong> on {n.raisedDate}</span>
                          
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTagNcr(n);
                                setActiveNcrTab('TAG_PREVIEW');
                              }}
                              className="text-yellow-400 hover:text-yellow-300 underline text-[10px] font-bold uppercase cursor-pointer"
                            >
                              Show Yellow Tag
                            </button>
                            
                            {n.status === 'OPEN' ? (
                              <button
                                type="button"
                                onClick={() => handleResolveNCR(n.id, 'Inspector Amelia Stamp #1029')}
                                className="bg-green-950/40 hover:bg-green-900/30 text-green-400 hover:text-green-300 border border-green-900/50 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1.5 transition-colors flex items-center gap-1"
                              >
                                <Check size={11} /> Close & Seal corrective Action
                              </button>
                            ) : (
                              <span className="text-green-500 bg-green-500/10 px-2.5 py-1.5 border border-green-500/20 uppercase font-bold tracking-widest text-[9px]">
                                ✓ CLOSED by {n.resolvedBy} &mdash; {n.resolvedDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-gray-500 text-xs font-serif italic border border-white/5 bg-white/[0.01]">
                    Clean Quality Assurance Record. No metallurgical or geometrical deviations logged for this project.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Welder Certification Registry (4 columns) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 bg-black border border-white/5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h4 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert size={16} className="text-yellow-500" />
                  Qualified Welders registry
                </h4>
                <button
                  type="button"
                  onClick={() => setShowWelderForm(!showWelderForm)}
                  className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300 border border-yellow-500/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 transition-colors"
                >
                  + Register Stamp
                </button>
              </div>

              <p className="text-xs text-gray-400">
                ISO 9001:2015 Clause 7.2 requires all safety-critical structural fabrication welds to be completed ONLY by technicians holding active, independent-assessed test certificates (ASME Sec IX or AS1554.1).
              </p>

              {/* Add Welder Stamp Form */}
              {showWelderForm && (
                <form onSubmit={handleCreateWelder} className="bg-[#0e0e0e] p-4 border border-yellow-500/20 space-y-3 text-xs">
                  <div className="font-bold text-xs uppercase tracking-wider text-yellow-400 mb-1">Register Qualified Welder Ticket</div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-mono">Welder / Technician Name</label>
                    <input
                      type="text"
                      required
                      value={newWelderName}
                      onChange={e => setNewWelderName(e.target.value)}
                      className="w-full bg-black border border-white/10 p-2 text-white outline-none"
                      placeholder="David Vance"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1 font-mono">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest block">Qual Stamp Code</label>
                      <input
                        type="text"
                        required
                        value={newWelderStamp}
                        onChange={e => setNewWelderStamp(e.target.value)}
                        className="w-full bg-black border border-white/10 p-2 text-white uppercase outline-none"
                        placeholder="ST-DV-4412"
                      />
                    </div>
                    <div className="space-y-1 font-mono">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest block">Ticket Expiry</label>
                      <input
                        type="date"
                        required
                        value={newWelderExpiry}
                        onChange={e => setNewWelderExpiry(e.target.value)}
                        className="w-full bg-black border border-white/10 p-2 text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-mono">Technical Welding Code Standard</label>
                    <input
                      type="text"
                      required
                      value={newWelderStandard}
                      onChange={e => setNewWelderStandard(e.target.value)}
                      className="w-full bg-black border border-white/10 p-2 text-white outline-none"
                      placeholder="e.g., AS1554.1 Structural Cat SP Plate"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowWelderForm(false)}
                      className="bg-black border border-white/10 text-xs px-3 py-1.5 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-yellow-500 text-black text-xs font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-yellow-400"
                    >
                      Save Stamp Record
                    </button>
                  </div>
                </form>
              )}

              {/* Welders Stamp List */}
              <div className="space-y-3">
                {welders.map((w) => (
                  <div key={w.id} className="p-3 bg-[#080808] border border-white/5 flex justify-between items-center text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-bold bg-yellow-500/10 text-yellow-400 px-2 py-0.5 border border-yellow-500/20">
                          {w.stampId}
                        </span>
                        <strong className="text-white text-xs font-bold">{w.name}</strong>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono uppercase">{w.standard}</div>
                      <div className="text-[9px] text-gray-500 font-mono block">Expires: {w.expiryDate}</div>
                    </div>

                    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 border ${
                      w.status === 'ACTIVE' 
                        ? 'border-green-500/40 text-green-400 bg-green-500/5' 
                        : 'border-red-500/40 text-red-500 bg-red-500/5'
                    }`}>
                      {w.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={initializeDefaultWelders}
                  className="text-gray-500 hover:text-white text-[9px] font-mono uppercase tracking-[0.2em] flex items-center gap-1"
                >
                  <RefreshCw size={10} /> Reset Welder Stamps Catalog
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* RENDER TAB 2: MATERIAL TRACEABILITY TREE */}
      {activeNcrTab === 'TRACE' && (
        <div className="bg-black border border-white/5 p-6 space-y-6">
          <div>
            <h4 className="font-serif text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              ISO 9001:2015 Clause 8.5.2 Material Identification & Traceability Log
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              Active physical tracing of raw steel materials back to mill warehouse certificates. Click on Certificate links to audit verified Mill Test Reports (MTR).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-500 uppercase tracking-widest text-[9px] font-mono">
                  <th className="py-3 px-4">Material ID</th>
                  <th className="py-3 px-4">Material Name & Dimensions</th>
                  <th className="py-3 px-4">Supplier / Warehouse</th>
                  <th className="py-3 px-4">Mill Heat / Batch Code</th>
                  <th className="py-3 px-4 text-center">Audit Mill Cert (MTR)</th>
                  <th className="py-3 px-4 text-right">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {projectMaterialsFlat.length > 0 ? (
                  projectMaterialsFlat.map((m, idx) => (
                    <tr key={`${m.id}-${idx}`} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono font-bold text-gray-400">{m.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{m.name}</div>
                        {allMaterials.find(x => x.id === m.id)?.dimensions && (
                          <span className="text-[10px] text-gray-500 font-mono">
                            Spec: {allMaterials.find(x => x.id === m.id)?.dimensions}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-300">{m.supplier || 'BHP Steel Logistics'}</td>
                      <td className="py-3 px-4 font-mono text-blue-400 font-bold">{m.batch}</td>
                      <td className="py-3 px-4 text-center">
                        {m.hasCert && m.certUrl ? (
                          <a
                            href={m.certUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                            className="inline-flex items-center gap-1 text-[10px] bg-blue-950/40 hover:bg-blue-900/30 text-blue-400 hover:text-blue-300 border border-blue-950 px-2 py-1 uppercase font-mono font-bold tracking-widest"
                          >
                            <FileText size={11} /> Open MTR Link <ArrowUpRight size={10} />
                          </a>
                        ) : (
                          <span className="inline-block text-[9px] uppercase font-mono tracking-widest text-red-500 bg-red-600/10 px-2.5 py-1 border border-red-500/20">
                            Missing MTR
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {m.hasCert ? (
                          <span className="text-xs text-green-400 bg-green-500/10 px-2.5 py-1 font-mono uppercase font-bold tracking-widest border border-green-500/20">
                            Approved ✓
                          </span>
                        ) : (
                          <span className="text-xs text-red-400 bg-red-600/10 px-2.5 py-1 font-mono uppercase font-bold tracking-widest border border-red-500/20 animate-pulse">
                            Pending Audit Hold ✕
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 font-serif italic text-xs">
                      No materials currently allocated. Set up allocations in the "Allocations / Materials" tab to track warehouse batches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 text-xs text-gray-300 space-y-2">
            <strong className="text-yellow-400 flex items-center gap-1.5 uppercase tracking-wide">
              <ShieldAlert size={14} /> ISO 9051 Compliance Audits Note:
            </strong>
            <p>
              Under structural steel fabrication procedures, every member must have steel heat codes punched or tagged. Material test reports (MTR) represent certificates proving alloy composition chemistry and mechanical properties (Yield, Tensile Strength). Fabricating with uncertified batches compromises structure certifications.
            </p>
          </div>
        </div>
      )}

      {/* RENDER TAB 3: QUARANTINE TAG & DRAFT */}
      {activeNcrTab === 'TAG_PREVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: Select standard logged NCR to view Tag */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 bg-black border border-white/5 space-y-3">
              <h5 className="font-serif text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-wider">
                Select NCR for Yellow Quarantine Tag
              </h5>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {ncrs.map(n => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedTagNcr(n)}
                    className={`w-full text-left p-3 text-xs flex justify-between items-center transition-colors border ${
                      selectedTagNcr?.id === n.id 
                        ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400' 
                        : 'bg-white/[0.01] border-white/5 text-gray-400 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-[10px] font-bold">{n.id}</div>
                      <div className="truncate font-bold text-white max-w-[180px]">{n.partName}</div>
                      <div className="text-[10px] text-gray-500 font-mono">Heat: {n.materialBatch || 'No Heat Code'}</div>
                    </div>
                    <span className="text-[9px] uppercase font-mono tracking-widest bg-white/5 px-1.5 py-0.5 border border-white/10">
                      {n.severity}
                    </span>
                  </button>
                ))}
                
                {ncrs.length === 0 && (
                  <div className="text-center py-4 text-xs text-gray-500 italic">
                    No NCR log entries available. Raise an NCR first.
                  </div>
                )}
              </div>
            </div>
            
            {/* INSTRUCTION */}
            <div className="p-4 bg-black border border-white/5 text-xs text-gray-400 space-y-2">
              <strong className="text-white block uppercase tracking-wide">Quarantine Directive:</strong>
              <p>
                ISO Clause 8.7 Control of Nonconforming Outputs mandates that nonconforming parts are physically identified and quarantined to prevent inadvertent use. Pin this tag physically to the quarantined parts.
              </p>
            </div>
          </div>

          {/* RIGHT: Industrial Tag Sheet (8 columns) */}
          <div className="lg:col-span-8">
            {selectedTagNcr ? (
              <div className="space-y-6">
                
                {/* CAUTION Hazard Styled Yellow Tag Layout */}
                <div className="p-1 bg-[#fcd34d] text-black border-2 border-black relative overflow-hidden select-none">
                  
                  {/* Warning Striped Headers */}
                  <div className="flex h-4 w-full bg-black">
                    <div className="w-full bg-repeating-hazard h-full"></div>
                  </div>

                  <div className="p-6 bg-yellow-400 space-y-6">
                    
                    {/* grommet hole */}
                    <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-black rounded-full flex items-center justify-center border-2 border-yellow-400 shadow-md">
                      <div className="w-2 h-2 bg-[#fcd34d] rounded-full"></div>
                    </div>

                    <div className="text-center pt-8">
                      <div className="bg-black text-yellow-400 font-mono font-bold text-xs uppercase tracking-[0.25em] inline-block px-4 py-1.5 rounded">
                        QUARANTINE HAZARD TAG
                      </div>
                      <h3 className="text-3xl font-extrabold font-serif text-black tracking-tight uppercase mt-2">
                        DO NOT FABRICATE
                      </h3>
                      <p className="text-[10px] font-mono font-bold uppercase tracking-widest mt-1 text-black/80">
                        NON-CONFORMANCE DETECTED VIA ISO-9001 QUALITY AUDIT
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-2 border-black/40 p-4 font-mono text-xs">
                      <div className="space-y-2 border-r border-black/20 pr-4">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-black/60 block font-sans">1. NCR Quality Record ID</span>
                          <strong className="text-lg text-black font-extrabold">{selectedTagNcr.id}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-black/60 block font-sans">2. Component / Part Name</span>
                          <span className="font-extrabold uppercase">{selectedTagNcr.partName}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-black/60 block font-sans">3. Fabrication Batch Reference</span>
                          <span className="font-extrabold text-black/80">{selectedTagNcr.subProjectBatch}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-black/60 block font-sans">4. Physical Location Area</span>
                          <span className="font-extrabold underline text-red-950">{selectedTagNcr.quarantineLocation || 'Rework floor'}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pl-2">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-black/60 block font-sans">5. Traced Material Name</span>
                          <span className="font-extrabold text-xs block">{selectedTagNcr.materialName || 'Unspecified Steel'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-black/60 block font-sans">6. Original Mill Heat/Batch trace</span>
                          <span className="font-extrabold bg-black text-yellow-400 px-1.5 py-0.5 text-xs inline-block mt-0.5">
                            {selectedTagNcr.materialBatch || 'HEAT-CODE-MTR-PENDING'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-black/60 block font-sans">7. Material Supplier</span>
                          <span className="font-extrabold">{selectedTagNcr.materialSupplier || 'BHP Steel'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-black/60 block font-sans">8. Severity Deviation Rating</span>
                          <span className="font-extrabold text-black bg-black/10 px-1.5 py-0.5 border border-black/30">
                            {selectedTagNcr.severity}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs font-mono p-3 bg-black/5 border border-black/15">
                      <strong className="text-black uppercase text-[10px] font-sans block">Defect Description Details:</strong>
                      <p className="text-black/80 font-serif leading-relaxed italic">
                        "{selectedTagNcr.defectNotes}"
                      </p>
                    </div>

                    <div className="space-y-2 text-xs font-mono p-3 bg-black/5 border border-black/15">
                      <strong className="text-black uppercase text-[10px] font-sans block">Mandated Corrective Action (CAPA):</strong>
                      <p className="text-black/80 leading-relaxed font-bold">
                        {selectedTagNcr.correctiveAction}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-4 border-t border-black/25">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider block font-sans">ISSUED & SIGNED BY:</span>
                        <div className="p-3 bg-black/5 border border-dashed border-black/30 text-center font-serif text-sm italic font-bold">
                          {selectedTagNcr.raisedBy}
                        </div>
                        <span className="text-[9px] block text-right mt-1 text-black/60">Issued on {selectedTagNcr.raisedDate}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider block font-sans">WORKER REWORK VERIFIED STAMP:</span>
                        <div className="p-3 bg-black/5 border border-dashed border-black/30 text-center font-mono font-bold text-sm tracking-widest text-[#dc2626]">
                          {selectedTagNcr.assignedWelderStamp ? (
                            <span>APPROVED: {selectedTagNcr.assignedWelderStamp}</span>
                          ) : (
                            <span>STAMP & DATE APPLIED APPROVED</span>
                          )}
                        </div>
                        <span className="text-[9px] block text-right mt-1 text-black/60">Closed: {selectedTagNcr.resolvedDate || 'PENDING DISPOSITION'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Warning Striped Bottom */}
                  <div className="flex h-4 w-full bg-black">
                    <div className="w-full bg-repeating-hazard h-full"></div>
                  </div>
                </div>

                {/* Print button triggers standard printer layout */}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="bg-black hover:bg-white/5 border border-white/10 text-xs px-4 py-2 hover:text-white uppercase tracking-widest font-mono inline-flex items-center gap-1.5"
                  >
                    <ArrowUpRight size={14} /> Print Quarantine Tag Output
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 border border-white/5 bg-white/[0.01] text-gray-500 font-serif italic text-xs">
                Select an NCR quality report to display structural yellow quarantine tag layout.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
