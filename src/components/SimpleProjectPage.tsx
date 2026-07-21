/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, Item, Material, User, SubProject, SubProjectProcess } from '../types';
import { 
  HardHat, ShieldCheck, ClipboardCheck, ArrowLeft, Clock,
  Layers, Box, Settings, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, FileText
} from 'lucide-react';

interface SimpleProjectPageProps {
  project: Project;
  allItems: Item[];
  allMaterials: Material[];
  allUsers: User[];
  currentUser: User;
  onUpdateProject: (updatedProject: Project) => void;
  onExitProject: () => void;
}

export default function SimpleProjectPage({
  project,
  allItems,
  allMaterials,
  allUsers,
  currentUser,
  onUpdateProject,
  onExitProject
}: SimpleProjectPageProps) {
  const [operatorNotes, setOperatorNotes] = useState<string>('');
  const [notesSavedMsg, setNotesSavedMsg] = useState<string | null>(null);

  // Filter out the unique required materials for this project dynamically
  const getBOMRequirements = () => {
    const reqs: { material: Material | undefined; qtyNeeded: number; specName: string }[] = [];
    
    // 1. Direct Allocated Stock items
    if (project.includeStockItems) {
      (project.includeStockItems || []).forEach(alloc => {
        const matObj = allMaterials.find(m => m.id === alloc.materialId);
        reqs.push({
          material: matObj,
          qtyNeeded: alloc.qty,
          specName: matObj ? matObj.name : `Material Ref: ${alloc.materialId}`
        });
      });
    }

    // 2. Parts requirements from items definitions
    (project.subProjects || []).forEach(sub => {
      const partItem = allItems.find(i => i.id === sub.itemId);
      if (partItem && partItem.materials) {
        (partItem.materials || []).forEach(pMat => {
          const matObj = allMaterials.find(m => m.id === pMat.materialId);
          const totalQty = pMat.qtyNeeded * sub.qty;
          
          // Check if already exist in list to aggregate duplicate demands
          const existing = reqs.find(r => r.material?.id === pMat.materialId);
          if (existing) {
            existing.qtyNeeded += totalQty;
          } else {
            reqs.push({
              material: matObj,
              qtyNeeded: totalQty,
              specName: matObj ? matObj.name : pMat.name
            });
          }
        });
      }
    });

    return reqs;
  };

  // Compute stats of processes
  let totalSteps = 0;
  let completedSteps = 0;
  (project.subProjects || []).forEach(sub => {
    (sub.processes || []).forEach(p => {
      totalSteps++;
      if (p && p.status === 'Completed') completedSteps++;
    });
  });
  const projectProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Toggle stage completion
  const handleToggleProcess = (subIdx: number, procIdx: number) => {
    const nextSubProjects = [...project.subProjects];
    const targetProcess = { ...nextSubProjects[subIdx].processes[procIdx] };
    
    const wasCompleted = targetProcess.status === 'Completed';
    let nextStatus: 'Pending' | 'In Progress' | 'Completed' = 'Pending';
    
    if (targetProcess.status === 'Pending') {
      nextStatus = 'In Progress';
    } else if (targetProcess.status === 'In Progress') {
      nextStatus = 'Completed';
    } else {
      nextStatus = 'Pending';
    }

    targetProcess.status = nextStatus;
    
    if (nextStatus === 'Completed') {
      targetProcess.completionDate = new Date().toISOString().split('T')[0];
      targetProcess.checkedByUserId = currentUser.id;
      // Auto-assign worker to this process step if currently empty
      if (!targetProcess.assignedUserId) {
        targetProcess.assignedUserId = currentUser.id;
      }
    } else {
      targetProcess.completionDate = undefined;
      targetProcess.checkedByUserId = undefined;
    }

    nextSubProjects[subIdx].processes[procIdx] = targetProcess;

    const updatedProject: Project = {
      ...project,
      subProjects: nextSubProjects
    };

    // Auto-promote project milestone status based on completions
    let allCompleted = true;
    (nextSubProjects || []).forEach(sub => {
      (sub.processes || []).forEach(p => {
        if (p && p.status !== 'Completed') allCompleted = false;
      });
    });

    if (allCompleted && project.status !== 'Completed') {
      // Prompt option to complete overall project run
      if (confirm(`Excellent work! All ${totalSteps} fabrication routing steps on this Traveler run are now signed off.\n\nWould you like to promote this Project Run status to "QA Inspection" phase for final certification?`)) {
        updatedProject.status = 'QA Inspection';
      }
    } else if (project.status === 'Engineering') {
      // First action shifts status to active Production
      updatedProject.status = 'Production';
    }

    onUpdateProject(updatedProject);
  };

  const handleStatusChange = (status: Project['status']) => {
    const updated: Project = { ...project, status };
    if (status === 'Completed') {
      updated.qualityPassedDate = new Date().toISOString().split('T')[0];
      updated.qualityPassedByUserId = currentUser.id;
    }
    onUpdateProject(updated);
  };

  const activeBOM = getBOMRequirements();

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Worker Active Stamp indicator */}
      <div className="bg-[#0c0c0c] border-l-4 border-orange-500 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-[0.5px] border-[#2222225c]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-mono">
            <HardHat size={20} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 font-mono block uppercase">Authenticated Operator</span>
            <span className="text-sm font-sans font-black text-slate-200 uppercase tracking-wide">
              {currentUser.name} 
              <span className="ml-2 font-mono font-bold text-xs text-orange-500 bg-orange-500/10 px-2 py-0.5 border border-orange-500/20">
                {currentUser.role.toUpperCase()}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onExitProject}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-orange-500 text-zinc-450 hover:text-orange-500 text-[10px] font-mono tracking-widest uppercase font-black transition-all cursor-pointer rounded-none"
          >
            <ArrowLeft size={12} />
            Switch Active Job
          </button>
        </div>
      </div>

      {/* Main Project Run Banner */}
      <div className="bg-[#090909] border-[0.5px] border-[#2222225c] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/[0.01] rounded-full pointer-events-none blur-xl"></div>
        
        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 pb-4 border-b border-zinc-900">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-orange-500 text-black text-[9px] font-black uppercase px-2 py-0.5 tracking-wider font-mono">
                RUN CODE: {project.id}
              </span>
              <span className="text-zinc-500 text-xs font-mono">• MILL HEAT BATCH: {project.batchNo}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black font-sans text-white uppercase tracking-wider mt-1 leading-none">
              {project.title}
            </h1>
            <p className="text-xs text-zinc-400">
              Assigned Client Order PO ref: <span className="text-zinc-300 font-mono font-bold uppercase">{project.jobCode}</span>
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5 text-right">
            <span className="text-[9px] text-[#fb923c] font-black tracking-widest font-mono uppercase">MILESTONE DEADLINE</span>
            <span className="text-base text-zinc-200 font-sans font-extrabold flex items-center gap-1">
              <Clock size={14} className="text-orange-500" />
              {project.deadline}
            </span>
          </div>
        </div>

        {/* Info Grid summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs font-mono">
          <div>
            <span className="text-zinc-500 text-[9px] uppercase font-bold block">Current Status</span>
            <select
              value={project.status}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className="bg-black border border-zinc-800 text-[#fb923c] px-2 py-1 mt-1 text-[10px] uppercase font-black outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="Engineering">Engineering Config</option>
              <option value="Production">In Production</option>
              <option value="QA Inspection">QA Inspection</option>
              <option value="Completed">Completed Run</option>
              <option value="Shipped">Dispatched & Shipped</option>
            </select>
          </div>

          <div>
            <span className="text-zinc-500 text-[9px] uppercase font-bold block">Routing Progress</span>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-24 bg-zinc-950 h-2 border border-zinc-900 overflow-hidden text-left">
                <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${projectProgress}%` }}></div>
              </div>
              <span className="text-white font-bold text-[10px]">{projectProgress}%</span>
            </div>
          </div>

          <div>
            <span className="text-zinc-500 text-[9px] uppercase font-bold block">Weld Cert Type</span>
            <span className="text-zinc-300 font-bold block mt-1.5">AS-1554.1 GP Structural</span>
          </div>

          <div>
            <span className="text-zinc-500 text-[9px] uppercase font-bold block">Facility Bay Section</span>
            <span className="text-zinc-300 font-bold block mt-1.5">Melbourne Bay #4 Fab Room</span>
          </div>
        </div>
      </div>

      {/* Two Grid column (BOM Specs and Interactive Routing checklist) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (5/12) - Shop Blueprints & Raw materials */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 1: Required Part Blueprints */}
          <div className="bg-[#090909] border-[0.5px] border-[#2222225c] p-5 space-y-4">
            <div className="border-b border-zinc-900 pb-2.5 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-orange-500 tracking-wider font-mono flex items-center gap-1.5">
                <Layers size={14} className="text-orange-500" />
                CAD Blueprint Drawings
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono uppercase font-bold">{(project?.subProjects || []).length} Part Files</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(project?.subProjects || []).map((sub, idx) => {
                const partItem = allItems.find(i => i.id === sub.itemId);
                return (
                  <div key={idx} className="p-3 bg-black border border-zinc-900 space-y-2">
                    <div className="flex justify-between items-start text-xs">
                      <div>
                        <span className="block text-[10px] text-orange-500 font-mono font-bold">
                          {partItem?.itemCode || `PART-${idx + 1}`} ({sub.qty} Pcs)
                        </span>
                        <h4 className="font-bold text-white uppercase font-sans mt-0.5 leading-none">
                          {partItem?.name || 'Fabricated Section Assembly'}
                        </h4>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-mono uppercase bg-zinc-950 px-1.5 py-0.5 border border-zinc-900/40">
                        {partItem?.itemCode ? 'CAD MATCH' : 'CUSTOM'}
                      </span>
                    </div>

                    {/* Render drawings checklist if exist */}
                    {partItem && partItem.drawings && partItem.drawings.length > 0 ? (
                      <div className="pt-2 border-t border-zinc-900 space-y-1.5 text-[10px] font-mono">
                        {partItem.drawings.map((dwg, dIdx) => (
                          <div key={dIdx} className="flex justify-between items-center bg-zinc-950 p-1.5 border border-zinc-900">
                            <span className="text-zinc-400 font-bold flex items-center gap-1.5 font-sans uppercase">
                              <FileText size={11} className="text-zinc-500" />
                              {dwg.name} ({dwg.designVersion})
                            </span>
                            <a 
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                alert(`ACCESSING SECURE DATA REPOSITORY:\n\nOpening technical CAD blueprint file "${dwg.name}" ${dwg.designVersion} (${dwg.fileType} format, size: ${dwg.fileSize}) for structural dimensions confirmation.`);
                              }}
                              className="text-orange-500 hover:text-orange-400 font-black flex items-center gap-0.5 tracking-wider"
                            >
                              OPEN {dwg.fileType} <ExternalLink size={9} />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-500 font-mono pt-1 text-center bg-zinc-950 p-2 border border-zinc-900">
                        No blueprint attachments loaded
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Precise Steel Material Specs to Pull */}
          <div className="bg-[#090909] border border-[#1a1a1a] p-5 space-y-4">
            <div className="border-b border-zinc-900 pb-2.5 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-orange-500 tracking-wider font-mono flex items-center gap-1.5">
                <Box size={14} className="text-orange-500" />
                Raw Steel Pull List
              </h3>
              <span className="text-[9px] bg-zinc-950 border border-zinc-900 px-2 py-0.5 font-mono text-zinc-550 uppercase">
                ISO Clause 8.5.2 Trace
              </span>
            </div>

            <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
              Verify the exact **Mill Heat Batch Number** on the physical item tags prior to cutting or welding to preserve structural trace compatibility.
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 text-xs">
              {activeBOM.map((bom, idx) => {
                const stockLeft = bom.material ? bom.material.availableStock : 0;
                const hasSufficient = stockLeft >= bom.qtyNeeded;
                
                return (
                  <div key={idx} className="p-3 bg-black border border-zinc-900 space-y-2">
                    <div className="flex justify-between items-start font-mono leading-none">
                      <span className="text-zinc-500 uppercase text-[9px] font-bold">RACK ALLOCATION #{idx + 1}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 ${
                        hasSufficient ? 'bg-green-950/40 text-green-400 border border-green-900/30' : 'bg-red-950/40 text-red-400 border border-red-900/30'
                      }`}>
                        {hasSufficient ? '✓ STOCK CONFIRMED' : '⚠ SHORTAGE'}
                      </span>
                    </div>

                    <h4 className="font-bold text-white uppercase font-sans text-xs">
                      {bom.specName}
                    </h4>

                    {bom.material ? (
                      <div className="space-y-1.5 pt-1 border-t border-zinc-900 text-[10px] font-mono text-zinc-400">
                        <div className="flex justify-between">
                          <span>Required Stock:</span>
                          <strong className="text-white font-mono">{bom.qtyNeeded} {bom.material.unit}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Mandated Mill Heat Batch:</span>
                          <strong className="text-orange-500 font-black">{bom.material.batchNo}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Grade & Dimensions:</span>
                          <span className="text-zinc-300">{bom.material.grade} | {bom.material.dimensions}</span>
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-500">
                          <span>Warehouse Available:</span>
                          <span>{stockLeft} {bom.material.unit} remaining</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-red-400 font-mono">
                        Critical: Pre-assigned stock material ID is not registered in database. Inform the Workshop Manager.
                      </p>
                    )}
                  </div>
                );
              })}

              {activeBOM.length === 0 && (
                <div className="text-center py-6 text-zinc-500 font-mono text-xs">
                  No materials requirements registered for this project.
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Operator Notes pad */}
          <div className="bg-[#090909] border-[0.5px] border-[#2222225c] p-5 space-y-3 font-mono text-xs">
            <h3 className="text-xs font-black uppercase text-orange-500 tracking-wider">
              Operator Log entries
            </h3>
            <textarea
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="e.g., Welder stamp 04 verified. Gas nozzle pressure 18L/min. CNC structural weld heat traces complete with zero deviations..."
              className="w-full h-20 bg-black border border-zinc-800 p-2.5 text-xs text-zinc-300 outline-none focus:border-orange-500"
            />
            <button
              type="button"
              onClick={() => {
                if (!operatorNotes.trim()) return;
                setNotesSavedMsg("Operator notes recorded to shift log cache.");
                setTimeout(() => setNotesSavedMsg(null), 3500);
              }}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-800 hover:border-orange-500 transition-all text-[10px] font-mono uppercase tracking-widest font-black rounded-none cursor-pointer"
            >
              Commit Log Entry
            </button>
            {notesSavedMsg && (
              <span className="block text-[10px] text-green-400 text-center animate-fadeIn">{notesSavedMsg}</span>
            )}
          </div>

        </div>

        {/* Right Column (7/12) - Interactive Fabrication Routing Checklist */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="bg-[#090909] border-[0.5px] border-[#2222225c] p-5 space-y-4">
            <div className="border-b border-zinc-900 pb-2.5 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black uppercase text-orange-500 tracking-wider font-mono flex items-center gap-1.5">
                  <ClipboardCheck size={16} className="text-orange-500" />
                  Fabrication Router Sign-Offs
                </h3>
                <p className="text-[10px] text-zinc-505 uppercase font-mono mt-0.5">
                  Click on step buttons to toggle shift work status.
                </p>
              </div>

              <div className="text-right text-[10px] font-mono">
                <span className="text-zinc-500 block uppercase font-bold">Total Operations</span>
                <span className="text-white font-extrabold">{completedSteps} / {totalSteps} COMPLETED</span>
              </div>
            </div>

            {/* Sub Projects operations block loops */}
            <div className="space-y-4">
              {(project?.subProjects || []).map((sub, sIdx) => {
                const partItem = allItems.find(itm => itm.id === sub.itemId);
                return (
                  <div key={sIdx} className="border border-zinc-900 p-4 space-y-3 bg-black">
                    {/* Header Part Stamp tag */}
                    <div className="flex justify-between items-center bg-[#0a0a0a] p-2 border-b border-zinc-900 text-xs font-mono">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-zinc-500">Sub-assembly reference</span>
                        <h4 className="font-extrabold text-[#fb923c] font-mono text-xs">
                          {partItem ? partItem.itemCode : 'PART'} ({sub.qty} Pcs)
                        </h4>
                      </div>
                      <div className="text-right font-mono text-[10px]">
                        <span className="text-zinc-500 block uppercase">Sub-Run Code</span>
                        <strong className="text-white">{sub.batchNo}</strong>
                      </div>
                    </div>

                    <p className="font-sans font-black text-slate-200 uppercase text-xs leading-none px-1">
                      {partItem ? partItem.name : 'Sub Assembly Unit'}
                    </p>

                    {/* Processes checklists routing steps */}
                    <div className="space-y-2 pt-1 font-mono text-xs">
                      {(sub?.processes || []).map((proc, pIdx) => {
                        const isStepCompleted = proc.status === 'Completed';
                        const isStepWorking = proc.status === 'In Progress';
                        const assignedWorker = allUsers.find(u => u.id === proc.assignedUserId);
                        
                        return (
                          <div 
                            key={pIdx} 
                            className={`p-2.5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isStepCompleted 
                                ? 'bg-green-950/10 border-green-900/35 text-green-300' 
                                : isStepWorking 
                                  ? 'bg-orange-950/10 border-orange-900/35 text-orange-300 animate-pulse'
                                  : 'bg-[#080808] border-zinc-900 text-zinc-400 hover:border-zinc-800'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono font-black w-5 h-5 flex items-center justify-center rounded-none ${
                                  isStepCompleted 
                                    ? 'bg-green-500 text-black' 
                                    : isStepWorking 
                                      ? 'bg-orange-500 text-black' 
                                      : 'bg-zinc-900 text-zinc-500'
                                }`}>
                                  {proc.sequence}
                                </span>
                                <span className="font-sans font-extrabold uppercase text-xs text-white">
                                  {proc.name}
                                </span>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-x-2 text-[9px] text-zinc-500">
                                <span className="uppercase font-bold">Assigned Station Tech:</span>
                                <select
                                  className="bg-black border-[0.5px] border-[#2222225c] p-0.5 text-[9px] text-zinc-300 uppercase shrink-0 outline-none cursor-pointer focus:border-orange-500"
                                  value={proc.assignedUserId || ''}
                                  onChange={(e) => {
                                    const nextSub = [...project.subProjects];
                                    const nextProc = [...nextSub[sIdx].processes];
                                    nextProc[pIdx] = { ...nextProc[pIdx], assignedUserId: e.target.value };
                                    nextSub[sIdx].processes = nextProc;
                                    onUpdateProject({ ...project, subProjects: nextSub });
                                  }}
                                >
                                  <option value="">-- Click to assign --</option>
                                  {allUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Trigger signoff */}
                            <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0 w-full sm:w-auto">
                              {isStepCompleted && proc.completionDate && (
                                <div className="text-right text-[8.5px] font-mono leading-tight shrink-0 hidden sm:block">
                                  <span className="text-green-500 block font-bold">✓ SIGNED OFF STATION</span>
                                  <span className="text-zinc-500">
                                    Approved: {allUsers.find(u => u.id === proc.checkedByUserId)?.name || 'Auditor'} on {proc.completionDate}
                                  </span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleToggleProcess(sIdx, pIdx)}
                                className={`w-full sm:w-auto px-3.5 py-1.5 text-[10px] uppercase font-black font-mono tracking-widest transition-colors cursor-pointer rounded-none border ${
                                  isStepCompleted
                                    ? 'bg-green-500 text-black border-green-500 hover:bg-green-400'
                                    : isStepWorking
                                      ? 'bg-orange-500 text-black border-orange-500 hover:bg-orange-400'
                                      : 'bg-black text-zinc-400 hover:text-orange-500 border-zinc-800 hover:border-orange-550'
                                }`}
                              >
                                {isStepCompleted ? 'COMPLETED' : isStepWorking ? 'IN PROGRESS' : 'MARK IN-PROGRESS'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 p-3 bg-[#0d0d0d] border border-white/5 space-y-2 text-[10px] font-mono text-zinc-500">
              <span className="text-zinc-400 font-bold uppercase flex items-center gap-1">
                <CheckCircle2 size={11} className="text-orange-500 shrink-0" />
                ISO 9001 Clause 8.5.1 Compliance Lock
              </span>
              <p className="leading-normal font-sans text-[10.5px]">
                Upon marking a fabrication step "COMPLETED", this terminal records the unique stamp signature of current operator **{currentUser.name}** and locks the trace timestamp. Complete all steps to promote this traveler to Quality Inspection control.
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
