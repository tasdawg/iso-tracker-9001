import React from 'react';
import { Project, Item, Material, User } from '../types';
import { Printer, X, Eye, FileText, Check } from 'lucide-react';

interface TravelerCardProps {
  project: Project;
  allItems: Item[];
  allMaterials: Material[];
  allUsers: User[];
  onClose: () => void;
}

export default function TravelerCard({ project, allItems, allMaterials, allUsers, onClose }: TravelerCardProps) {
  
  // Custom print handler triggering native browser print overlay
  const handleNativePrint = () => {
    window.print();
  };

  // Safe client information loader
  const clients = (() => {
    try {
      const saved = localStorage.getItem('iso_clients_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })();

  const client = clients.find((c: any) => c.id === project.clientId) || {
    name: 'Unknown Client PO',
    companyName: 'Corporate Fabrication Client',
    address: 'Adelaide Regional Distribution Hub',
    phone: '+61 8 8211 4000'
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-start overflow-y-auto p-4 z-50 animate-fadeIn print:bg-white print:p-0 print:absolute print:inset-0">
      
      {/* Container Card */}
      <div className="w-full max-w-4xl bg-[#141414] border border-white/10 p-6 md:p-10 my-8 shadow-2xl space-y-8 print:bg-white print:text-black print:border-0 print:p-0 print:my-0 print:shadow-none print:w-full">
        
        {/* TOP BAR ACTIONS (Hidden during print) */}
        <div className="flex justify-between items-center bg-[#090909] p-4 border border-white/5 print:hidden">
          <div className="flex items-center gap-2">
            <Printer size={16} className="text-brand-orange-500" />
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">
              ISO 9001 Manufacturing Traveler Card Printer Preview
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleNativePrint}
              className="bg-brand-orange-500 hover:bg-brand-orange-400 text-black text-xs font-bold uppercase tracking-widest px-4 py-2 flex items-center gap-2 transition-colors"
            >
              <Printer size={14} /> Send to Printer
            </button>
            <button
              onClick={onClose}
              className="bg-black hover:bg-white/5 border border-white/10 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest px-4 py-2 flex items-center gap-2 transition-colors"
            >
              <X size={14} /> Close
            </button>
          </div>
        </div>

        {/* PRINTABLE COMPONENT */}
        <div className="p-8 bg-white text-black border border-gray-300 font-sans space-y-6 print:border-0 print:p-0">
          
          {/* Main ISO Header Header block */}
          <div className="border-2 border-black p-4 flex flex-col md:flex-row justify-between items-stretch gap-4">
            <div className="flex flex-col justify-between text-left space-y-1">
              <h1 className="font-serif text-2xl font-black uppercase tracking-tight text-black leading-none">
                FABRICATION TRAVELER CARD
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-gray-700">
                INDUSTRIAL BATCH ROUTE RECORDS &ndash; ISO 9001:2015 AUDITING
              </p>
              <div className="text-[11px] font-mono pt-1 text-gray-600">
                Control Code: QA-TRK-REV3A &bull; Verified Quality Assurance System
              </div>
            </div>

            {/* Simulated barcode graphic */}
            <div className="flex flex-col items-center justify-center p-2 border border-black max-w-[200px] shrink-0 font-mono">
              <div className="h-10 w-full flex items-end gap-[1.5px] bg-white px-2">
                <span className="h-full bg-black w-[4px]"></span>
                <span className="h-full bg-black w-[1px]"></span>
                <span className="h-full bg-black w-[2px]"></span>
                <span className="h-full bg-black w-[3px]"></span>
                <span className="h-full bg-black w-[1px]"></span>
                <span className="h-full bg-black w-[4px]"></span>
                <span className="h-full bg-black w-[2px]"></span>
                <span className="h-full bg-black w-[1px]"></span>
                <span className="h-full bg-black w-[3px]"></span>
                <span className="h-full bg-black w-[2px]"></span>
                <span className="h-full bg-black w-[4px]"></span>
              </div>
              <span className="text-[8px] font-bold mt-1 text-black font-semibold h-4 tracking-[0.2em]">*{project.batchNo}*</span>
            </div>
          </div>

          {/* Project & Client metadata grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-black pb-4 text-xs">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block font-bold">Client / PO Target</span>
              <strong className="text-black text-sm">{client.name}</strong>
              <div className="text-[10px] text-gray-650">{client.companyName}</div>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block font-bold">Trace Batch Num</span>
              <strong className="text-black text-sm font-mono text-brand-orange-600">{project.batchNo}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block font-bold">Project deadline</span>
              <strong className="text-black text-sm font-mono">{project.deadline}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block font-bold">Date Dispatch</span>
              <strong className="text-black text-sm font-mono h-4 border-b border-gray-400 block min-w-[80px]"></strong>
            </div>
          </div>

          {/* Subassemblies description listing */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-left bg-black text-white p-1 px-2">
              TARGET ASSEMBLY DETAILS & NESTED BILL OF QUANTITIES
            </h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-black font-bold font-mono text-[10px]">
                  <th className="py-2">Item Part Code</th>
                  <th className="py-2">Part Assembly Name</th>
                  <th className="py-2">Origin Batch No</th>
                  <th className="py-2 text-right">Job Target Qty</th>
                </tr>
              </thead>
              <tbody>
                {(project?.subProjects || []).map((sub, sIdx) => {
                  const item = allItems.find(i => i.id === sub.itemId);
                  return (
                    <tr key={sIdx} className="border-b border-gray-300">
                      <td className="py-2 font-mono font-bold">{item?.itemCode || 'TBD'}</td>
                      <td className="py-2 font-semibold">{item?.name || 'Unknown part'}</td>
                      <td className="py-2 font-mono">{sub.batchNo}</td>
                      <td className="py-2 text-right font-mono font-bold text-sm">{sub.qty} units</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Core fabrication checklist sequence with actual signoff lines and PHYSICAL STAMP CIRCLES */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-left bg-black text-white p-1 px-2">
              FABRICATION SEQUENTIAL SIGN-OFF & TRACKING SHEET (SHOP FLOOR OPERATIONS)
            </h3>
            
            <div className="border border-black overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-black font-bold font-mono text-[9px] uppercase">
                    <th className="p-2 border-r border-black w-8 text-center">Seq</th>
                    <th className="p-2 border-r border-black w-48">Operations & Standards</th>
                    <th className="p-2 border-r border-black w-24 text-center text-[8px]">Est Hours</th>
                    <th className="p-2 border-r border-black w-36">Technician Name</th>
                    <th className="p-2 border-r border-black w-32">Date Completed</th>
                    <th className="p-2 w-32 text-center">Inspector Stamp</th>
                  </tr>
                </thead>
                <tbody>
                  {(project?.subProjects?.[0]?.processes || []).map((proc, pIdx) => {
                    const assignedUser = allUsers.find(u => u.id === proc.assignedUserId);
                    const checkerUser = allUsers.find(u => u.id === proc.checkedByUserId);
                    return (
                      <tr key={pIdx} className="border-b border-black last:border-b-0 h-16">
                        <td className="p-2 border-r border-black font-mono font-bold text-center bg-gray-50">{proc.sequence}</td>
                        <td className="p-2 border-r border-black">
                          <strong className="text-black uppercase text-[11px] block leading-tight">{proc.name}</strong>
                          <span className="text-[9px] text-gray-500 font-mono block mt-0.5">QC Verification mandated</span>
                        </td>
                        <td className="p-2 border-r border-black text-center font-mono font-bold text-sm bg-gray-50">
                          {((1.5 * (project?.subProjects?.[0]?.qty || 1))).toFixed(1)}
                        </td>
                        <td className="p-2 border-r border-black font-sans font-medium text-black">
                          {proc.status === 'Completed' ? (
                            <div className="leading-tight">
                              <span className="font-bold">{assignedUser?.name}</span>
                              <span className="text-[8.5px] text-gray-600 block leading-none mt-0.5">Role: {assignedUser?.role}</span>
                            </div>
                          ) : (
                            <span className="text-gray-300 font-serif italic text-[11px]">Write name...</span>
                          )}
                        </td>
                        <td className="p-2 border-r border-black font-mono text-black font-bold">
                          {proc.status === 'Completed' ? (
                            <span className="flex items-center gap-1 font-mono text-[11px] text-green-700">
                              ✓ {proc.completionDate}
                            </span>
                          ) : (
                            <span className="text-gray-300 font-bold font-mono">DD / MM / YYYY</span>
                          )}
                        </td>
                        <td className="p-1 text-center flex items-center justify-center h-full">
                          {proc.status === 'Completed' ? (
                            <div className="border-[1.5px] border-red-600 rounded-full w-12 h-12 flex flex-col justify-center items-center text-[7px] text-red-600 uppercase font-black uppercase tracking-tighter leading-none select-none font-sans transform rotate-6 border-double">
                              <span>PASSED</span>
                              <span className="font-bold text-[6px]">QA-OFFICER</span>
                              <span className="font-mono text-[7px]">{checkerUser ? checkerUser.id : 'AS-10'}</span>
                            </div>
                          ) : (
                            <div className="border border-dashed border-gray-400 rounded-full w-12 h-12 flex flex-col justify-center items-center text-[7px] text-gray-300 font-serif select-none leading-none">
                              <span>STAMP</span>
                              <span>CIRCLE</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trace materials allocations block */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-left bg-black text-white p-1 px-2">
              ALLOCATED RAW HEAVY STEEL TRACE (ISO 9001 MILL CERTIFICATE ATTACHMENTS)
            </h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-black font-bold font-mono text-[9px] uppercase">
                  <th className="py-1">Material Description</th>
                  <th className="py-1">Material Grade</th>
                  <th className="py-1">Dimensions / Sizes</th>
                  <th className="py-1 text-right">Mill Heat / Batch Trace No</th>
                </tr>
              </thead>
              <tbody>
                {(project?.includeStockItems || []).map((stk, idx) => {
                  const m = (allMaterials || []).find(mat => mat?.id === stk?.materialId);
                  return (
                    <tr key={idx} className="border-b border-gray-300">
                      <td className="py-1.5 font-bold font-sans text-black">
                        {m ? m.name : 'Heavy RHS/Plate Steel'}
                        {(stk?.invoiceNoUsed || m?.invoiceNo) && (
                          <span className="block text-[9px] text-gray-500 font-mono font-normal mt-0.5">
                            Supplier Inv: #{stk?.invoiceNoUsed || m?.invoiceNo}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 font-mono text-gray-750">{m?.grade || 'Grade 350'}</td>
                      <td className="py-1.5 font-mono text-gray-750">{m?.dimensions || 'N/A'}</td>
                      <td className="py-1.5 text-right font-mono font-bold text-red-700">{stk?.batchNoUsed}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Technical Compliance Stamp bottom block */}
          <div className="border border-black p-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 text-[10px] font-mono leading-tight">
            <div>
              <span className="font-bold block text-black text-[9px] uppercase font-sans mb-1">OPERATIONAL INDUCTION WARNING:</span>
              Ensure welding machines match standard procedures (WPS) SP1.1. Confirm material batch numbers stamped onto raw plate structures match this routing traveler sheet before commencing grinding or drilling.
            </div>
            
            <div className="border-l border-r border-black px-4 flex flex-col justify-between">
              <div>
                <span className="font-bold block text-black text-[9px] uppercase font-sans">CONFORMANCE AUDIT DECLARATION:</span>
                I hereby declare that the fabrication steps have been completed and verified as satisfactory in complete accordance with drawings, specifications, and welding standards.
              </div>
              <div className="pt-2 border-t border-gray-300 font-bold block text-black mt-2">
                Inspector Stamp ID: _________________
              </div>
            </div>

            <div className="flex flex-col items-center justify-center text-center">
              <div className="border-2 border-black border-dashed p-4 w-44 h-20 flex flex-col items-center justify-center text-[10px] text-gray-400">
                <span className="font-serif">FINAL ISO RELEASE</span>
                <span className="font-sans font-bold text-gray-500 uppercase mt-1">QA SEAL STAMP</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
