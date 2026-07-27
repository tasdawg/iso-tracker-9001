/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, Item, Material, Client, User, SubProject, SubProjectProcess } from '../types';
import { generateBatchCode, generateNextProjectId, generateNextId } from '../utils';
import { Plus, Trash2, ShieldAlert, Package, Calendar, Briefcase, PlusCircle, Check } from 'lucide-react';

interface ProjectFormProps {
  projects: Project[];
  allItems: Item[];
  allMaterials: Material[];
  allClients: Client[];
  currentUser: User;
  onCancel: () => void;
  onSubmit: (newProject: Project, updatedMaterials: Material[]) => void;
}

export default function ProjectForm({
  projects,
  allItems,
  allMaterials,
  allClients,
  currentUser,
  onCancel,
  onSubmit
}: ProjectFormProps) {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [jobCode, setJobCode] = useState('');
  const [deadline, setDeadline] = useState('');
  const [customBatch, setCustomBatch] = useState(() => generateBatchCode('ISO-B'));

  // Multiple item selection state
  const [selectedItems, setSelectedItems] = useState<{ itemId: string; qty: number }[]>([]);

  // Materials allocation sub-state
  const [allocatedMaterials, setAllocatedMaterials] = useState<{
    materialId: string;
    qtyToAllocate: number;
  }[]>([]);

  // Helpers for multiple item selection
  const handleAddItemRow = () => {
    setSelectedItems([...selectedItems, { itemId: '', qty: 1 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, itemId: string) => {
    const updated = [...selectedItems];
    updated[idx].itemId = itemId;
    setSelectedItems(updated);
  };

  const handleItemQtyChange = (idx: number, qty: number) => {
    const updated = [...selectedItems];
    updated[idx].qty = Math.max(1, qty);
    setSelectedItems(updated);
  };

  // Helpers for materials allocation
  const handleAddMaterialRow = () => {
    // defaults to first available material
    if (allMaterials.length > 0) {
      setAllocatedMaterials([
        ...allocatedMaterials,
        { materialId: allMaterials[0].id, qtyToAllocate: 1 }
      ]);
    }
  };

  const handleRemoveMaterialRow = (idx: number) => {
    setAllocatedMaterials(allocatedMaterials.filter((_, i) => i !== idx));
  };

  const handleMaterialChange = (idx: number, matId: string) => {
    const updated = [...allocatedMaterials];
    updated[idx].materialId = matId;
    setAllocatedMaterials(updated);
  };

  const handleMaterialQtyChange = (idx: number, qty: number) => {
    const updated = [...allocatedMaterials];
    updated[idx].qtyToAllocate = Math.max(0.1, qty);
    setAllocatedMaterials(updated);
  };

  const handleFormSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !clientId || selectedItems.length === 0 || !deadline) {
      alert("Please complete all required fields (Job Title, Client, at least one Item, and Deadline).");
      return;
    }

    // Validate all selected items exist
    const validItems = selectedItems.filter(s => s.itemId && allItems.find(i => i.id === s.itemId));
    if (validItems.length === 0) {
      alert("Please select at least one valid item template.");
      return;
    }

    // 1. Compile Subprojects hierarchy from all selected items
    const subProjects: SubProject[] = [];

    validItems.forEach(({ itemId, qty }) => {
      const selectedItemTemplate = allItems.find(i => i.id === itemId);
      if (!selectedItemTemplate) return;

      // Add primary item itself as a subproject manufacture job
      const primaryProcesses: SubProjectProcess[] = (selectedItemTemplate.processes || []).map(p => ({
        name: p.name,
        sequence: p.sequence,
        assignedUserId: '', // Unassigned initially
        status: 'Pending'
      }));

      subProjects.push({
        itemId: selectedItemTemplate.id,
        qty: qty,
        batchNo: generateBatchCode('SUB-B'),
        processes: primaryProcesses,
        isOutsourced: false
      });

      // If the template item has nested constituent items, automatically import them!
      if (selectedItemTemplate.subItems && selectedItemTemplate.subItems.length > 0) {
        selectedItemTemplate.subItems.forEach(sub => {
          const subItemTemplate = allItems.find(i => i.id === sub.childItemId);
          if (subItemTemplate) {
            const subItemProcesses: SubProjectProcess[] = (subItemTemplate.processes || []).map(p => ({
              name: p.name,
              sequence: p.sequence,
              assignedUserId: '',
              status: 'Pending'
            }));

            subProjects.push({
              itemId: sub.childItemId,
              qty: sub.qty * qty, // nested item multiplier
              batchNo: generateBatchCode('SUB-B'),
              processes: subItemProcesses,
              isOutsourced: false
            });
          }
        });
      }
    });

    // 2. Prep Allocated Stocks and modify active physical materials quantities
    const updatedMaterials = [...allMaterials];
    const includeStockItems: Project['includeStockItems'] = [];

    for (const alloc of allocatedMaterials) {
      const matIdx = updatedMaterials.findIndex(m => m.id === alloc.materialId);
      if (matIdx !== -1) {
        const mat = updatedMaterials[matIdx];
        if (mat.availableStock < alloc.qtyToAllocate) {
          alert(`Warning: Requested to allocate ${alloc.qtyToAllocate} units of ${mat.name}, but only ${mat.availableStock} is currently available in the warehouse physical stack. Proceeding with negative allocation under strict supervisor sign-off.`);
        }

        // Reserve stock
        const updatedAllocated = mat.allocatedStock + alloc.qtyToAllocate;
        const updatedAvailable = mat.totalStock - updatedAllocated;

        updatedMaterials[matIdx] = {
          ...mat,
          allocatedStock: updatedAllocated,
          availableStock: updatedAvailable
        };

        includeStockItems.push({
          materialId: alloc.materialId,
          qty: alloc.qtyToAllocate,
          batchNoUsed: mat.batchNo, // traces down exact roll batch code of physical plate/tubing!
          invoiceNoUsed: mat.invoiceNo // Logs the invoice number of the material (e.g. 75243006)
        });
      }
    }

    // 3. Assemble final Project payload
    const newProjectId = generateNextProjectId(projects);
    const newProject: Project = {
      id: newProjectId,
      title,
      clientId,
      jobCode: jobCode || 'M-PO-' + Math.floor(1000 + Math.random() * 9000),
      status: 'Production',
      batchNo: customBatch,
      dateCreated: new Date().toISOString().split('T')[0],
      deadline,
      subProjects,
      includeStockItems,
      qualityCertGenerated: false,
      notVisible: 0
    };

    // Trigger transactional log for stock allocation
    try {
      const logs = JSON.parse(localStorage.getItem('iso_logs_v1') || '[]');
      let currentLogIds = logs.map((l: any) => l.id);
      allocatedMaterials.forEach(alloc => {
        const mat = allMaterials.find(m => m.id === alloc.materialId);
        const nextId = generateNextId('LOG', currentLogIds);
        currentLogIds.unshift(nextId);
        const newLogEntry = {
          id: nextId,
          type: 'ALLOCATION' as const,
          date: new Date().toISOString().replace(/\.\d+Z/, ''),
          materialId: alloc.materialId,
          materialName: mat ? mat.name : 'Structural Item',
          quantity: alloc.qtyToAllocate,
          batchNo: mat ? mat.batchNo : 'TBD-ROLL',
          invoiceNo: mat ? mat.invoiceNo : undefined,
          projectCode: newProjectId,
          userId: currentUser.id,
          notes: `Automatic stock allocation checked out by supervisor during project compilation.`
        };
        logs.unshift(newLogEntry);
      });
      localStorage.setItem('iso_logs_v1', JSON.stringify(logs));
    } catch (e) {
      console.error(e);
    }

    onSubmit(newProject, updatedMaterials);
  };

  return (
    <div className="max-w-4xl mx-auto bg-[#1a1a1a] p-8 md:p-10 border border-brand-orange-500/30 text-white animate-fadeIn rounded-none">
      
      {/* Form Header */}
      <div className="pb-6 border-b border-white/5 mb-8 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-[0.45em] text-brand-orange-500 font-bold block mb-1">
            ISO 9001 QUALITY PORTAL
          </span>
          <h3 className="font-serif font-extrabold text-3xl text-white leading-tight">
            Register New Production Job
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-white uppercase tracking-wider font-bold"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleFormSubmission} className="space-y-8">
        
        {/* Core details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-widest font-bold text-gray-300">
              Job Title / Project Name <span className="text-brand-orange-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Heavy Duty Structural Scaffold Rigging"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-black border border-white/10 p-4 text-white focus:border-brand-orange-500 outline-none rounded-none text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-widest font-bold text-gray-300">
              Assign to Client / Customer Code <span className="text-brand-orange-500">*</span>
            </label>
            <select
              required
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="w-full bg-black border border-white/10 p-4 text-white focus:border-brand-orange-500 outline-none rounded-none text-sm"
            >
              <option value="">Select Customer profile...</option>
              {allClients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-widest font-bold text-gray-300">
              Client Reference / Purchase Order Code
            </label>
            <input
              type="text"
              placeholder="e.g. APX-PO-9020"
              value={jobCode}
              onChange={e => setJobCode(e.target.value)}
              className="w-full bg-black border border-white/10 p-4 text-white focus:border-brand-orange-500 outline-none rounded-none text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-widest font-bold text-gray-300">
              Delivery Deadline <span className="text-brand-orange-500">*</span>
            </label>
            <input
              type="date"
              required
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full bg-black border border-white/10 p-4 text-white focus:border-brand-orange-500 outline-none rounded-none text-sm font-mono"
            />
          </div>

        </div>

        {/* Division Line */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest">
            <span className="bg-[#1a1a1a] px-4 font-bold text-brand-orange-500">
              Part Assembly Template
            </span>
          </div>
        </div>

        {/* Multiple Item Selection & Quantities */}
        <div className="bg-black/40 p-5 border border-white/5 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-white/10">
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-gray-300">
                Select Items for This Project <span className="text-brand-orange-500">*</span>
              </label>
              <p className="text-[10px] text-gray-400 mt-0.5">Add one or more item templates with quantities. Nested sub-items auto-import.</p>
            </div>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="bg-black border border-brand-orange-500 text-brand-orange-500 hover:bg-brand-orange-500 hover:text-black py-1.5 px-3 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1"
            >
              <Plus size={12} /> Add Item
            </button>
          </div>

          {selectedItems.length === 0 ? (
            <div className="text-center py-4 border border-dashed border-white/10 bg-black/20 text-gray-500 text-xs">
              No items selected. Click "Add Item" to begin.
            </div>
          ) : (
            <div className="space-y-2">
              {selectedItems.map((row, rIdx) => {
                const currentItem = allItems.find(i => i.id === row.itemId);
                return (
                  <div key={rIdx} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center bg-black p-3 border border-white/5">
                    <select
                      value={row.itemId}
                      onChange={e => handleItemChange(rIdx, e.target.value)}
                      className="w-full bg-black border border-white/5 p-2 text-xs text-white outline-none focus:border-brand-orange-500"
                    >
                      <option value="">Select item...</option>
                      {allItems.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.itemCode})</option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        value={row.qty}
                        onChange={e => handleItemQtyChange(rIdx, parseInt(e.target.value) || 1)}
                        className="w-20 bg-black border border-white/5 p-2 text-xs text-right font-mono text-white outline-none focus:border-brand-orange-500"
                      />
                      <span className="text-[10px] text-gray-400">pcs</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(rIdx)}
                      disabled={selectedItems.length === 1}
                      className="p-1.5 text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}

              {/* Import preview for all selected items */}
              {selectedItems.filter(s => s.itemId).length > 0 && (
                <div className="pt-3 border-t border-white/5 text-[10px] text-gray-400 space-y-1">
                  <div className="font-bold text-brand-orange-400 uppercase tracking-widest pb-1">Auto-import Summary:</div>
                  {selectedItems.filter(s => s.itemId).map((row, idx) => {
                    const item = allItems.find(i => i.id === row.itemId);
                    if (!item) return null;
                    return (
                      <div key={idx} className="flex justify-between items-center">
                        <span>{item.name} ({item.itemCode}) × {row.qty}</span>
                        <span className="text-gray-500">
                          {item.processes.length} steps
                          {item.subItems?.length > 0 && ` + ${item.subItems.length} nested`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Division Line */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest">
            <span className="bg-[#1a1a1a] px-4 font-bold text-brand-orange-500">
              Warehouse Stock Checkout (Traceability Allocation)
            </span>
          </div>
        </div>

        {/* Materials allocation */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-400 max-w-xl">
              Lock the physical steel raw stock sections required for this fabrication stream. Allocating steel immediately reserves inventory and attaches mill batch codes to the production route sheet for audit verification.
            </p>
            <button
              type="button"
              onClick={handleAddMaterialRow}
              className="bg-black border border-brand-orange-500 text-brand-orange-500 hover:bg-brand-orange-500 hover:text-black py-2 px-4 text-xs font-bold uppercase tracking-widest transition-all"
            >
              Add Steel Stock
            </button>
          </div>

          {allocatedMaterials.length > 0 ? (
            <div className="space-y-2">
              {allocatedMaterials.map((row, rIdx) => {
                const currentMat = allMaterials.find(m => m.id === row.materialId);

                return (
                  <div key={rIdx} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-black p-4 border border-white/10 items-center">
                    
                    {/* Material select */}
                    <div className="md:col-span-7">
                      <select
                        value={row.materialId}
                        onChange={e => handleMaterialChange(rIdx, e.target.value)}
                        className="w-full bg-black border border-white/5 p-2.5 text-white text-xs outline-none focus:border-brand-orange-500"
                      >
                        {allMaterials.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.grade} - Avail: {m.availableStock} {m.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity field */}
                    <div className="md:col-span-3 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={row.qtyToAllocate}
                        onChange={e => handleMaterialQtyChange(rIdx, parseFloat(e.target.value) || 0)}
                        className="w-full bg-black border border-white/5 p-2 text-white text-xs text-right font-mono"
                      />
                      <span className="text-xs text-brand-orange-400 font-bold">{currentMat?.unit || 'Unit'}</span>
                    </div>

                    {/* Delete action */}
                    <div className="md:col-span-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterialRow(rIdx)}
                        className="text-red-500 hover:text-red-400 p-2"
                        title="Remove allocation"
                      >
                        <Trash2 size={16} className="mx-auto" />
                      </button>
                    </div>

                    {/* Tracer Details preview */}
                    {currentMat && (
                      <div className="md:col-span-12 flex justify-between items-center text-[10px] uppercase font-mono text-gray-500 border-t border-white/5 pt-2 mt-1">
                        <span>Original Mill Roll Batch: <strong className="text-gray-300">{currentMat.batchNo}</strong></span>
                        <span>Millcert reference: <strong className="text-green-500 underline">Attached</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-white/10 bg-black/20 text-gray-500 text-xs text-sans">
              No structural steel stock allocated. Use "Add Steel Stock" above if physical tracking is needed.
            </div>
          )}
        </div>

        {/* Division Line */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest">
            <span className="bg-[#1a1a1a] px-4 font-bold text-brand-orange-500">
              Our Assigned Manufacturer Batch code
            </span>
          </div>
        </div>

        {/* Custom internal batch input */}
        <div className="bg-black p-6 border border-white/5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-1">
              <label className="block text-xs uppercase tracking-widest font-bold text-gray-300">
                Primary Tracker Code (ISO 9001 Batch Code)
              </label>
              <input
                type="text"
                required
                value={customBatch}
                onChange={e => setCustomBatch(e.target.value)}
                className="w-full bg-black border border-white/10 p-3 text-white focus:border-brand-orange-500 outline-none rounded-none text-sm font-mono font-bold"
              />
            </div>
            <div className="text-xs text-gray-400 leading-relaxed font-sans">
              This acts as the primary quality audit trail for the entire contract. Once completed, all sub-assembly parts, technician sign-offs, and welder certificates will bind irrevocably to this identifier.
            </div>
          </div>
        </div>

        {/* Warning Badge */}
        <div className="p-4 bg-orange-500/5 border border-brand-orange-500/20 text-xs text-gray-300 flex gap-2 items-start font-sans">
          <ShieldAlert className="text-brand-orange-500 shrink-0" size={16} />
          <div>
            <strong>Compliance Check:</strong> Click "Generate Unique Production Run" only if material certs are available on file. This registers a legal fabrication trail under the name of <strong>{currentUser.name}</strong> ({currentUser.role}).
          </div>
        </div>

        {/* Form CTA Buttons */}
        <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={onCancel}
            className="bg-black border border-white/10 text-gray-400 uppercase tracking-widest text-[11px] font-bold px-8 py-4 hover:text-white rounded-none transition-colors"
          >
            Cancel Portal
          </button>
          
          <button
            type="submit"
            className="bg-brand-orange-500 text-black font-bold uppercase tracking-widest text-[11px] px-8 py-4 hover:bg-brand-orange-400 rounded-none transition-colors"
          >
            Generate Unique Production Run
          </button>
        </div>

      </form>
    </div>
  );
}
