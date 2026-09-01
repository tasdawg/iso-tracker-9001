/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, Item, Material, User, Client, InventoryLog, SubProject, SubProjectProcess } from '../types';
import { getJoinedDrawings, getItemHierarchy, generateNextId, generateNextLogId } from '../utils';
import { 
  ArrowLeft, CheckSquare, Clock, FileText, UserCheck, Settings, 
  ExternalLink, Hammer, ShieldAlert, CheckCircle2, User as UserIcon, HelpCircle, Plus, Info, Upload,
  Printer, Play, Square, AlertTriangle, X, Zap
} from 'lucide-react';
import NestingOptimizer from './NestingOptimizer';
import GanttScheduler from './GanttScheduler';
import ComplianceRegister from './ComplianceRegister';
import TravelerCard from './TravelerCard';

interface ProjectDetailsProps {
  project: Project;
  allItems: Item[];
  allMaterials: Material[];
  allUsers: User[];
  clients: Client[];
  currentUser: User;
  onBack: () => void;
  onUpdateProject: (updatedProject: Project) => void;
  onUpdateClients?: (newClients: Client[]) => void;
  allLogs?: InventoryLog[];
  onAddLog?: (log: InventoryLog) => void;
  onViewSimpleCard?: () => void;
}

// Small inline component for entering overtime reason
function OvertimeReasonInput({ project, subIdx, procIdx, proc, onUpdateProject }: {
  project: Project;
  subIdx: number;
  procIdx: number;
  proc: SubProjectProcess;
  onUpdateProject: (p: Project) => void;
}) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) return;
    const nextSubProjects = [...project.subProjects];
    const subProj = { ...nextSubProjects[subIdx] };
    const procs = [...subProj.processes];
    const targetProc = { ...procs[procIdx], overtimeReason: reason.trim() };
    procs[procIdx] = targetProc;
    subProj.processes = procs;
    nextSubProjects[subIdx] = subProj;
    onUpdateProject({ ...project, subProjects: nextSubProjects });
  };

  return (
    <div className="flex gap-1.5 items-start">
      <textarea
        rows={2}
        placeholder="e.g., Waiting on QC approval, material delay, operator relief swap..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="flex-1 bg-black border border-red-800/40 p-1.5 text-[9px] text-zinc-300 outline-none focus:border-orange-500 resize-none font-mono"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!reason.trim()}
        className="shrink-0 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-700/40 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        Save
      </button>
    </div>
  );
}

export default function ProjectDetails({
  project,
  allItems,
  allMaterials,
  allUsers,
  clients: propsClients,
  currentUser,
  onBack,
  onUpdateProject,
  onUpdateClients,
  allLogs,
  onAddLog,
  onViewSimpleCard
}: ProjectDetailsProps) {
  const [activeTab, setActiveTab2] = useState<'overview' | 'processes' | 'drawings' | 'materials' | 'nesting' | 'scheduler' | 'compliance'>('overview');
  const [showTraveler, setShowTraveler] = useState<boolean>(false);
  const [selectedSubIndex, setSelectedSubIndex] = useState<number>(0);

  // Clock ticking state for live elapsed time updates
  const [nowTime, setNowTime] = useState(Date.now());
  React.useEffect(() => {
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeStage = localStorage.getItem('operator_active_stage') || 'All Stages';

  // Format seconds to human-readable duration
  const formatSeconds = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? `${hrs}h ` : ''}${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Get elapsed seconds for a process (wall-clock from timerStart on the process object)
  const getElapsedForProc = (proc: SubProjectProcess) => {
    if (!proc.timerStart) return proc.accumulatedSeconds || 0;
    return (proc.accumulatedSeconds || 0) + Math.floor((nowTime - proc.timerStart) / 1000);
  };

  // Get total elapsed seconds for a subproject (sum of all process timers)
  const getElapsedForSubProject = (sub: SubProject) => {
    if (!sub.processes || sub.processes.length === 0) return 0;
    return sub.processes.reduce((total, proc) => total + getElapsedForProc(proc), 0);
  };

  // Check if any process in a subproject has an active timer
  const isSubProjectTimerActive = (sub: SubProject) => {
    if (!sub.processes || sub.processes.length === 0) return false;
    return sub.processes.some(proc => proc.timerStart !== undefined && proc.status === 'In Progress');
  };

  // Overtime threshold: 9 hours wall-clock
  const OVERTIME_THRESHOLD_MS = 9 * 3600 * 1000;

  // Check for auto-stopped processes and update them
  React.useEffect(() => {
    let changed = false;
    const updatedSubProjects = project.subProjects?.map((sub, sIdx) => {
      if (sIdx !== selectedSubIndex || !sub.processes) return sub;
      const updatedProcs = sub.processes.map((proc, pIdx) => {
        if (proc.status === 'In Progress' && proc.timerStart && !proc.autoStopped) {
          const elapsedMs = nowTime - proc.timerStart;
          if (elapsedMs > OVERTIME_THRESHOLD_MS) {
            changed = true;
            return { ...proc, autoStopped: true };
          }
        }
        return proc;
      });
      return { ...sub, processes: updatedProcs };
    });
    if (changed) {
      onUpdateProject({ ...project, subProjects: updatedSubProjects });
    }
  }, [nowTime, project, selectedSubIndex]);

  const handleStartTimer = (pIdx: number) => {
    const updatedSubProjects = [...project.subProjects];
    const subProj = { ...updatedSubProjects[selectedSubIndex] };
    const procs = [...subProj.processes];
    const proc = { 
      ...procs[pIdx], 
      status: 'In Progress' as const,
      timerStart: Date.now(),
      autoStopped: false,
      overtimeReason: undefined
    };
    procs[pIdx] = proc;
    subProj.processes = procs;
    updatedSubProjects[selectedSubIndex] = subProj;

    onUpdateProject({ ...project, subProjects: updatedSubProjects });
  };

  const handlePauseTimer = (pIdx: number) => {
    const updatedSubProjects = [...project.subProjects];
    const subProj = { ...updatedSubProjects[selectedSubIndex] };
    const procs = [...subProj.processes];
    const proc = { ...procs[pIdx] };
    if (proc.timerStart) {
      const elapsed = Math.floor((Date.now() - proc.timerStart) / 1000);
      proc.accumulatedSeconds = (proc.accumulatedSeconds || 0) + elapsed;
      proc.timerStart = undefined;
    }
    procs[pIdx] = proc;
    subProj.processes = procs;
    updatedSubProjects[selectedSubIndex] = subProj;

    onUpdateProject({ ...project, subProjects: updatedSubProjects });
    setNowTime(Date.now());
  };

  const handleCompleteWithTimer = (pIdx: number) => {
    const updatedSubProjects = [...project.subProjects];
    const subProj = { ...updatedSubProjects[selectedSubIndex] };
    const procs = [...subProj.processes];
    const oldProc = procs[pIdx];
    
    let totalSeconds = oldProc.accumulatedSeconds || 0;
    if (oldProc.timerStart) {
      totalSeconds += Math.floor((Date.now() - oldProc.timerStart) / 1000);
    }

    const formattedDuration = formatSeconds(totalSeconds);

    // Build notes with time tracking and overtime info
    let timeNote = ` [Wall-clock duration: ${formattedDuration}]`;
    if (oldProc.autoStopped && oldProc.overtimeReason) {
      timeNote += ` | Auto-stopped at 9h. Reason: ${oldProc.overtimeReason}`;
    }

    const proc = { 
      ...oldProc,
      status: 'Completed' as const,
      completionDate: new Date().toISOString().split('T')[0],
      checkedByUserId: currentUser.id,
      notes: oldProc.notes 
        ? `${oldProc.notes}${timeNote}` 
        : `Time tracked: ${formattedDuration}. [Shift login check]`,
      timerStart: undefined,
      accumulatedSeconds: 0,
    };
    
    // Track second operator if admin/manager completing on behalf of assigned user
    if ((currentUser.role === 'Admin' || currentUser.role === 'Production Manager') 
        && oldProc.assignedUserId !== currentUser.id) {
      proc.secondOperatorId = currentUser.id;
      proc.secondCompletionDate = new Date().toISOString().split('T')[0];
    }
    
    procs[pIdx] = proc;
    subProj.processes = procs;
    updatedSubProjects[selectedSubIndex] = subProj;

    onUpdateProject({ ...project, subProjects: updatedSubProjects });
  };
  
  // States for updating processes
  const [editingProcessIndex, setEditingProcessIndex] = useState<number | null>(null);
  const [editingSubProjectIndex, setEditingSubProjectIndex] = useState<number | null>(null);
  const [processStatusInput, setProcessStatusInput] = useState<SubProjectProcess['status']>('Pending');
  const [processAssigneeInput, setProcessAssigneeInput] = useState<string>('');
  const [processNotesInput, setProcessNotesInput] = useState<string>('');
  const [secondOperatorId, setSecondOperatorId] = useState<string>('');

  // States for adding/editing outsourced details
  const [editingOutsourceIndex, setEditingOutsourceIndex] = useState<number | null>(null);
  const [outsourceSupplier, setOutsourceSupplier] = useState('');
  const [outsourcePO, setOutsourcePO] = useState('');
  const [outsourceBatch, setOutsourceBatch] = useState('');
  const [outsourceCert, setOutsourceCert] = useState('');
  const [outsourceStatus, setOutsourceStatus] = useState<SubProject['outsourcedStatus']>('Ordered');
  const [millCertFile, setMillCertFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // States for add supplier modal
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');
  const [newSupplierNotes, setNewSupplierNotes] = useState('');

  // Use clients prop directly (no localStorage dependency)
  const clients = propsClients;

  // Load suppliers from clients list (relationType === 'Supplier')
  const suppliers = clients.filter((c: any) => c.relationType === 'Supplier' || c.relationType === 'Both');

  const client = clients.find((c: any) => c.id === project.clientId) || {
    name: 'Unknown Client',
    companyName: 'No Company Details',
    isoComplianceNotes: 'Standard ISO-9001 audit checks apply.'
  };

  // Safe checks
  const currentSubProject = (project.subProjects || [])[selectedSubIndex] || (project.subProjects || [])[0];
  const currentItem = currentSubProject ? allItems.find(i => i.id === currentSubProject.itemId) : null;

  // Compute total processes completed vs remaining
  let totalSteps = 0;
  let completedSteps = 0;
  (project.subProjects || []).forEach(sub => {
    (sub.processes || []).forEach(p => {
      totalSteps++;
      if (p && p.status === 'Completed') completedSteps++;
    });
  });
  const overallProgPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Handle process update submission
  const handleSaveProcessValue = (subIdx: number, procIdx: number) => {
    const updatedSubProjects = [...project.subProjects];
    const subProj = { ...updatedSubProjects[subIdx] };
    const procs = [...subProj.processes];
    const proc = { ...procs[procIdx] };

    const oldStatus = proc.status;
    proc.status = processStatusInput;
    proc.assignedUserId = processAssigneeInput;
    proc.notes = processNotesInput;

    // ISO-9001 Action logs: sign-off mechanisms
    if (processStatusInput === 'Completed' && oldStatus !== 'Completed') {
      proc.completionDate = new Date().toISOString().split('T')[0];
      proc.checkedByUserId = currentUser.id; // current user acts as QA Signoff
      // Track second operator if admin/manager assigning someone else to complete
      if ((currentUser.role === 'Admin' || currentUser.role === 'Production Manager') 
          && processAssigneeInput !== currentUser.id 
          && secondOperatorId) {
        proc.secondOperatorId = secondOperatorId;
        proc.secondCompletionDate = new Date().toISOString().split('T')[0];
      } else if (!secondOperatorId) {
        proc.secondOperatorId = undefined;
        proc.secondCompletionDate = undefined;
      }
    } else if (processStatusInput !== 'Completed') {
      proc.completionDate = undefined;
      proc.checkedByUserId = undefined;
      proc.secondOperatorId = undefined;
      proc.secondCompletionDate = undefined;
    }

    procs[procIdx] = proc;
    subProj.processes = procs;
    updatedSubProjects[subIdx] = subProj;

    const updatedProject = {
      ...project,
      subProjects: updatedSubProjects
    };

    onUpdateProject(updatedProject);
    setEditingProcessIndex(null);
    setEditingSubProjectIndex(null);
  };

  // Start process editing
  const handleOpenProcessEdit = (subIdx: number, procIdx: number, proc: SubProjectProcess) => {
    setEditingSubProjectIndex(subIdx);
    setEditingProcessIndex(procIdx);
    setProcessStatusInput(proc.status);
    setProcessAssigneeInput(proc.assignedUserId);
    setProcessNotesInput(proc.notes || '');
    setSecondOperatorId(proc.secondOperatorId || '');
  };

  // Start outsourced editing
  const handleOpenOutsourceEdit = (subIdx: number, subProj: SubProject) => {
    setEditingOutsourceIndex(subIdx);
    setOutsourceSupplier(subProj.outsourcedSupplierName || '');
    setOutsourcePO(subProj.outsourcedPoNumber || '');
    setOutsourceBatch(subProj.outsourcedBatchNo || '');
    setOutsourceCert(subProj.outsourcedCertUrl || '');
    setOutsourceStatus(subProj.outsourcedStatus || 'Ordered');
    setMillCertFile(null); // Will be replaced if file is uploaded
  };

  const handleSaveOutsource = (subIdx: number) => {
    const updatedSubProjects = [...project.subProjects];
    const subProj = { ...updatedSubProjects[subIdx] };

    const previousStatus = subProj.outsourcedStatus;

    subProj.outsourcedSupplierName = outsourceSupplier;
    subProj.outsourcedPoNumber = outsourcePO;
    subProj.outsourcedBatchNo = outsourceBatch;
    subProj.outsourcedCertUrl = outsourceCert || '';
    subProj.outsourcedStatus = outsourceStatus;

    updatedSubProjects[subIdx] = subProj;
    
    // Add transaction log for external income automatically when updated to Delivered
    if ((outsourceStatus === 'Delivered' || outsourceStatus === 'QA Passed') && previousStatus !== outsourceStatus) {
      const newLog: InventoryLog = {
        id: generateNextLogId(allLogs || []),
        type: 'INCOME',
        date: new Date().toISOString().replace(/\.\d+Z/, ''),
        materialId: 'outsourced-' + subProj.itemId,
        materialName: `Outsourced Part: ${(allItems.find(i => i.id === subProj.itemId)?.name) || 'Component'}`,
        quantity: subProj.qty,
        batchNo: outsourceBatch || 'TBD-BATCH',
        poNumber: outsourcePO,
        userId: currentUser.id,
        notes: `Received second-supplier outsourced batch completed. Supplier: ${outsourceSupplier}. Checked under ISO-9001.`,
        externalPoNo: outsourcePO,
        externalCertUrl: outsourceCert || ''
      };
      
      if (onAddLog) {
        onAddLog(newLog);
      } else {
        console.error('onAddLog callback not provided — log created in UI only');
      }
    }

    const updatedProject = {
      ...project,
      subProjects: updatedSubProjects
    };

    onUpdateProject(updatedProject);
    setEditingOutsourceIndex(null);
  };

  const handleMillCertUpload = async (e: React.ChangeEvent<HTMLInputElement>, subIdx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('millCert', file);
      formData.append('projectId', project.id);
      formData.append('subProjectIndex', String(subIdx));

      const response = await fetch('/api/upload-mill-cert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      setMillCertFile(file);
      setOutsourceCert(result.url);
      alert(`Mill cert uploaded successfully: ${result.url}`);
    } catch (error) {
      console.error('Mill cert upload error:', error);
      alert('Failed to upload mill cert. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Upload a mill cert for a laser cut part file; commits into the sub-project's laserCerts via onUpdateProject (persisted through /api/sync)
  const [laserCertUploadingKey, setLaserCertUploadingKey] = useState<string | null>(null);

  const handleLaserCertUpload = async (e: React.ChangeEvent<HTMLInputElement>, subIdx: number, drawingKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadKey = `${subIdx}:${drawingKey}`;
    setLaserCertUploadingKey(uploadKey);
    try {
      const formData = new FormData();
      formData.append('millCert', file);
      formData.append('projectId', project.id);

      const response = await fetch('/api/upload-mill-cert', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();

      const updatedSubProjects = [...project.subProjects];
      const subProj = { ...updatedSubProjects[subIdx] };
      const otherCerts = (subProj.laserCerts || []).filter(c => c.drawingName !== drawingKey);
      subProj.laserCerts = [...otherCerts, { drawingName: drawingKey, certUrl: result.url }];
      updatedSubProjects[subIdx] = subProj;

      onUpdateProject({ ...project, subProjects: updatedSubProjects });
    } catch (error) {
      console.error('Laser mill cert upload error:', error);
      alert('Failed to upload laser part mill cert. Please try again.');
    } finally {
      setLaserCertUploadingKey(null);
    }
  };

  const openAddSupplierModal = () => {
    setNewSupplierName(outsourceSupplier || '');
    setNewSupplierContact('');
    setNewSupplierEmail('');
    setNewSupplierPhone('');
    setNewSupplierAddress('');
    setNewSupplierNotes('');
    setShowAddSupplierModal(true);
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSupplierName.trim() || !newSupplierContact.trim() || !newSupplierEmail.trim()) {
      alert('Please enter company name, contact person, and email address.');
      return;
    }

    const nextId = generateNextId('CLI', clients.map((c: any) => c.id));
    const newSupplier = {
      id: nextId,
      name: newSupplierContact.trim(),
      companyName: newSupplierName.trim(),
      email: newSupplierEmail.trim(),
      phone: newSupplierPhone.trim(),
      address: newSupplierAddress.trim(),
      isoComplianceNotes: newSupplierNotes.trim() || 'Standard ISO 9001 regulations and weld criteria tracking apply.',
      relationType: 'Supplier' as const,
      isDeleted: false
    };

    // Update clients via API sync (persists to both localStorage and database)
    if (onUpdateClients) {
      onUpdateClients([...clients, newSupplier]);
    } else {
      console.error('onUpdateClients callback not provided — supplier created in UI only');
    }

    // Set the supplier name in the outsource form
    setOutsourceSupplier(newSupplierName.trim());
    setShowAddSupplierModal(false);
    alert(`Supplier "${newSupplierName.trim()}" registered successfully!`);
  };

  // Overall ISO release and audit certificate generator
  const triggerQualityCertRelease = () => {
    if (overallProgPercent < 100) {
      alert("Cannot generate compliance certificate. All sub-project manufacturing process sequences must be Completed & verified first.");
      return;
    }
    const updatedProject: Project = {
      ...project,
      qualityCertGenerated: true,
      qualityPassedDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      qualityPassedByUserId: currentUser.id
    };
    onUpdateProject(updatedProject);
  };

  // Get joined drawings across all active items and nesting child items
  const allDrawings = currentItem ? getJoinedDrawings(currentItem, allItems) : [];

  // Laser cut part files across this project's items that require mill certificate tracking
  const laserCertRows = (project.subProjects || []).flatMap((sub, subIdx) => {
    const item = allItems.find(i => i.id === sub.itemId);
    if (!item?.laserCutParts || item.laserCutParts.length === 0) return [];
    return item.laserCutParts.map(lp => ({ subIdx, item, lp }));
  });

  return (
    <div className="space-y-8 animate-fadeIn text-white max-w-7xl mx-auto px-4 py-8">
      {/* Back Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <button 
            onClick={onBack}
            className="group flex items-center gap-2 text-[11px] font-bold tracking-[0.3em] uppercase text-brand-orange-500 hover:text-brand-orange-400 mb-2 transition-all"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-all" /> 
            Back to Active Board
          </button>
          
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-serif font-extrabold text-3xl md:text-5xl text-white tracking-tight">
              {project.id}
            </h2>
            <div className="h-6 w-[2px] bg-brand-orange-500/30"></div>
            <span className="text-sm tracking-[0.22em] uppercase text-brand-orange-500 font-bold bg-brand-orange-500/10 px-3 py-1">
              BATCH: {project.batchNo}
            </span>
          </div>
          <p className="text-lg text-gray-400 mt-2 font-light">
            Job Title: <span className="text-white font-medium">{project.title}</span> &bull; Ref Client Code: <span className="text-brand-orange-400 font-mono text-[15px]">{project.jobCode}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pb-2 md:pb-0">
          <button
            onClick={() => setShowTraveler(true)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-black border border-white/10 hover:border-brand-orange-500 hover:text-brand-orange-400 text-white transition-colors flex items-center gap-2"
          >
            <Printer size={13} /> Print Route Sheet
          </button>

          {onViewSimpleCard && (
            <button
              onClick={onViewSimpleCard}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-zinc-900 border border-[#f97316]/50 hover:border-[#f97316] text-[#fb923c] hover:bg-neutral-900 transition-colors flex items-center gap-2 cursor-pointer"
            >
              👁️ View Worker Run Card
            </button>
          )}

          <span className={`px-4 py-2 text-xs font-bold uppercase tracking-widest bg-black border ${
            project.status === 'Completed' ? 'border-green-500 text-green-500 bg-green-500/5' :
            project.status === 'QA Inspection' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' :
            project.status === 'Production' ? 'border-brand-orange-500 text-brand-orange-500 bg-brand-orange-500/5' :
            'border-gray-500 text-gray-500'
          }`}>
            Status: {project.status}
          </span>
          {project.qualityCertGenerated ? (
            <div className="bg-green-500/10 border border-green-500/30 px-4 py-2 text-xs uppercase font-bold tracking-widest text-green-400 flex items-center gap-1">
              <CheckCircle2 size={14} /> ISO 9001 RELEASED
            </div>
          ) : (
            <button
              onClick={triggerQualityCertRelease}
              disabled={overallProgPercent < 100}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-none border transition-colors ${
                overallProgPercent === 100 
                ? 'bg-brand-orange-500 text-black border-brand-orange-500 hover:bg-brand-orange-400 cursor-pointer' 
                : 'bg-black border-dashed border-white/10 text-gray-500 cursor-not-allowed'
              }`}
            >
              Sign compliance Release
            </button>
          )}
        </div>
      </div>

      {/* ISO Quality Metadata Overlay Alert */}
      <div className="bg-[#1a1a1a] p-6 border-l-4 border-brand-orange-500 border border-brand-orange-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-brand-orange-500 uppercase text-xs font-bold tracking-widest">
            <ShieldAlert size={14} /> ISO 9001 Batch Traceability Log
          </div>
          <p className="text-sm text-gray-300">
            For strict compliance, verify the mill certificates for structural materials and ensure that each production checklist step has been signed off by the qualified technician executing the task.
          </p>
          <div className="text-xs text-gray-400 font-mono pt-1">
             Client Compliance Mandates: <span className="text-gray-200">{client.isoComplianceNotes}</span>
          </div>
        </div>
        <div className="text-right w-full md:w-auto">
          <div className="text-xs uppercase text-gray-400 font-bold tracking-widest">Global Checklist Progress</div>
          <div className="text-3xl font-bold text-white mt-1 font-mono">{overallProgPercent}%</div>
          <div className="w-24 bg-black h-1.5 mt-1 border border-white/10 overflow-hidden inline-block text-left">
            <div className="bg-brand-orange-500 h-full" style={{ width: `${overallProgPercent}%` }}></div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex flex-wrap border-b border-white/5 bg-[#0d0d0d] p-1 gap-[2px]">
        {(['overview', 'processes', 'drawings', 'materials', 'nesting', 'scheduler', 'compliance'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab2(tab)}
            className={`flex-1 min-w-[100px] py-3 px-4 text-xs font-bold uppercase tracking-wider transition-all rounded-none text-center ${
              activeTab === tab 
              ? 'bg-[#1a1a1a] text-brand-orange-500 border-t-2 border-brand-orange-500' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Tab Content */}
      <div className="bg-[#1a1a1a] p-8 border border-white/5">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Box 1: Project Information */}
              <div className="p-6 bg-black border border-white/5 space-y-4">
                <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-brand-orange-500 pb-2 border-b border-white/10 flex items-center justify-between">
                  <span>Client & Project Frame</span>
                  <Info size={14} />
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">Client Name</div>
                    <div className="text-sm font-semibold">{client.name}</div>
                    <div className="text-xs text-gray-400">{client.companyName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">Project Start Date</div>
                    <div className="text-sm font-mono">{project.dateCreated}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">Delivery Deadline</div>
                    <div className="text-sm font-mono text-brand-orange-400 font-bold">{project.deadline}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">Audit Authorization Signature</div>
                    {project.qualityCertGenerated ? (
                      <div className="text-xs text-green-400 pt-1 flex items-center gap-1">
                        <UserCheck size={12} /> Checked by: {allUsers.find(u => u.id === project.qualityPassedByUserId)?.name || 'Manager'}
                      </div>
                    ) : (
                      <div className="text-xs text-yellow-500 pt-1">Pending Quality Assurance Release</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Box 2: Target Assemblies Breakdown */}
              <div className="p-6 bg-black border border-white/5 lg:col-span-2 space-y-4">
                <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-brand-orange-500 pb-2 border-b border-white/10">
                  Target Structural Items & Nested Hierarchy
                </h4>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {(project?.subProjects || []).map((sub, sIdx) => {
                    const item = allItems.find(i => i.id === sub.itemId);
                    if (!item) return null;
                    const nestedHierarchy = getItemHierarchy(item.id, allItems);
                    
                    return (
                      <div key={sIdx} className="p-4 bg-[#111111] border border-white/10 hover:border-brand-orange-500/20 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-xs font-mono font-bold bg-brand-orange-500/10 text-brand-orange-400 px-2 py-0.5 mr-2">
                              {item.itemCode}
                            </span>
                            <span className="font-bold text-sm text-white">{item.name}</span>
                          </div>
                          <span className="text-xs uppercase text-gray-400">Qty: <strong className="text-white font-mono">{sub.qty}</strong></span>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">{item.description}</p>
                        
                        {/* Recursive nested hierarchy listing */}
                        <div className="text-[11px] border-t border-white/5 pt-2 space-y-1 bg-[#090909] p-2">
                          <div className="text-[10px] uppercase tracking-wider text-brand-orange-400 font-bold">Nesting bill of parts breakdown:</div>
                          {nestedHierarchy.map((h, hIdx) => (
                            <div key={hIdx} className="flex justify-between items-center pl-2 font-mono" style={{ paddingLeft: `${(h.level + 1) * 8}px` }}>
                              <span className="text-gray-300">
                                {h.level > 0 ? '└ ' : '■ '} {h.name} <span className="text-[10px] text-gray-500">({h.code})</span>
                              </span>
                              <span className="text-brand-orange-400 font-bold">Qty {h.qtyRequired * sub.qty}</span>
                            </div>
                          ))}
                        </div>

                        {/* Laser cut parts & DXF nest files for this item */}
                        {(item.laserCutParts || []).length > 0 && (
                          <div className="text-[11px] border-t border-white/5 pt-2 mt-2 space-y-1 bg-black p-2">
                            <div className="text-[10px] uppercase tracking-wider text-lime-400 font-bold flex items-center gap-1">
                              <Zap size={11} /> Laser cut parts (DXF nest files):
                            </div>
                            {(item.laserCutParts || []).map((lp, lpIdx) => (
                              <div key={lpIdx} className="flex justify-between items-center pl-2 font-mono gap-2">
                                <span className="text-gray-300 truncate">{lp.description || lp.drawingName}</span>
                                <span className="text-lime-400/70 text-[10px] shrink-0">{lp.drawingName}{lp.designVersion ? ` · ${lp.designVersion}` : ''}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Direct status indicators */}
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-2 pt-2 border-t border-white/5">
                          <span>Origin Batch: <span className="text-gray-300 font-mono">{sub.batchNo}</span></span>
                          {sub.isOutsourced ? (
                            <span className="text-yellow-500 bg-yellow-500/10 px-2 py-0.5 border border-yellow-500/20">OUTSOURCED PART ({sub.outsourcedStatus})</span>
                          ) : (
                            <span className="text-brand-orange-500 bg-brand-orange-500/5 px-2 py-0.5">IN-HOUSE MANUFACTURED</span>
                          )}
                        </div>

                        {/* Subproject timer display & action buttons */}
                        {sub.processes && sub.processes.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400 uppercase tracking-wider font-bold">Total Work Time:</span>
                              {(() => {
                                const elapsed = getElapsedForSubProject(sub);
                                const isActive = isSubProjectTimerActive(sub);
                                return (
                                  <>
                                    {isActive ? (
                                      <div className="flex items-center gap-2 bg-[#d97706]/10 border border-amber-500/20 px-2 py-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-orange-500 animate-ping"></span>
                                        <span className="text-[#fb923c] font-black font-mono tracking-widest">{formatSeconds(elapsed)}</span>
                                      </div>
                                    ) : (
                                      <span className="text-white font-bold font-mono">{formatSeconds(elapsed)}</span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>

                            {(() => {
                              const isActive = isSubProjectTimerActive(sub);
                              const anyCompleted = sub.processes.every(p => p.status === 'Completed');
                              return (
                                <div className="flex gap-2">
                                  {!isActive ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Start first pending process timer
                                        const updatedSubProjects = [...project.subProjects];
                                        const subProj = { ...updatedSubProjects[sIdx] };
                                        const procs = [...subProj.processes];
                                        const firstPending = procs.findIndex(p => p.status === 'Pending' || (p.status === 'In Progress' && !p.timerStart));
                                        if (firstPending >= 0) {
                                          procs[firstPending] = { 
                                            ...procs[firstPending], 
                                            status: 'In Progress',
                                            timerStart: Date.now(),
                                            autoStopped: false,
                                            overtimeReason: undefined
                                          };
                                          subProj.processes = procs;
                                          updatedSubProjects[sIdx] = subProj;
                                          onUpdateProject({ ...project, subProjects: updatedSubProjects });
                                        }
                                      }}
                                      className="bg-brand-orange-500 text-black hover:bg-brand-orange-400 text-[10px] font-black uppercase tracking-widest py-2 px-3 transition-all flex items-center justify-center gap-1.5 rounded-none cursor-pointer"
                                    >
                                      <Play size={12} className="fill-current" />
                                      Start Work
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          // Pause all active process timers
                                          const updatedSubProjects = [...project.subProjects];
                                          const subProj = { ...updatedSubProjects[sIdx] };
                                          const procs = [...subProj.processes];
                                          let changed = false;
                                          procs.forEach((proc, pIdx) => {
                                            if (proc.timerStart && proc.status === 'In Progress') {
                                              const elapsed = Math.floor((Date.now() - proc.timerStart) / 1000);
                                              procs[pIdx] = { 
                                                ...proc, 
                                                accumulatedSeconds: (proc.accumulatedSeconds || 0) + elapsed,
                                                timerStart: undefined
                                              };
                                              changed = true;
                                            }
                                          });
                                          if (changed) {
                                            subProj.processes = procs;
                                            updatedSubProjects[sIdx] = subProj;
                                            onUpdateProject({ ...project, subProjects: updatedSubProjects });
                                            setNowTime(Date.now());
                                          }
                                        }}
                                        className="bg-[#222] border border-white/10 text-white hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest py-2 px-3 transition-all flex items-center justify-center gap-1.5 rounded-none cursor-pointer"
                                      >
                                        <Square size={12} className="fill-current text-white" />
                                        Pause All
                                      </button>
                                      {anyCompleted ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            // Mark subproject as completed
                                            const updatedSubProjects = [...project.subProjects];
                                            updatedSubProjects[sIdx] = { 
                                              ...sub, 
                                              outsourcedStatus: 'QA Passed',
                                              isOutsourced: false
                                            };
                                            onUpdateProject({ ...project, subProjects: updatedSubProjects });
                                          }}
                                          className="bg-green-500 hover:bg-green-400 text-black text-[10px] font-black uppercase tracking-widest py-2 px-3 transition-all flex items-center justify-center gap-1.5 rounded-none cursor-pointer"
                                        >
                                          <CheckSquare size={12} />
                                          Complete Batch
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-gray-500 uppercase tracking-widest py-2 px-3 border border-white/5">
                                          All processes must be completed first
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Outsourcing Section */}
            <div className="p-6 bg-black border border-white/5">
              <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-brand-orange-500 pb-3 border-b border-white/10 flex items-center justify-between mb-4">
                <span>Secondary Suppliers & Outsourced Parts Tracking (ISO 9001 Audited)</span>
                <Settings size={14} />
              </h4>
              <p className="text-xs text-gray-400 mb-4">
                If structural parts are made, welded, or galvanized by sub-contractors, we must document their company name, Purchase Order (PO), incoming batch identification code, and original material certificate of conformity:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(project?.subProjects || []).map((sub, sIdx) => {
                  const item = allItems.find(i => i.id === sub.itemId);
                  if (!item) return null;

                  return (
                    <div key={sIdx} className="p-4 border border-white/10 bg-[#121212] space-y-3">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="font-bold text-xs uppercase tracking-wider text-white">
                          Component: {item.name}
                        </div>
                        <button
                          onClick={() => {
                            if (!sub.isOutsourced) {
                              // Toggle outsourcing
                              const updatedSubProjs = [...(project?.subProjects || [])];
                              updatedSubProjs[sIdx] = { ...sub, isOutsourced: true };
                              onUpdateProject({ ...project, subProjects: updatedSubProjs });
                            }
                            handleOpenOutsourceEdit(sIdx, sub);
                          }}
                          className="text-[10px] uppercase font-bold tracking-widest text-[#D9823B] hover:underline"
                        >
                          Configure Outsourcing
                        </button>
                      </div>

                      {sub.isOutsourced ? (
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div>
                            <span className="text-[10px] uppercase text-gray-500 block">Outsource Supplier</span>
                            <span className="text-gray-200">{sub.outsourcedSupplierName || 'Not Appointed'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-gray-500 block">PO reference</span>
                            <span className="text-gray-200">{sub.outsourcedPoNumber || 'None'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-gray-500 block">Sub-Contractor Batch Code</span>
                            <span className="text-brand-orange-400 font-bold">{sub.outsourcedBatchNo || 'TBD'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-gray-500 block">Material Certificate</span>
                            {sub.outsourcedCertUrl ? (
                              <a 
                                href={sub.outsourcedCertUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-green-400 underline flex items-center gap-1 text-[11px]"
                              >
                                View cert <ExternalLink size={10} />
                              </a>
                            ) : (
                              <span className="text-yellow-500">MIA - Cert Required!</span>
                            )}
                          </div>
                          <div className="col-span-2 pt-2">
                            <span className="text-[10px] uppercase text-gray-500 block mb-1">State Progress</span>
                            <span className={`px-2 py-0.5 font-bold uppercase tracking-widest border text-[10px] ${
                              sub.outsourcedStatus === 'QA Passed' ? 'border-green-500 text-green-500 bg-green-500/5' :
                              sub.outsourcedStatus === 'Delivered' ? 'border-blue-500 text-blue-500 bg-blue-500/5' :
                              'border-yellow-500 text-yellow-500'
                            }`}>
                              {sub.outsourcedStatus || 'Ordered'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-xs text-gray-500 border border-dashed border-white/5 bg-[#090909]">
                          This is an in-house fabrication task. No subcontractor tracking configured.
                        </div>
                      )}

                      {/* Edit sub-contract form */}
                      {editingOutsourceIndex === sIdx && (
                        <div className="p-4 border-t border-brand-orange-500/20 bg-black mt-3 space-y-3">
                          <h5 className="text-[10px] uppercase tracking-wider text-brand-orange-500 font-bold">Sub-Contractor Certificate Verification Form</h5>
                          <div className="space-y-2">
                            <label className="block text-[10px] uppercase text-gray-400">Supplier Company</label>
                            <div className="flex gap-2">
                              {suppliers.length > 0 ? (
                                <select 
                                  value={outsourceSupplier}
                                  onChange={e => setOutsourceSupplier(e.target.value)}
                                  className="flex-1 bg-black border border-white/10 p-2 text-xs text-white"
                                >
                                  <option value="">Select Supplier or Type New...</option>
                                  {suppliers.map((supplier: any) => (
                                    <option key={supplier.id} value={supplier.companyName}>
                                      {supplier.companyName} ({supplier.id})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input 
                                  type="text" 
                                  value={outsourceSupplier}
                                  onChange={e => setOutsourceSupplier(e.target.value)}
                                  className="flex-1 bg-black border border-white/10 p-2 text-xs text-white"
                                  placeholder="Metro Steel Galvanising Inc."
                                />
                              )}
                              <button
                                type="button"
                                onClick={openAddSupplierModal}
                                className="px-3 py-2 bg-orange-500 hover:bg-orange-400 text-black text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                              >
                                + Add Supplier
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] uppercase text-gray-400">Purchase Order</label>
                              <input 
                                type="text" 
                                value={outsourcePO}
                                onChange={e => setOutsourcePO(e.target.value)}
                                className="w-full bg-black border border-white/10 p-2 text-xs text-white"
                                placeholder="PO-77218"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase text-gray-400">Second Supplier Batch No</label>
                              <input 
                                type="text" 
                                value={outsourceBatch}
                                onChange={e => setOutsourceBatch(e.target.value)}
                                className="w-full bg-black border border-white/10 p-2 text-xs text-white"
                                placeholder="BATCH-998A"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[10px] uppercase text-[#6b7280]">Original Material Test Cert Upload (ISO 9001 Required)</label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="file"
                                accept=".pdf,.xlsx,.xls,.doc,.docx"
                                onChange={(e) => handleMillCertUpload(e, sIdx)}
                                disabled={uploading}
                                className="w-full bg-black border border-white/10 p-2 text-xs text-white focus:border-orange-500 outline-none file:mr-2 file:bg-orange-500 file:text-black file:font-bold file:border-0 file:cursor-pointer"
                              />
                              {uploading && (
                                <span className="text-orange-400 text-[10px] uppercase font-bold">Uploading...</span>
                              )}
                            </div>
                            {outsourceCert && !millCertFile && (
                              <p className="text-[9px] text-gray-500 mt-1">
                                Current cert: <a href={outsourceCert} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">View Existing</a>
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[10px] uppercase text-gray-400">Tracking Status</label>
                            <select 
                              value={outsourceStatus}
                              onChange={e => setOutsourceStatus(e.target.value as any)}
                              className="w-full bg-black border border-white/10 p-2 text-xs text-white"
                            >
                              <option value="Ordered">Ordered / Manifest</option>
                              <option value="Dispatched">Dispatched</option>
                              <option value="Delivered">Delivered & Checked In</option>
                              <option value="QA Passed">QA Inspect Approved (Signed Off)</option>
                            </select>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <button 
                              type="button" 
                              onClick={() => setEditingOutsourceIndex(null)}
                              className="border border-white/10 px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                            >
                              Discard
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleSaveOutsource(sIdx)}
                              className="bg-brand-orange-500 px-3 py-1.5 text-[10px] font-bold text-black uppercase tracking-wider"
                            >
                              Verify cert & Commit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Laser Cut Part Mill Certificates (ISO 9001 Audited) */}
            {laserCertRows.length > 0 && (
              <div className="p-6 bg-black border border-white/5">
                <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-brand-orange-500 pb-3 border-b border-white/10 flex items-center justify-between mb-4">
                  <span>Laser Cut Part Mill Certificates (ISO 9001 Audited)</span>
                  <Zap size={14} />
                </h4>
                <p className="text-xs text-gray-400 mb-4">
                  Every laser cut part file attached to this project's items requires the steel supplier mill certificate of conformity logged against the fabrication batch. Parts without an attached certificate are flagged in red for audit:
                </p>

                <div className="space-y-2">
                  {laserCertRows.map(({ subIdx, item, lp }) => {
                    const drawingKey = lp.drawingName || lp.description;
                    const certUrl = (project.subProjects[subIdx].laserCerts || []).find(c => c.drawingName === drawingKey)?.certUrl;
                    const uploadKey = `${subIdx}:${drawingKey}`;

                    return (
                      <div key={uploadKey} className={`p-3 border flex flex-col md:flex-row md:items-center justify-between gap-2 ${
                        certUrl ? 'border-green-500/20 bg-[#121212]' : 'border-red-500/40 bg-red-950/20'
                      }`}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {certUrl ? (
                              <span className="text-[9px] uppercase font-black tracking-widest text-green-400 border border-green-500/30 bg-green-500/10 px-1.5 py-0.5">Cert Attached</span>
                            ) : (
                              <span className="text-[9px] uppercase font-black tracking-widest text-red-400 border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 animate-pulse">Mill Cert Missing</span>
                            )}
                            <span className="text-xs font-bold text-white uppercase truncate">{lp.description || lp.drawingName}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono mt-1">
                            {item.itemCode} &bull; File: {lp.drawingName}{lp.designVersion ? ` · ${lp.designVersion}` : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                          {certUrl && (
                            <a href={certUrl} target="_blank" rel="noreferrer" className="text-green-400 hover:underline flex items-center gap-1 text-[11px] font-bold whitespace-nowrap">
                              View Cert <ExternalLink size={10} />
                            </a>
                          )}
                          {laserCertUploadingKey === uploadKey ? (
                            <span className="text-red-400 text-[10px] uppercase font-bold whitespace-nowrap">Uploading...</span>
                          ) : (
                            <input
                              type="file"
                              accept=".pdf,.xlsx,.xls,.doc,.docx,image/*"
                              onChange={(e) => handleLaserCertUpload(e, subIdx, drawingKey)}
                              className="w-full md:w-auto bg-black border border-white/10 p-2 text-xs text-white focus:border-orange-500 outline-none file:mr-2 file:bg-orange-500 file:text-black file:font-bold file:border-0 file:cursor-pointer"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Supplier Modal */}
        {showAddSupplierModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 text-white relative shadow-2xl">
              <div className="absolute top-0 right-0 p-3">
                <button
                  onClick={() => setShowAddSupplierModal(false)}
                  className="text-zinc-500 hover:text-orange-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                <span className="text-[9px] uppercase tracking-widest text-orange-500 font-bold block mb-1">
                  ISO 9001 Partner Onboarding
                </span>
                <h3 className="font-bold text-base uppercase tracking-widest text-[#cbd5e1] font-sans">
                  Register New Supplier Partner Spec
                </h3>
              </div>

              <form onSubmit={handleAddSupplier} className="p-6 space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-4">
                  
                  <div className="space-y-1 col-span-2">
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">
                      Corporate Entity / Company LLC <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Titan Aerospace Australia"
                      className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                      value={newSupplierName}
                      onChange={e => setNewSupplierName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">
                      Relation / Flow Type <span className="text-orange-500">*</span>
                    </label>
                    <select
                      className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                      value="Supplier"
                      disabled
                    >
                      <option value="Supplier">Supplier (Provides Raw Material Stocks)</option>
                    </select>
                  </div>

                  <div className="space-y-1 col-span-1">
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">
                      Primary Contact Officer <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Connor"
                      className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                      value={newSupplierContact}
                      onChange={e => setNewSupplierContact(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1 col-span-1">
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">
                      Direct POC Email <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="purchasing@titan.aero"
                      className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                      value={newSupplierEmail}
                      onChange={e => setNewSupplierEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1 col-span-1">
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">
                      Direct Contact Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +61 3 9801 4402"
                      className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                      value={newSupplierPhone}
                      onChange={e => setNewSupplierPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1 col-span-1">
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">
                      FOB Facility Address
                    </label>
                    <input
                      type="text"
                      placeholder="Suburb, State, Country"
                      className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                      value={newSupplierAddress}
                      onChange={e => setNewSupplierAddress(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="block text-[9px] uppercase font-bold text-zinc-500">
                      ISO Weld Specs / Millcert Quality Requirements
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Requires certified NDT structural audits. Standard batch numbers are steel stamps on load corners."
                      className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                      value={newSupplierNotes}
                      onChange={e => setNewSupplierNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowAddSupplierModal(false)}
                    className="bg-black hover:bg-zinc-900 text-zinc-400 px-4 py-2 uppercase tracking-wider text-[10px] border border-zinc-800"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-400 text-black font-extrabold px-6 py-2 uppercase tracking-wider text-[10px]"
                  >
                    Confirm & Sync
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: PROCESSES ROUTE CHECKLIST */}
        {activeTab === 'processes' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif text-2xl font-bold text-white">Fabrication Route Sheet Checklist</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Track individual processes in sequences. All completed fabrication sequences must be signed off by physical workers with an auditing inspector.
                </p>
              </div>
              
              <div className="flex bg-[#090909] border border-white/10 p-1 rounded-none text-xs gap-1">
                {(project?.subProjects || []).map((sub, sIdx) => {
                  const item = allItems.find(i => i.id === sub.itemId);
                  return (
                    <button
                      key={sIdx}
                      onClick={() => setSelectedSubIndex(sIdx)}
                      className={`px-3 py-1.5 font-bold uppercase tracking-widest ${
                        selectedSubIndex === sIdx ? 'bg-brand-orange-500 text-black' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {item ? item.itemCode : `Part ${sIdx + 1}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {currentSubProject ? (
              <div className="space-y-4">
                <div className="p-4 bg-[#0a0a0a] border border-white/5 flex flex-wrap justify-between items-center">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Currently Inspecting routing for:</span>
                    <h4 className="text-base font-bold text-brand-orange-500 flex items-center gap-2">
                      {(allItems.find(i => i.id === currentSubProject.itemId)?.name) || 'Unknown item'}
                      <span className="font-mono bg-[#1a1a1a] text-xs text-gray-400 px-2 py-0.5">Batch: {currentSubProject.batchNo}</span>
                    </h4>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-gray-500">Scheduled quantity: </span> <strong className="text-white text-sm font-mono">{currentSubProject.qty} units</strong>
                  </div>
                </div>

                {(() => {
                  const indexedProcesses = currentSubProject.processes.map((proc, pIdx) => ({
                    proc,
                    pIdx
                  }));

                  // Separate into worker assignments vs general ones
                  const assignedProcesses = indexedProcesses.filter(it => {
                    const isAssignedUser = it.proc.assignedUserId === currentUser.id;
                    const isAssignedStage = activeStage === 'All Stages' || it.proc.name === activeStage;
                    return isAssignedUser && isAssignedStage;
                  });

                  const otherProcesses = indexedProcesses.filter(it => {
                    const isAssignedUser = it.proc.assignedUserId === currentUser.id;
                    const isAssignedStage = activeStage === 'All Stages' || it.proc.name === activeStage;
                    return !(isAssignedUser && isAssignedStage);
                  });

                  // Unified card renderer for each item in the checklist
                  const renderProcessCard = (proc: SubProjectProcess, pIdx: number, isAssigned: boolean) => {
                    const assignedUser = allUsers.find(u => u.id === proc.assignedUserId);
                    const checkerUser = allUsers.find(u => u.id === proc.checkedByUserId);
                    const isTimerActive = proc.timerStart !== undefined;
                    const elapsed = getElapsedForProc(proc);

                    return (
                      <div key={pIdx} className={`bg-black p-6 border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                        isAssigned 
                          ? 'border-brand-orange-500/40 bg-gradient-to-r from-neutral-950 to-black hover:bg-[#080808] border-l-4 border-l-brand-orange-500' 
                          : 'border-white/5 hover:bg-[#0c0c0c]'
                      }`}>
                        <div className="flex items-start gap-4">
                          <span className={`font-mono text-lg font-extrabold w-10 h-10 flex items-center justify-center border shrink-0 ${
                            isAssigned ? 'bg-brand-orange-500 text-black border-brand-orange-500' : 'bg-[#1a1a1a] text-brand-orange-500 border-white/5'
                          }`}>
                            {proc.sequence}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-bold text-base text-white uppercase tracking-wider">{proc.name}</h5>
                              {isAssigned && (
                                <span className="bg-brand-orange-500 text-black font-mono text-[8px] font-black px-1.5 py-0.5 uppercase tracking-widest">
                                  ★ MY STATION TARGET
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-2">
                              <span className="flex items-center gap-1">
                                <UserIcon size={12} className="text-brand-orange-500" />
                                Technician: <strong className="text-white">{assignedUser ? assignedUser.name : 'Unassigned'}</strong>
                              </span>
                              <span>
                                Est. Prep: <strong className="text-brand-orange-400 font-mono">{(currentItem?.processes.find(p => p.sequence === proc.sequence)?.estimatedHours || 1.5) * currentSubProject.qty} Hrs</strong>
                              </span>
                            </div>

                            {proc.notes && (
                              <div className="mt-2 text-xs bg-[#111] p-2 border-l-2 border-brand-orange-500 font-mono text-gray-300 max-w-xl">
                                Notes: {proc.notes}
                              </div>
                            )}

                            {/* Second operator display for completed tasks */}
                            {proc.status === 'Completed' && proc.secondOperatorId && (
                              <div className="mt-2 flex items-center gap-2 text-xs bg-purple-950/20 border border-purple-800/40 p-2">
                                <span className="text-purple-400 font-bold uppercase text-[10px]">Second Operator:</span>
                                <span className="text-white font-bold">{allUsers.find(u => u.id === proc.secondOperatorId)?.name || 'Unknown'}</span>
                                <span className="text-purple-400/70">•</span>
                                <span className="text-purple-300 text-[10px]">Signed off: {proc.secondCompletionDate}</span>
                              </div>
                            )}

                            {/* Clock timer display for all workflows */}
                            {proc.status === 'In Progress' || proc.status === 'Completed' ? (
                              <div className="mt-2 space-y-2">
                                {proc.autoStopped ? (
                                  <div className="p-2.5 bg-red-950/20 border border-red-800/40 space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <AlertTriangle size={12} className="text-red-500 shrink-0" />
                                      <span className="text-[9px] text-red-400 font-black uppercase tracking-wider">
                                        TIMER AUTO-STOPPED — {formatSeconds(elapsed)} WORKED
                                      </span>
                                    </div>
                                    {proc.overtimeReason ? (
                                      <p className="text-[9px] text-zinc-400 font-mono">
                                        Reason on file: <strong className="text-zinc-300">{proc.overtimeReason}</strong>
                                      </p>
                                    ) : (
                                      isAssigned && (
                                        <div className="space-y-1.5">
                                          <span className="text-[9px] text-red-400 font-bold uppercase">Reason required:</span>
                                          <OvertimeReasonInput 
                                            project={project} 
                                            subIdx={selectedSubIndex} 
                                            procIdx={pIdx} 
                                            proc={proc} 
                                            onUpdateProject={onUpdateProject} 
                                          />
                                        </div>
                                      )
                                    )}
                                  </div>
                                ) : isTimerActive ? (
                                  <div className="flex items-center gap-2 bg-[#d97706]/10 border border-amber-500/20 p-2 text-xs font-mono">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-orange-500 animate-ping"></span>
                                    <span className="text-[#fb923c] font-black">LOGGED WORKSTATION SHIFT RUNNING:</span>
                                    <span className="text-white font-black font-mono tracking-widest bg-black px-2 py-0.5 border border-white/10">{formatSeconds(elapsed)}</span>
                                  </div>
                                ) : (
                                  proc.status === 'In Progress' && proc.accumulatedSeconds && proc.accumulatedSeconds > 0 && (
                                    <div className="text-xs font-mono text-gray-400 bg-white/5 p-1 border border-white/5 inline-block">
                                      Accumulated pause: <strong className="text-white font-mono">{formatSeconds(proc.accumulatedSeconds)}</strong>
                                    </div>
                                  )
                                )}
                              </div>
                            ) : proc.status === 'Pending' && (
                              <div className="mt-2 text-[10px] text-gray-500 uppercase tracking-widest">Not Started</div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-4 w-full md:w-auto shrink-0">
                          {/* Sign-off details */}
                          <div className="text-left md:text-right text-xs space-y-1 font-mono">
                            <div>
                              <span className="text-gray-500 block text-[10px] uppercase">Routing stage status</span>
                              <span className={`px-2 py-0.5 font-bold uppercase text-[10px] tracking-widest border font-sans inline-block ${
                                proc.status === 'Completed' ? 'border-green-500 text-green-500 bg-green-500/5' :
                                proc.status === 'In Progress' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5 animate-pulse' :
                                'border-gray-600 text-gray-500 bg-gray-500/5'
                              }`}>
                                {proc.status}
                              </span>
                            </div>
                            {proc.status === 'Completed' && (
                              <div className="text-[10px] text-green-400 space-y-1">
                                <div>Approved on {proc.completionDate}</div>
                                <div>By Inspector: <strong className="text-white underline">{checkerUser ? checkerUser.name : 'TBD'}</strong></div>
                                {proc.secondOperatorId && (
                                  <div className="text-purple-400 font-bold pt-1 border-t border-purple-800/30">
                                    Second Operator: <strong className="text-white">{allUsers.find(u => u.id === proc.secondOperatorId)?.name || 'Unknown'}</strong> — {proc.secondCompletionDate}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Quick start / pause / complete for assigned workstation target */}
                          {isAssigned && proc.status !== 'Completed' && (
                            <div className="flex gap-2 flex-grow sm:flex-grow-0">
                              {!isTimerActive ? (
                                <button
                                  type="button"
                                  onClick={() => handleStartTimer(pIdx)}
                                  className="bg-brand-orange-500 text-black hover:bg-brand-orange-400 text-[10px] font-black uppercase tracking-widest py-2.5 px-4 transition-all flex items-center justify-center gap-1.5 rounded-none cursor-pointer flex-grow sm:flex-grow-0"
                                >
                                  <Play size={12} className="fill-current" />
                                  Start Task
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handlePauseTimer(pIdx)}
                                    className="bg-[#222] border border-white/10 text-white hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest py-2.5 px-3 transition-all flex items-center justify-center gap-1.5 rounded-none cursor-pointer flex-grow sm:flex-grow-0"
                                  >
                                    <Square size={12} className="fill-current text-white" />
                                    Pause
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCompleteWithTimer(pIdx)}
                                    className="bg-green-500 hover:bg-green-400 text-black text-[10px] font-black uppercase tracking-widest py-2.5 px-4 transition-all flex items-center justify-center gap-1.5 rounded-none cursor-pointer flex-grow sm:flex-grow-0"
                                  >
                                    <CheckSquare size={12} />
                                    Sign off Completion
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {/* Override button */}
                          <button
                            type="button"
                            onClick={() => handleOpenProcessEdit(selectedSubIndex, pIdx, proc)}
                            className="bg-[#111] border border-white/10 hover:border-brand-orange-500 hover:text-brand-orange-400 text-gray-400 hover:text-white text-[10px] font-bold uppercase tracking-widest py-2.5 px-4 transition-all rounded-none"
                          >
                            Override / Edit
                          </button>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-6">
                      {assignedProcesses.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-brand-orange-400 font-bold py-1.5 px-3 bg-brand-orange-500/[0.05] border border-brand-orange-500/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange-500 animate-pulse"></span>
                            ★ YOUR WORKSTATION TARGETS (PRIORITY SHIFT ASSIGNMENTS)
                          </div>
                          <div className="space-y-[2px] bg-brand-orange-500/10">
                            {assignedProcesses.map(({ proc, pIdx }) => renderProcessCard(proc, pIdx, true))}
                          </div>
                        </div>
                      )}

                      {otherProcesses.length > 0 && (
                        <div className="space-y-2">
                          {assignedProcesses.length > 0 && (
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold py-1.5 px-3 bg-[#0d0d0d] border border-white/5">
                              Other Shopfloor Sequence Checklist Stages
                            </div>
                          )}
                          <div className="space-y-[2px] bg-white/5">
                            {otherProcesses.map(({ proc, pIdx }) => renderProcessCard(proc, pIdx, false))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Inline Process Checkoff Form Editor */}
                {editingProcessIndex !== null && editingSubProjectIndex === selectedSubIndex && (
                  <div className="p-6 bg-black border-2 border-brand-orange-500/40 space-y-4 animate-scaleUp">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <h4 className="font-serif font-bold text-lg text-white">
                        Updating Router Stage Sequence #{currentSubProject.processes[editingProcessIndex].sequence}: {currentSubProject.processes[editingProcessIndex].name}
                      </h4>
                      <button 
                        onClick={() => { setEditingProcessIndex(null); setEditingSubProjectIndex(null); }}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400">Step Routing Status</label>
                        <select
                          value={processStatusInput}
                          onChange={e => setProcessStatusInput(e.target.value as any)}
                          className="w-full bg-black border border-white/10 p-3 text-white focus:border-brand-orange-500 outline-none text-xs"
                        >
                          <option value="Pending">Pending Setup</option>
                          <option value="In Progress">Active In Progress</option>
                          <option value="Completed">Completed & Quality Verified</option>
                        </select>
                        <span className="text-[9px] text-[#D9823B] block font-mono">
                          Note: Selecting "Completed" will automatically bind a QA signoff stamp with your digital operator credentials (<strong>{currentUser.name}</strong>).
                        </span>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 font-sans">Assigned Technician</label>
                        <select
                          value={processAssigneeInput}
                          onChange={e => setProcessAssigneeInput(e.target.value)}
                          className="w-full bg-black border border-white/10 p-3 text-white focus:border-brand-orange-500 outline-none text-xs"
                        >
                          <option value="">Select Qualified Staff...</option>
                          {allUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 font-sans">Second Operator (Admin/Manager Override)</label>
                        <select
                          value={secondOperatorId}
                          onChange={e => setSecondOperatorId(e.target.value)}
                          className="w-full bg-black border border-white/10 p-3 text-white focus:border-purple-500 outline-none text-xs"
                        >
                          <option value="">-- None --</option>
                          {allUsers.filter(u => u.role === 'Admin' || u.role === 'Production Manager').map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                          ))}
                        </select>
                        <span className="text-[9px] text-gray-500 block">
                          Select an Admin or Production Manager to act as second operator signing off this task. Only appears when task is marked Completed and assigned user differs from current admin/manager.
                        </span>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400">Technical Operator Logs / Notes</label>
                        <textarea
                          rows={2}
                          value={processNotesInput}
                          onChange={e => setProcessNotesInput(e.target.value)}
                          className="w-full bg-black border border-white/10 p-2 text-white focus:border-brand-orange-500 outline-none text-xs"
                          placeholder="e.g., Weld run completed with zero porosity using Argon shield gas. Dimensions checked."
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => { setEditingProcessIndex(null); setEditingSubProjectIndex(null); }}
                        className="bg-black border border-white/10 text-gray-400 uppercase tracking-widest text-[11px] font-bold px-6 py-2.5 hover:text-white"
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveProcessValue(selectedSubIndex, editingProcessIndex)}
                        className="bg-brand-orange-500 text-black uppercase tracking-widest text-[11px] font-bold px-6 py-2.5 hover:bg-brand-orange-400"
                      >
                        Save & Record Signoff
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">No sub-projects detected.</div>
            )}
          </div>
        )}

        {/* TAB 3: DRAWINGS (JOINED PARENT & CHILDREN) */}
        {activeTab === 'drawings' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="font-serif text-2xl font-bold text-white">Joined Engineering Drawings & CNC DXFs</h3>
              <p className="text-xs text-gray-400 mt-1">
                ISO 9001 requires the correct engineering version and draft revision file to be locked directly to the fabrication batch. Below are the drawings joined across the high-level parent assembly and all constituent child parts:
              </p>
            </div>

            {allDrawings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allDrawings.map((dwg, dIdx) => (
                  <div key={dIdx} className="bg-black p-5 border border-white/10 hover:border-brand-orange-500/20 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 inline-block ${
                          dwg.fileType === 'DXF' ? 'bg-orange-500/10 text-brand-orange-400 border border-brand-orange-400/20' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {dwg.fileType} PART FILE
                        </span>
                        <span className="font-mono text-xs text-gray-500 uppercase">Ver: {dwg.designVersion}</span>
                      </div>
                      
                      <h4 className="text-sm font-bold text-white tracking-wide truncate">{dwg.name}</h4>
                      <p className="text-[11px] text-gray-400 mt-1 font-mono">Belongs to: {dwg.itemName}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500 font-mono">
                      <span>{dwg.fileSize}</span>
                      <a
                        href={`https://iso-standards-store.s3.amazonaws.com/drawings/${dwg.name}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                          e.preventDefault();
                          alert(`Simulating engineering download of CAD asset ${dwg.name}`);
                        }}
                        className="text-brand-orange-500 hover:underline flex items-center gap-1 font-bold"
                      >
                        Open CAD <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-black border border-dashed border-white/5 text-gray-500">
                No design, DXF, or PDF drawings linked to this part template.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MATERIALS */}
        {activeTab === 'materials' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="font-serif text-2xl font-bold text-white">Assigned Material Batches & Certificates</h3>
              <p className="text-xs text-gray-400 mt-1">
                ISO 9001 compliance stipulates direct material trace-ability. Physical steel grades must have mill test certificates locked with this project. Below are the active components and structural material batches bound:
              </p>
            </div>

            <div className="space-y-6">
              
              {/* In-House stock used in project */}
              <div className="p-6 bg-black border border-white/5 space-y-4">
                <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-brand-orange-500 pb-2 border-b border-white/10">
                  Allocated In-House Structural Materials
                </h4>
                
                {project.includeStockItems && project.includeStockItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-2">Material Specification</th>
                          <th className="py-3 px-2">Batch / Trace Code</th>
                          <th className="py-3 px-2">Source Mill certs</th>
                          <th className="py-3 px-2">Assigned PO</th>
                          <th className="py-3 px-2 text-right">Qty Allocated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(project?.includeStockItems || []).map((stk, sIdx) => {
                          const mat = (allMaterials || []).find(m => m?.id === stk?.materialId);
                          return (
                            <tr key={sIdx} className="border-b border-white/5 hover:bg-white/5">
                              <td className="py-4 px-2 font-sans font-bold">
                                {mat ? mat.name : 'Unknown Structural Steel'}
                                <span className="block text-[10px] text-gray-400 uppercase font-mono mt-0.5">
                                  Grade: {mat?.grade || 'N/A'} &bull; {mat?.dimensions}
                                </span>
                                {(stk.invoiceNoUsed || mat?.invoiceNo) && (
                                  <span className="block text-[10px] text-brand-orange-500 uppercase font-mono mt-0.5">
                                    Supplier Invoice: #{stk.invoiceNoUsed || mat?.invoiceNo}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-2 text-brand-orange-500 font-bold">{stk.batchNoUsed}</td>
                              <td className="py-4 px-2">
                                {mat?.materialCertUrl ? (
                                  <a
                                    href={mat.materialCertUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-green-400 hover:underline flex items-center gap-1 font-sans text-[11px]"
                                  >
                                    Millcert PDF <ExternalLink size={10} />
                                  </a>
                                ) : (
                                  <span className="text-yellow-500">Missing Cert!</span>
                                )}
                              </td>
                              <td className="py-4 px-2 text-gray-400">{mat?.poNumber || 'N/A'}</td>
                              <td className="py-4 px-2 text-right text-sm text-white font-bold">{stk.qty} {mat?.unit || 'Units'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-gray-500">
                    No custom-allocated raw materials recorded for this job.
                  </div>
                )}
              </div>

              {/* Outsourced supplier certifications */}
              <div className="p-6 bg-black border border-white/5 space-y-4">
                <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-brand-orange-500 pb-2 border-b border-white/10">
                  Subcontractor / Client-Furnished Certifications
                </h4>
                
                {(project?.subProjects || []).filter(s => s.isOutsourced).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-2">Part Component</th>
                          <th className="py-3 px-2">Outsourced Supplier</th>
                          <th className="py-3 px-2">Subcontractor PO#</th>
                          <th className="py-3 px-2 py-3 px-2 text-brand-orange-400">Incoming Batch Num</th>
                          <th className="py-3 px-2">Incoming Cert</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(project?.subProjects || []).filter(s => s.isOutsourced).map((sub, sIdx) => {
                          const item = allItems.find(i => i.id === sub.itemId);
                          return (
                            <tr key={sIdx} className="border-b border-white/5 hover:bg-white/5">
                              <td className="py-4 px-2 font-sans font-bold text-white">
                                {item?.name} <span className="text-gray-500">({item?.itemCode})</span>
                              </td>
                              <td className="py-4 px-2 font-sans">{sub.outsourcedSupplierName || 'Pending Appointment'}</td>
                              <td className="py-4 px-2 text-gray-400">{sub.outsourcedPoNumber || 'N/A'}</td>
                              <td className="py-4 px-2 text-brand-orange-500 font-bold">{sub.outsourcedBatchNo || 'TBD'}</td>
                              <td className="py-4 px-2">
                                {sub.outsourcedCertUrl ? (
                                  <a
                                    href={sub.outsourcedCertUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-green-400 hover:underline flex items-center gap-1 font-sans text-[11px]"
                                  >
                                    Conformity file <ExternalLink size={10} />
                                  </a>
                                ) : (
                                  <span className="text-yellow-500">Required</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-gray-500 font-sans">
                    No active outsourced components requiring second-supplier certification configured for this project.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CNC NESTING OPTIMIZER */}
        {activeTab === 'nesting' && currentItem && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="font-serif text-2xl font-bold text-white">CNC Bar Nesting Cut Optimizer</h3>
              <p className="text-xs text-gray-405 mt-1 border-b border-white/5 pb-2">
                Minimize feedstock waste. This algorithm uses continuous 1D Second-Order First-Fit Decreasing packing heuristics to maximize yield from standard raw bars.
              </p>
            </div>
            <NestingOptimizer item={currentItem} qtyMultiplier={currentSubProject?.qty || 1} />
          </div>
        )}

        {/* TAB 6: PRODUCTION GANTT SCHEDULER */}
        {activeTab === 'scheduler' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="font-serif text-2xl font-bold text-white">Production Scheduling Gantt Matrix</h3>
              <p className="text-xs text-gray-405 mt-1 border-b border-white/5 pb-2">
                Interactive real-time routing calendar tracking assembly pipelines, technician load factors, and process scheduling bottlenecks.
              </p>
            </div>
            <GanttScheduler 
              project={project} 
              allItems={allItems} 
              allUsers={allUsers} 
              onUpdateProject={onUpdateProject} 
            />
          </div>
        )}

        {/* TAB 7: ISO QUALITY & NCR COMPLIANCE */}
        {activeTab === 'compliance' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="font-serif text-2xl font-bold text-white">ISO 9001:2015 Clause 10.2 Deviation Register</h3>
              <p className="text-xs text-gray-405 mt-1 border-b border-white/5 pb-2">
                Quality logs, non-conformance reports (NCR), welder certification stamp tickets, and root-cause remedy tracking panels.
              </p>
            </div>
            <ComplianceRegister 
              project={project} 
              allItems={allItems} 
              allMaterials={allMaterials} 
              allUsers={allUsers} 
              onUpdateProject={onUpdateProject} 
            />
          </div>
        )}

      </div>

      {showTraveler && (
        <TravelerCard 
          project={project} 
          allItems={allItems} 
          allMaterials={allMaterials} 
          allUsers={allUsers} 
          onClose={() => setShowTraveler(false)} 
        />
      )}
    </div>
  );
}
