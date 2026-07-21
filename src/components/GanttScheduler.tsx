import React, { useState } from 'react';
import { Project, Item, User, SubProject, SubProjectProcess } from '../types';
import { Clock, Calendar, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';

interface GanttSchedulerProps {
  project: Project;
  allItems: Item[];
  allUsers: User[];
  onUpdateProject: (updatedProject: Project) => void;
}

export default function GanttScheduler({ project, allItems, allUsers, onUpdateProject }: GanttSchedulerProps) {
  const [selectedBar, setSelectedBar] = useState<{ subIdx: number; procIdx: number } | null>(null);

  // Core update of a routing sequence
  const handleToggleState = (subIdx: number, procIdx: number, stepStatus: SubProjectProcess['status']) => {
    const updatedSubProjects = [...(project?.subProjects || [])];
    const subProj = { ...updatedSubProjects[subIdx] };
    const procs = [...(subProj.processes || [])];
    const proc = { ...procs[procIdx] };

    const oldStatus = proc.status;
    proc.status = stepStatus;

    if (stepStatus === 'Completed' && oldStatus !== 'Completed') {
      proc.completionDate = new Date().toISOString().split('T')[0];
    } else if (stepStatus !== 'Completed') {
      proc.completionDate = undefined;
    }

    procs[procIdx] = proc;
    subProj.processes = procs;
    updatedSubProjects[subIdx] = subProj;

    onUpdateProject({
      ...project,
      subProjects: updatedSubProjects
    });
  };

  const handleUpdateAssignee = (subIdx: number, procIdx: number, userId: string) => {
    const updatedSubProjects = [...(project?.subProjects || [])];
    const subProj = { ...updatedSubProjects[subIdx] };
    const procs = [...(subProj.processes || [])];
    const proc = { ...procs[procIdx] };

    proc.assignedUserId = userId;
    procs[procIdx] = proc;
    subProj.processes = procs;
    updatedSubProjects[subIdx] = subProj;

    onUpdateProject({
      ...project,
      subProjects: updatedSubProjects
    });
  };

  // Identify team-wide bottlenecks: Find which operator is loaded with the most "In Progress" or "Pending" items
  const workloadAlerts = React.useMemo(() => {
    const userPendingHours: { [uid: string]: number } = {};
    
    (project?.subProjects || []).forEach((sub) => {
      const parentItem = allItems.find(i => i.id === sub.itemId);
      (sub.processes || []).forEach((p) => {
        if (p.status !== 'Completed' && p.assignedUserId) {
          const estimatedHours = (parentItem?.processes.find(itemProc => itemProc.sequence === p.sequence)?.estimatedHours || 1.5) * sub.qty;
          userPendingHours[p.assignedUserId] = (userPendingHours[p.assignedUserId] || 0) + estimatedHours;
        }
      });
    });

    const bottlenecks = Object.entries(userPendingHours)
      .filter(([_, hours]) => hours > 10) // 10+ hours of pending single-project fabrication represents a bottleneck
      .map(([uid, hours]) => {
        const u = allUsers.find(user => user.id === uid);
        return {
          userName: u ? u.name : 'Unknown Staff',
          hours: Math.round(hours)
        };
      });

    return bottlenecks;
  }, [project?.subProjects, allItems, allUsers]);

  return (
    <div className="space-y-6">
      {/* Bottleneck Alert Panel */}
      {workloadAlerts.length > 0 && (
        <div className="p-4 bg-[#b45309]/10 border border-yellow-500/20 text-yellow-500 flex items-start gap-3">
          <AlertTriangle className="shrink-0 mt-0.5 text-brand-orange-500" size={16} />
          <div className="space-y-1">
            <h5 className="font-bold text-xs uppercase tracking-wider text-brand-orange-400">Team Workload Bottleneck Alert</h5>
            <p className="text-[11px] text-gray-300">
              The following operators have highly accumulated structural fabrication estimates:
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              {workloadAlerts.map((b, idx) => (
                <span key={idx} className="text-[10px] font-mono bg-black/20 px-2 py-0.5 border border-white/5 font-bold">
                  {b.userName}: {b.hours} Hrs Allocated
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gantt / Project timeline Grid */}
      <div className="p-6 bg-black border border-white/5 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <h4 className="font-serif text-lg font-bold text-white flex items-center gap-2">
            <Clock size={16} className="text-brand-orange-500" />
            Continuous Fabrication Timeline Matrix (Gantt representation)
          </h4>
          <span className="text-[10px] font-mono text-gray-400 uppercase">Interactive sequencing schedule</span>
        </div>

        <div className="space-y-6 overflow-x-auto min-w-full">
          {(project?.subProjects || []).map((sub, sIdx) => {
            const item = allItems.find(i => i.id === sub.itemId);
            if (!item) return null;

            return (
              <div key={sIdx} className="space-y-2 pb-4 border-b border-white/5 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap justify-between items-center gap-1 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-brand-orange-500 font-bold">#{sIdx+1}</span>
                    <strong className="text-white uppercase font-bold text-[13px]">{item.name}</strong>
                    <span className="text-[10px] text-gray-500">[{item.itemCode}]</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Batch identifier: <strong className="text-gray-200">{sub.batchNo}</strong></span>
                </div>

                {/* Simulated horizontal timeline block */}
                <div className="relative mt-2 p-[2px] bg-white/5 border border-white/10 flex hover:border-white/15 transition-all h-12 overflow-hidden">
                  {(sub.processes || []).map((proc, pIdx) => {
                    const matchedUser = allUsers.find(u => u.id === proc.assignedUserId);
                    const estimatedHours = (item.processes.find(ip => ip.sequence === proc.sequence)?.estimatedHours || 1) * sub.qty;
                    
                    const isSelected = selectedBar?.subIdx === sIdx && selectedBar?.procIdx === pIdx;

                    let statusStyles = '';
                    switch (proc.status) {
                      case 'Completed':
                        statusStyles = 'bg-green-500/10 border-l-4 border-green-500 hover:bg-green-500/20 text-green-300';
                        break;
                      case 'In Progress':
                        statusStyles = 'bg-yellow-500/10 border-l-4 border-yellow-500 hover:bg-yellow-500/20 text-yellow-300';
                        break;
                      default:
                        statusStyles = 'bg-white/5 border-l-4 border-gray-600 hover:bg-white/10 text-gray-400';
                        break;
                    }

                    return (
                      <button
                        key={pIdx}
                        onClick={() => setSelectedBar({ subIdx: sIdx, procIdx: pIdx })}
                        className={`flex-grow h-full py-1.5 px-3 flex flex-col justify-between text-left text-xs transition-all border-r border-white/5 rounded-none outline-none select-none ${statusStyles} ${
                          isSelected ? 'ring-2 ring-brand-orange-500 bg-white/15 z-10' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center w-full font-mono font-bold text-[10px] uppercase tracking-wider">
                          <span className="truncate pr-1">Seq #{proc.sequence}: {proc.name}</span>
                          <span className="shrink-0">{estimatedHours}h</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] w-full text-gray-400 truncate text-left md:block">
                          <span>Staff: <strong>{matchedUser ? matchedUser.name : 'Unassigned'}</strong></span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline inspector quick controller card */}
      {selectedBar !== null && (
        (() => {
          const sub = (project?.subProjects || [])[selectedBar.subIdx];
          const proc = sub?.processes[selectedBar.procIdx];
          const item = sub ? allItems.find(i => i.id === sub.itemId) : null;
          
          if (!sub || !proc || !item) return null;

          return (
            <div className="p-5 bg-black border border-brand-orange-500/40 animate-scaleUp flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-bold tracking-widest text-[#D9823B] font-mono">
                  Gantt Matrix Editor: {item.name} &bull; Batch {sub.batchNo}
                </div>
                <h5 className="font-serif text-lg font-bold text-white">
                  Sequence #{proc.sequence}: <strong className="text-brand-orange-400">{proc.name}</strong>
                </h5>
                <p className="text-xs text-gray-400 font-mono">
                  Technician Trace-stamp: {allUsers.find(u => u.id === proc.assignedUserId)?.name || 'Unassigned'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider text-gray-500 block font-mono">Transition Status</label>
                  <div className="flex bg-[#0f0f0f] border border-white/10 p-1 gap-1">
                    {(['Pending', 'In Progress', 'Completed'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleToggleState(selectedBar.subIdx, selectedBar.procIdx, st)}
                        className={`text-[9px] px-2.5 py-1 uppercase tracking-widest font-mono font-bold transition-all border border-transparent ${
                          proc.status === st
                            ? 'bg-brand-orange-500 text-black'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider text-gray-500 block font-mono">Re-assign Technician</label>
                  <select
                    value={proc.assignedUserId || ''}
                    onChange={(e) => handleUpdateAssignee(selectedBar.subIdx, selectedBar.procIdx, e.target.value)}
                    className="bg-[#121212] border border-white/10 text-white font-mono uppercase text-[10px] p-2 outline-none focus:border-brand-orange-500 w-44"
                  >
                    <option value="">Choose technician...</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setSelectedBar(null)}
                  className="bg-black hover:bg-white/5 border border-white/15 text-gray-400 uppercase tracking-widest text-[9px] font-bold px-3 py-2.5 shrink-0 hover:text-white md:mt-4"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
