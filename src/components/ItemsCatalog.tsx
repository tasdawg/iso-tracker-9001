/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Item, Material, Drawing, ProcessTemplate, CutListItem, SubItemRelation, Station } from '../types';
import { generateNextItemId } from '../utils';
import { Search, Plus, Trash2, ShieldAlert, FileText, Share2, Layers, CheckSquare, PlusCircle, Paperclip } from 'lucide-react';

interface ItemsCatalogProps {
  items: Item[];
  allMaterials: Material[];
  stations: Station[];
  currentUser: { name: string };
  onUpdateItems: (updatedItems: Item[]) => void;
}

export default function ItemsCatalog({
  items,
  allMaterials,
  stations,
  currentUser,
  onUpdateItems
}: ItemsCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<Item | null>(null);
  const [testQuantity, setTestQuantity] = useState<number>(1);

  const getFullMaterialRequirements = (item: Item): { materialId: string; name: string; qtyNeeded: number }[] => {
    const requirementsMap = new Map<string, { materialId: string; name: string; qtyNeeded: number }>();
    
    // Add materials from the item itself
    (item.materials || []).forEach(m => {
      const existing = requirementsMap.get(m.materialId);
      if (existing) {
        existing.qtyNeeded += m.qtyNeeded;
      } else {
        requirementsMap.set(m.materialId, { ...m });
      }
    });

    // Add materials from nested sub items (parts) recursively
    const processSubItems = (subItemsList: SubItemRelation[], multiplier: number) => {
      (subItemsList || []).forEach(sub => {
        const child = items.find(itm => itm.id === sub.childItemId);
        if (child) {
          // Add child item's own materials
          (child.materials || []).forEach(childMat => {
            const qtyNeeded = childMat.qtyNeeded * sub.qty * multiplier;
            const existing = requirementsMap.get(childMat.materialId);
            if (existing) {
              existing.qtyNeeded += qtyNeeded;
            } else {
              requirementsMap.set(childMat.materialId, {
                materialId: childMat.materialId,
                name: childMat.name,
                qtyNeeded
              });
            }
          });
          // Recurse into child's subItems if any
          if (child.subItems && child.subItems.length > 0) {
            processSubItems(child.subItems, sub.qty * multiplier);
          }
        }
      });
    };

    processSubItems(item.subItems || [], 1);
    return Array.from(requirementsMap.values());
  };

  const checkItemStockStatus = (item: Item, qtyMultiplier: number = 1) => {
    let isMissing = false;
    let isInsufficient = false;
    
    const requirements = getFullMaterialRequirements(item);
    
    const componentCheck = requirements.map(req => {
      const m = allMaterials.find(mat => mat.id === req.materialId);
      if (!m) {
        isMissing = true;
        return {
          id: req.materialId,
          name: req.name || 'Structural Component',
          qtyNeeded: req.qtyNeeded,
          available: 0,
          required: req.qtyNeeded * qtyMultiplier,
          shortfall: req.qtyNeeded * qtyMultiplier,
          status: 'MISSING' as const,
          unit: 'Units',
          supplier: req.name?.toLowerCase().includes('devo') ? 'Queensland Metal Spinners' : 'External Tech Vendor'
        };
      }
      
      const requiredAmount = req.qtyNeeded * qtyMultiplier;
      const availableAmount = m.availableStock;
      const isShort = availableAmount < requiredAmount;
      if (isShort) {
        isInsufficient = true;
      }
      
      return {
        id: req.materialId,
        name: m.name,
        qtyNeeded: req.qtyNeeded,
        available: availableAmount,
        required: requiredAmount,
        shortfall: isShort ? requiredAmount - availableAmount : 0,
        status: (isShort ? 'INSUFFICIENT' : 'AVAILABLE') as 'INSUFFICIENT' | 'AVAILABLE',
        unit: m.unit,
        supplier: m.supplier
      };
    });

    let overallStatus: 'OK' | 'ORDER_NEEDED' | 'CRITICAL_MISSING' = 'OK';
    if (isMissing) {
      overallStatus = 'CRITICAL_MISSING';
    } else if (isInsufficient) {
      overallStatus = 'ORDER_NEEDED';
    }

    return {
      overallStatus,
      components: componentCheck
    };
  };

  // Form states
  const [name, setName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [description, setDescription] = useState('');
  
  // Dynamic materials required list
  const [materialsReq, setMaterialsReq] = useState<{ materialId: string; qty: number }[]>([]);
  // Row-level supplier filtering options for the material dropdowns
  const [rowSupplierFilters, setRowSupplierFilters] = useState<Record<number, string>>({});
  // Dynamic sequence of processes
  const [processesReq, setProcessesReq] = useState<{ name: string; estimatedHours: number }[]>([]);
  
  // Process dropdown presets derived from active work stations
  const stationProcessPresets = stations.map(s => s.name);
  const [customPresets, setCustomPresets] = useState<string[]>([]);
  const processPresets = [...stationProcessPresets, ...customPresets];
  const [newPresetVal, setNewPresetVal] = useState('');

  const handleAddNewPreset = () => {
    const trimmed = newPresetVal.trim();
    if (trimmed && !processPresets.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      setCustomPresets([...customPresets, trimmed]);
      setNewPresetVal('');
    }
  };
  // Dynamic metal cut list
  const [cutListReq, setCutListReq] = useState<{
    type: CutListItem['type'];
    description: string;
    size: string;
    lengthMm: number;
    qty: number;
  }[]>([]);
  // Drawings
  const [drawingsReq, setDrawingsReq] = useState<{ name: string; fileType: 'DXF' | 'PDF' | 'DWG'; fileSize: string; designVersion: string }[]>([]);
  // Nested child sub-items
  const [subItemsReq, setSubItemsReq] = useState<{ childItemId: string; qty: number }[]>([]);

  // Helpers to add/remove dynamic fields in form
  const handleAddMaterial = () => {
    if (allMaterials.length > 0) {
      setMaterialsReq([...materialsReq, { materialId: allMaterials[0].id, qty: 1 }]);
    }
  };
  const handleRemoveMaterial = (idx: number) => {
    setMaterialsReq(materialsReq.filter((_, i) => i !== idx));
    const newFilters = { ...rowSupplierFilters };
    delete newFilters[idx];
    setRowSupplierFilters(newFilters);
  };
  const handleMatFieldChange = (idx: number, field: 'materialId' | 'qty', val: string | number) => {
    const updated = [...materialsReq];
    if (field === 'materialId') updated[idx].materialId = val as string;
    if (field === 'qty') updated[idx].qty = Math.max(0.1, val as number);
    setMaterialsReq(updated);
  };
  const handleRowSupplierChange = (idx: number, supplier: string) => {
    const newFilters = { ...rowSupplierFilters, [idx]: supplier };
    setRowSupplierFilters(newFilters);
    const matches = allMaterials.filter(m => !supplier || supplier === 'ALL' || m.supplier === supplier);
    if (matches.length > 0) {
      handleMatFieldChange(idx, 'materialId', matches[0].id);
    }
  };

  const handleAddProcess = () => {
    setProcessesReq([...processesReq, { name: stations[0]?.name || '', estimatedHours: 1.0 }]);
  };
  const handleRemoveProcess = (idx: number) => {
    setProcessesReq(processesReq.filter((_, i) => i !== idx));
  };
  const handleProcFieldChange = (idx: number, field: 'name' | 'estimatedHours', val: string | number) => {
    const updated = [...processesReq];
    if (field === 'name') updated[idx].name = val as string;
    if (field === 'estimatedHours') updated[idx].estimatedHours = Math.max(0.1, val as number);
    setProcessesReq(updated);
  };

  const handleAddCutList = () => {
    setCutListReq([...cutListReq, { type: 'RHS', description: 'Main Frame Strut', size: '100x50x4', lengthMm: 1200, qty: 2 }]);
  };
  const handleRemoveCutList = (idx: number) => {
    setCutListReq(cutListReq.filter((_, i) => i !== idx));
  };
  const handleCutFieldChange = (idx: number, field: keyof typeof cutListReq[0], val: any) => {
    const updated = [...cutListReq];
    (updated[idx] as any)[field] = val;
    setCutListReq(updated);
  };

  const handleAddDrawing = () => {
    setDrawingsReq([...drawingsReq, { name: 'CHASSIS-SECTION.dxf', fileType: 'DXF', fileSize: '1.2 MB', designVersion: 'Rev A' }]);
  };
  const handleRemoveDrawing = (idx: number) => {
    setDrawingsReq(drawingsReq.filter((_, i) => i !== idx));
  };
  const handleDwgFieldChange = (idx: number, field: keyof typeof drawingsReq[0], val: any) => {
    const updated = [...drawingsReq];
    (updated[idx] as any)[field] = val;
    setDrawingsReq(updated);
  };

  const handleAddSubItem = () => {
    const availChildren = items.filter(i => i.id !== selectedItemForDetails?.id);
    if (availChildren.length > 0) {
      setSubItemsReq([...subItemsReq, { childItemId: availChildren[0].id, qty: 1 }]);
    }
  };
  const handleRemoveSubItem = (idx: number) => {
    setSubItemsReq(subItemsReq.filter((_, i) => i !== idx));
  };
  const handleSubItemFieldChange = (idx: number, field: 'childItemId' | 'qty', val: any) => {
    const updated = [...subItemsReq];
    if (field === 'childItemId') updated[idx].childItemId = val as string;
    if (field === 'qty') updated[idx].qty = Math.max(1, val as number);
    setSubItemsReq(updated);
  };

  // Submit new template
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !itemCode || !description) {
      alert("Please fill in main details (Name, Code, and Description) to register structural item blueprint.");
      return;
    }

    const newItemId = generateNextItemId(items);
    
    // Assemble structured Item
    const compileProcesses: ProcessTemplate[] = processesReq.map((p, idx) => ({
      name: p.name,
      estimatedHours: p.estimatedHours,
      sequence: idx + 1
    }));

    const compileMaterials = materialsReq.map(mr => ({
      materialId: mr.materialId,
      name: allMaterials.find(m => m.id === mr.materialId)?.name || 'Raw material',
      qtyNeeded: mr.qty
    }));

    const compileDrawings: Drawing[] = drawingsReq.map(dr => ({
      name: dr.name,
      fileType: dr.fileType,
      fileSize: dr.fileSize,
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: currentUser.name,
      designVersion: dr.designVersion
    }));

    const newItem: Item = {
      id: newItemId,
      name,
      itemCode: itemCode.toUpperCase(),
      description,
      materials: compileMaterials,
      cutList: cutListReq,
      processes: compileProcesses,
      drawings: compileDrawings,
      subItems: subItemsReq,
      dateCreated: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name
    };

    onUpdateItems([...items, newItem]);
    
    // Reset forms
    setShowAddForm(false);
    setName('');
    setItemCode('');
    setDescription('');
    setMaterialsReq([]);
    setProcessesReq([]);
    setCutListReq([]);
    setDrawingsReq([]);
    setSubItemsReq([]);
  };

  const handleDeleteItemTemplate = (id: string, name: string) => {
    if (items.length <= 1) {
      alert("Cannot delete template: at least one standard blueprint item is required for system routing operations.");
      return;
    }
    if (confirm(`Do you want to purge: ${name} from design catalogs? This won't affect active printed projects but removes the pattern.`)) {
      onUpdateItems(items.filter(i => i.id !== id));
      if (selectedItemForDetails?.id === id) {
        setSelectedItemForDetails(null);
      }
    }
  };

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.itemCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const uniqueSuppliers = Array.from(new Set(allMaterials.map(m => m.supplier).filter(Boolean))).sort();

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto px-4 py-6">
      
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <span className="text-[10px] uppercase tracking-[0.45em] text-brand-orange-500 font-bold block mb-1">
            QUALIFIED DESIGN SPECIFICATION CATALOG
          </span>
          <h2 className="font-serif font-extrabold text-3xl md:text-5xl text-white tracking-tight">
            CAD Assembly Templates
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Manufactured blueprints index. Design nested assemblies, specify metal mill requirements, write CAD cut-lists and mount DXF files.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedItemForDetails(null);
            setShowAddForm(!showAddForm);
          }}
          className="bg-brand-orange-500 hover:bg-brand-orange-400 text-black py-3 px-6 text-xs uppercase font-bold tracking-widest rounded-none transition-colors"
        >
          {showAddForm ? 'View Catalog Database' : 'Design New Component Blueprint'}
        </button>
      </div>

      {showAddForm ? (
        /* CREATE ITEM FORM */
        <div className="max-w-4xl mx-auto bg-[#1a1a1a] p-8 md:p-10 border border-brand-orange-500/30 text-white space-y-8">
          <div className="pb-4 border-b border-white/5">
            <h3 className="font-serif text-xl font-bold">Standard Assembly Blueprint Modeler</h3>
            <p className="text-xs text-gray-400 mt-1">Write production instructions and link CAD files to create a traceable component template.</p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="md:col-span-2 space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-300">Assembly Name / Part Title <span className="text-brand-orange-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Telescopic Bracket Main Arm"
                  className="w-full bg-black border border-white/10 p-4 text-xs text-white uppercase focus:border-brand-orange-500 outline-none"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-300">Unique Part Code (Item Code) <span className="text-brand-orange-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ARM-884-X"
                  className="w-full bg-black border border-white/10 p-4 text-xs text-white uppercase focus:border-brand-orange-500 outline-none font-mono font-bold"
                  value={itemCode}
                  onChange={e => setItemCode(e.target.value)}
                />
              </div>

              <div className="md:col-span-3 space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-300">Engineering Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Primary telescopic link welded base. Designed to sustain 12 ton tensile loads."
                  className="w-full bg-black border border-white/10 p-4 text-xs text-white focus:border-brand-orange-500 outline-none"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* NESTED SUB-ITEMS */}
            <div className="bg-black p-6 border border-white/5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h4 className="text-xs uppercase tracking-widest font-bold text-brand-orange-500 flex items-center gap-1">
                  <Layers size={14} /> Nest Child Parts (Sub-Assemblies)
                </h4>
                <button
                  type="button"
                  onClick={handleAddSubItem}
                  disabled={items.length === 0}
                  className="text-[10px] text-brand-orange-400 hover:underline uppercase font-bold tracking-wider"
                >
                  + Add Nested Part
                </button>
              </div>

              {subItemsReq.length > 0 ? (
                <div className="space-y-2">
                  {subItemsReq.map((row, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <select
                        value={row.childItemId}
                        onChange={e => handleSubItemFieldChange(idx, 'childItemId', e.target.value)}
                        className="flex-1 bg-black border border-white/10 p-3 text-xs text-white"
                      >
                        {items.map(i => (
                          <option key={i.id} value={i.id}>{i.name} ({i.itemCode})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={row.qty}
                        onChange={e => handleSubItemFieldChange(idx, 'qty', parseInt(e.target.value) || 1)}
                        className="w-24 bg-black border border-white/10 p-3 text-xs text-center font-mono text-white"
                        placeholder="Qty"
                      />
                      <button type="button" onClick={() => handleRemoveSubItem(idx)} className="text-red-500 p-2 hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 text-center py-2">
                  No nested sub-assemblies selected. This represents a single piece mechanical element.
                </p>
              )}
            </div>

            {/* RAW MATERIAL BILL OF QUANTITIES */}
            <div className="bg-black p-6 border border-white/5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h4 className="text-xs uppercase tracking-widest font-bold text-brand-orange-500">
                  Standard Material requirements
                </h4>
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="text-[10px] text-brand-orange-400 hover:underline uppercase font-bold tracking-wider"
                >
                  + Add Material Spec
                </button>
              </div>

              {materialsReq.length > 0 ? (
                <div className="space-y-3">
                  {materialsReq.map((row, idx) => {
                    const rowMat = allMaterials.find(m => m.id === row.materialId);
                    const rowSupplier = rowSupplierFilters[idx] !== undefined ? rowSupplierFilters[idx] : (rowMat ? rowMat.supplier : 'ALL');
                    const filteredRowMats = allMaterials.filter(m => rowSupplier === 'ALL' || m.supplier === rowSupplier);
                    
                    return (
                      <div key={idx} className="flex flex-col md:flex-row gap-3 items-stretch md:items-center bg-[#090909] p-3 border border-white/5 relative">
                        {/* Supplier Filter dropdown */}
                        <div className="w-full md:w-1/4">
                          <label className="block text-[8px] uppercase tracking-widest text-zinc-500 font-bold mb-1 font-mono">Supplier Filter</label>
                          <select
                            value={rowSupplier}
                            onChange={e => handleRowSupplierChange(idx, e.target.value)}
                            className="w-full bg-black border border-white/10 p-2.5 text-xs text-white"
                          >
                            <option value="ALL">-- ALL SUPPLIERS --</option>
                            {uniqueSuppliers.map(sup => (
                              <option key={sup} value={sup}>{sup}</option>
                            ))}
                          </select>
                        </div>

                        {/* Material selection dropdown */}
                        <div className="flex-1 w-full">
                          <label className="block text-[8px] uppercase tracking-widest text-[#f97316] font-bold mb-1 font-mono">Material Spec & Invoice Trace</label>
                          <select
                            value={filteredRowMats.some(m => m.id === row.materialId) ? row.materialId : (filteredRowMats[0]?.id || '')}
                            onChange={e => handleMatFieldChange(idx, 'materialId', e.target.value)}
                            className="w-full bg-black border border-white/10 p-2.5 text-xs text-white"
                          >
                            {filteredRowMats.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.grade}){m.invoiceNo ? ` [Inv: ${m.invoiceNo}]` : ''}{m.price ? ` ($${m.price.toFixed(2)}/ea)` : ''} | Stock: {m.availableStock}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity required input */}
                        <div className="w-full md:w-24">
                          <label className="block text-[8px] uppercase tracking-widest text-zinc-500 font-bold mb-1 font-mono">Qty req</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={row.qty}
                            onChange={e => handleMatFieldChange(idx, 'qty', parseFloat(e.target.value) || 1)}
                            className="w-full bg-black border border-white/10 p-2.5 text-xs text-center font-mono text-white"
                          />
                        </div>

                        {/* Delete button */}
                        <div className="flex items-center justify-end md:pt-4">
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(idx)}
                            className="text-red-500 p-2 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 text-center py-2">No raw materials listed.</p>
              )}
            </div>

            {/* STEEL PROFILE CUT LIST CONFIG */}
            <div className="bg-black p-6 border border-white/5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h4 className="text-xs uppercase tracking-widest font-bold text-brand-orange-500">
                  Steel cutting sheets (RHS/SHS/Plate detailed Cuts)
                </h4>
                <button
                  type="button"
                  onClick={handleAddCutList}
                  className="text-[10px] text-brand-orange-400 hover:underline uppercase font-bold tracking-wider"
                >
                  + Add Cut Item Row
                </button>
              </div>

              {cutListReq.length > 0 ? (
                <div className="space-y-3">
                  {cutListReq.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 bg-[#090909] p-3 border border-white/5 items-center">
                      <select
                        value={row.type}
                        onChange={e => handleCutFieldChange(idx, 'type', e.target.value)}
                        className="bg-black border border-white/10 p-2 text-xs text-white"
                      >
                        <option value="RHS">RHS Section</option>
                        <option value="SHS">SHS Section</option>
                        <option value="CHS">CHS Tube</option>
                        <option value="Plate">Plate Sheet</option>
                        <option value="Flat Bar">Flat Bar</option>
                        <option value="Other">Other Plate</option>
                      </select>
                      
                      <input
                        type="text"
                        placeholder="Description (e.g. Crossbar)"
                        value={row.description}
                        onChange={e => handleCutFieldChange(idx, 'description', e.target.value)}
                        className="bg-black border border-white/10 p-2 text-xs text-white"
                      />

                      <input
                        type="text"
                        placeholder="Size (100x50x4)"
                        value={row.size}
                        onChange={e => handleCutFieldChange(idx, 'size', e.target.value)}
                        className="bg-black border border-white/10 p-2 text-xs text-white font-mono"
                      />

                      <input
                        type="number"
                        placeholder="Length (mm)"
                        value={row.lengthMm}
                        onChange={e => handleCutFieldChange(idx, 'lengthMm', parseInt(e.target.value) || 0)}
                        className="bg-black border border-white/10 p-2 text-xs text-white text-right font-mono"
                      />

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Count"
                          value={row.qty}
                          onChange={e => handleCutFieldChange(idx, 'qty', parseInt(e.target.value) || 1)}
                          className="w-16 bg-black border border-white/10 p-2 text-xs text-center font-mono text-white"
                        />
                        <button type="button" onClick={() => handleRemoveCutList(idx)} className="text-red-500 hover:text-red-400 p-1 block mx-auto">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 text-center py-2">No custom cut-lists registered.</p>
              )}
            </div>

            {/* PROCESS STAGES CHECKLIST DESIGN */}
            <div className="bg-black p-6 border border-white/5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h4 className="text-xs uppercase tracking-widest font-bold text-brand-orange-500">
                  Step-by-step Fabrication sequence Routing
                </h4>
                <button
                  type="button"
                  onClick={handleAddProcess}
                  className="text-[10px] text-brand-orange-400 hover:underline uppercase font-bold tracking-wider"
                >
                  + Append fabrication sequence
                </button>
              </div>

              {/* Add New Preset Panel */}
              <div className="bg-[#0f0f0f] p-3 border border-white/5 flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Presets:</span>
                  <div className="flex flex-wrap gap-1 max-w-[450px]">
                    {processPresets.slice(0, 6).map(p => (
                      <span key={p} className="text-[9px] bg-white/5 text-gray-300 px-1.5 py-0.5 border border-white/10">{p}</span>
                    ))}
                    {processPresets.length > 6 && <span className="text-[9px] text-gray-500 font-sans">+{processPresets.length - 6} more</span>}
                  </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder="New custom preset..."
                    value={newPresetVal}
                    onChange={e => setNewPresetVal(e.target.value)}
                    className="bg-black border border-white/10 p-1.5 px-3 text-xs text-white outline-none focus:border-brand-orange-500 w-full md:w-44 uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewPreset}
                    className="bg-brand-orange-500 hover:bg-brand-orange-400 text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 transition-colors shrink-0"
                  >
                    + Add Preset
                  </button>
                </div>
              </div>

              {processesReq.length > 0 ? (
                <div className="space-y-2">
                  {processesReq.map((row, idx) => (
                    <div key={idx} className="flex gap-3 items-center bg-[#0d0d0d] p-3 border border-white/5 font-mono">
                      <span className="font-bold text-xs text-brand-orange-500 w-6 text-center">#{idx + 1}</span>
                      
                      <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        {/* Dropdown list for presets */}
                        <select
                          value={processPresets.some(preset => row.name.startsWith(preset)) 
                            ? processPresets.find(preset => row.name.startsWith(preset)) 
                            : 'CUSTOM'}
                          onChange={e => {
                            const val = e.target.value;
                            if (val !== 'CUSTOM') {
                              // Automatically fill or set to standard preset
                              handleProcFieldChange(idx, 'name', val);
                            } else {
                              // Set to empty custom
                              handleProcFieldChange(idx, 'name', '');
                            }
                          }}
                          className="bg-black border border-white/10 p-2 text-xs text-white outline-none focus:border-brand-orange-500 max-w-full sm:max-w-[200px]"
                        >
                          {processPresets.map(preset => (
                            <option key={preset} value={preset}>{preset}</option>
                          ))}
                          <option value="CUSTOM">-- Custom Name --</option>
                        </select>

                        {/* Text input to refine or custom write */}
                        <input
                          type="text"
                          value={row.name}
                          placeholder="e.g. Detailed cutting/prep"
                          onChange={e => handleProcFieldChange(idx, 'name', e.target.value)}
                          className="flex-1 bg-black border border-white/10 p-2 text-xs text-white outline-none focus:border-brand-orange-500"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.5"
                          min="0.1"
                          value={row.estimatedHours}
                          onChange={e => handleProcFieldChange(idx, 'estimatedHours', parseFloat(e.target.value) || 1)}
                          className="w-16 bg-black border border-white/10 p-2 text-xs text-center text-white font-mono"
                        />
                        <span className="text-[10px] text-gray-400 font-sans font-medium">Hrs</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveProcess(idx)} className="text-red-500 p-2 hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 text-center py-2">No custom sequence specified.</p>
              )}
            </div>

            {/* DRAWING FILES MOCK LOG */}
            <div className="bg-black p-6 border border-white/5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h4 className="text-xs uppercase tracking-widest font-bold text-brand-orange-500">
                  Engineering CAD & Drawing Attachments (PDF/DXF)
                </h4>
                <button
                  type="button"
                  onClick={handleAddDrawing}
                  className="text-[10px] text-brand-orange-400 hover:underline uppercase font-bold tracking-wider"
                >
                  + Attach CAD Drawing
                </button>
              </div>

              {drawingsReq.length > 0 ? (
                <div className="space-y-2">
                  {drawingsReq.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-[#090909] p-3 border border-white/5 items-center">
                      <input
                        type="text"
                        placeholder="File name (e.g. FRAME-A3.pdf)"
                        value={row.name}
                        onChange={e => handleDwgFieldChange(idx, 'name', e.target.value)}
                        className="bg-black border border-white/10 p-2 text-xs text-white"
                      />
                      <select
                        value={row.fileType}
                        onChange={e => handleDwgFieldChange(idx, 'fileType', e.target.value)}
                        className="bg-black border border-white/10 p-2 text-xs text-white font-mono"
                      >
                        <option value="DXF">DXF (CAD file)</option>
                        <option value="PDF">PDF (Drawing file)</option>
                        <option value="DWG">DWG (Drawing file)</option>
                      </select>
                      <input
                        type="text"
                        placeholder="File size (e.g. 1.2 MB)"
                        value={row.fileSize}
                        onChange={e => handleDwgFieldChange(idx, 'fileSize', e.target.value)}
                        className="bg-black border border-white/10 p-2 text-xs text-white font-mono"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Revision version"
                          value={row.designVersion}
                          onChange={e => handleDwgFieldChange(idx, 'designVersion', e.target.value)}
                          className="bg-black border border-white/10 p-2 text-xs text-center font-mono text-white flex-1"
                        />
                        <button type="button" onClick={() => handleRemoveDrawing(idx)} className="text-red-500 hover:text-red-400 p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 text-center py-2">No attachments selected for this blueprint.</p>
              )}
            </div>

            <div className="p-4 bg-black/40 border border-[#C8620A]/10 text-[10px] text-gray-400 flex items-center gap-2">
              <ShieldAlert className="text-brand-orange-500 shrink-0" size={14} />
              <span>Checking CAD drawings ensures compliance under the ISO-9001 quality catalog. Save template below.</span>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-black border border-white/10 uppercase tracking-widest text-[10px] px-6 py-3 hover:text-white"
              >
                Discard Form
              </button>
              <button
                type="submit"
                className="bg-brand-orange-500 hover:bg-brand-orange-400 text-black uppercase tracking-widest text-[10px] font-bold px-8 py-3"
              >
                Compile Part Blueprint Model
              </button>
            </div>
          </form>
        </div>
      ) : selectedItemForDetails ? (
        /* DETAIL BLUEPRINT VIEW */
        <div className="bg-[#1a1a1a] p-8 border border-white/10 text-white space-y-8 animate-fadeIn">
          <div className="flex justify-between items-start border-b border-white/5 pb-4">
            <div>
              <button
                onClick={() => setSelectedItemForDetails(null)}
                className="text-brand-orange-500 hover:underline text-xs uppercase tracking-widest font-bold block mb-2"
              >
                &larr; Back to Catalog Index
              </button>
              <h3 className="font-serif font-black text-2xl md:text-3xl text-white">
                {selectedItemForDetails.name}
              </h3>
              <p className="text-xs font-mono text-gray-400 mt-1">
                Standard Item Code: <span className="text-brand-orange-400 font-bold">{selectedItemForDetails.itemCode}</span> &bull; Blueprint Date: {selectedItemForDetails.dateCreated}
              </p>
            </div>

            <button
              onClick={() => handleDeleteItemTemplate(selectedItemForDetails.id, selectedItemForDetails.name)}
              className="border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-black py-2 px-4 uppercase text-xs tracking-wider"
            >
              Purge catalog Item
            </button>
          </div>

          <p className="text-sm text-gray-300 leading-relaxed font-sans">{selectedItemForDetails.description}</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
            
            {/* Cut list details */}
            <div className="p-6 bg-black border border-white/5 space-y-4">
              <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-brand-orange-500 pb-2 border-b border-white/10 flex justify-between items-center">
                <span>CAD Cut-Sheets (Physical dimensions)</span>
                <FileText size={14} />
              </h4>
              
              {selectedItemForDetails.cutList && selectedItemForDetails.cutList.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {selectedItemForDetails.cutList.map((cut, cIdx) => (
                    <div key={cIdx} className="p-3 bg-[#0d0d0d] border border-white/5 flex justify-between items-center font-mono text-xs">
                      <div>
                        <div className="font-sans font-bold text-white uppercase">{cut.description}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">Shape style: {cut.type} &bull; Dim size: {cut.size}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-brand-orange-400 font-bold">{cut.lengthMm} mm</div>
                        <div className="text-[10px] text-gray-400 font-sans">Qty: {cut.qty} cuts</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-gray-500 font-mono">No specific cut sheet lines for this item.</div>
              )}
            </div>

            {/* Processes sequence */}
            <div className="p-6 bg-black border border-white/5 space-y-4">
              <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-brand-orange-500 pb-2 border-b border-white/10">
                Fabrication Routing sequences
              </h4>
              
              {selectedItemForDetails.processes && selectedItemForDetails.processes.length > 0 ? (
                <div className="space-y-2">
                  {selectedItemForDetails.processes.map((proc, pIdx) => (
                    <div key={pIdx} className="p-3 bg-[#0d0d0d] border border-white/5 flex gap-3 items-center text-xs font-mono">
                      <span className="text-brand-orange-500 font-bold">Seq #{proc.sequence}</span>
                      <div className="flex-1 font-sans text-white uppercase font-medium">{proc.name}</div>
                      <span className="text-gray-400">{proc.estimatedHours} Hrs Est.</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-gray-500 font-mono">No routing sheet sequences found.</div>
              )}
            </div>

            {/* Drawing Attachments mock details link */}
            <div className="p-6 bg-black border border-white/5 space-y-4 lg:col-span-2">
              <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-brand-orange-500 pb-2 border-b border-white/10 flex justify-between items-center">
                <span>Attached Blueprint drawings (Joined automatically in active projects)</span>
                <Paperclip size={14} />
              </h4>
              
              {selectedItemForDetails.drawings && selectedItemForDetails.drawings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedItemForDetails.drawings.map((draw, dIdx) => (
                    <div key={dIdx} className="p-4 bg-[#0a0a0a] border border-white/10 font-mono text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white truncate max-w-[200px]">{draw.name}</div>
                        <div className="text-[10px] text-gray-500 mt-1 uppercase font-sans">
                          {draw.fileType} file &bull; Size: {draw.fileSize} &bull; ver: <strong className="text-brand-orange-400">{draw.designVersion}</strong>
                        </div>
                      </div>
                      <span className="text-[10px] text-[#D9823B] bg-brand-orange-500/10 border border-[#C8620A]/20 px-2.5 py-1 uppercase font-bold font-sans">
                        ATTACHED
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-gray-500 font-sans">No drawing attachments located.</div>
              )}
            </div>

            {/* CONSTITUENT PARTS & SUB-ASSEMBLIES (PARTS THAT LIVE INSIDE THE ITEM) */}
            {selectedItemForDetails.subItems && selectedItemForDetails.subItems.length > 0 && (
              <div className="p-6 bg-[#030303] border border-brand-orange-500/20 space-y-4 lg:col-span-2 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange-500/5 blur-2xl rounded-full pointer-events-none" />
                <h4 className="text-xs uppercase tracking-[0.25em] font-bold text-brand-orange-500 pb-2 border-b border-white/10 flex justify-between items-center">
                  <span>Constituent Parts Hierarchy (Lives Inside This Item)</span>
                  <span className="text-[10px] bg-brand-orange-500/10 text-brand-orange-400 px-2.5 py-0.5 border border-brand-orange-500/20 font-mono">
                    {selectedItemForDetails.subItems.length} Parts Included
                  </span>
                </h4>
                
                <p className="text-xs text-gray-400 italic">
                  This item is an assembly composed of the individual parts below. In ISO 9001 tracking, each sub-part is managed as an independent template with its own CAD files, materials, and machinery operations.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedItemForDetails.subItems.map((sub, sIdx) => {
                    const child = items.find(itm => itm.id === sub.childItemId);
                    if (!child) return null;
                    return (
                      <div key={sIdx} className="p-4 bg-black border border-white/5 hover:border-brand-orange-500/30 transition-all flex flex-col justify-between space-y-3 hover:translate-y-[-2px] duration-150">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-[10px] font-mono text-brand-orange-500 font-extrabold bg-brand-orange-500/5 border border-brand-orange-500/20 px-2 py-0.5 uppercase tracking-wide">
                              {child.itemCode}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              Qty: <strong className="text-white bg-white/5 border border-white/10 px-1.5 py-0.5 inline-block">{sub.qty} Pcs</strong>
                            </span>
                          </div>
                          
                          <h5 className="text-xs font-sans font-black text-white uppercase tracking-tight">
                            {child.name}
                          </h5>
                          
                          <p className="text-[11px] text-gray-400 font-sans leading-relaxed line-clamp-2">
                            {child.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex flex-wrap justify-between items-center text-[9px] uppercase font-mono text-gray-500 gap-1 font-bold">
                          <span>Routing sequences: <strong className="text-gray-300">{(child.processes || []).length} Step(s)</strong></span>
                          <span>Stock: <strong className="text-brand-orange-400">{(child.materials || []).length} Mat(s)</strong></span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setTestQuantity(sub.qty);
                            setSelectedItemForDetails(child);
                          }}
                          className="w-full bg-[#0d0d0d] hover:bg-brand-orange-500/10 border border-white/10 hover:border-brand-orange-500/30 text-gray-300 hover:text-brand-orange-400 font-mono text-[9px] uppercase font-bold py-1.5 transition-all text-center cursor-pointer"
                        >
                          Details & Blueprint CAD
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DURABLE HARDWARE STOCK VALIDATION PANEL */}
            <div className="p-6 bg-black border border-white/5 space-y-4 lg:col-span-2">
              <h4 className="text-xs uppercase tracking-[0.25em] font-bold text-brand-orange-500 pb-2 border-b border-white/10 flex justify-between items-center">
                <span>ISO 9001 Bill of Materials & Stock Check</span>
                <Layers size={14} className="text-brand-orange-400" />
              </h4>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-[#0a0a0a] p-4 border border-white/5">
                <div className="text-xs text-gray-400">
                  Verify component availability for manufacture batch run size:
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[1, 5, 25, 50, 100].map(qty => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setTestQuantity(qty)}
                      className={`px-3 py-1 text-xs font-mono border transition-all ${
                        testQuantity === qty 
                          ? 'bg-brand-orange-500 text-black border-brand-orange-500 font-bold' 
                          : 'bg-black text-gray-400 border-white/5 hover:border-white/15'
                      }`}
                    >
                      {qty === 50 ? '50 (Project Run)' : `${qty} Unit${qty > 1 ? 's' : ''}`}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const checkRes = checkItemStockStatus(selectedItemForDetails, testQuantity);
                return (
                  <div className="space-y-4">
                    <div className="flex flex-wrap justify-between items-center p-3 text-xs font-mono uppercase tracking-wider rounded-none border outline-none font-bold" style={{
                      borderColor: checkRes.overallStatus === 'CRITICAL_MISSING' ? '#ef4444' : checkRes.overallStatus === 'ORDER_NEEDED' ? '#f59e0b' : '#22c55e',
                      backgroundColor: checkRes.overallStatus === 'CRITICAL_MISSING' ? 'rgba(239, 68, 68, 0.05)' : checkRes.overallStatus === 'ORDER_NEEDED' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(34, 197, 94, 0.05)',
                      color: checkRes.overallStatus === 'CRITICAL_MISSING' ? '#ef4444' : checkRes.overallStatus === 'ORDER_NEEDED' ? '#f59e0b' : '#22c55e'
                    }}>
                      <span>
                        Overall status for Qty {testQuantity}:
                      </span>
                      <span>
                        {checkRes.overallStatus === 'CRITICAL_MISSING' && '🚫 PO REQUIRED - MISSING COMPONENTS'}
                        {checkRes.overallStatus === 'ORDER_NEEDED' && '⚠️ INSUFFICIENT STOCK - PRE-ORDER REQUIRED'}
                        {checkRes.overallStatus === 'OK' && '✅ ALL COMPONENTS SECURED IN WAREHOUSE'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {checkRes.components.map((c, idx) => (
                        <div key={idx} className="p-4 bg-[#080808] border border-white/5 hover:border-white/10 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white text-xs font-bold uppercase">{c.name}</span>
                              <span className="text-[9px] bg-white/5 border border-white/10 text-gray-400 font-mono px-1.5 py-0.5 uppercase tracking-widest">{c.id}</span>
                            </div>
                            <div className="text-[10px] text-gray-400">
                              Supplier: <strong className="text-gray-300">{c.supplier}</strong> &bull; Qty per housing: <strong className="text-white">{c.qtyNeeded} {c.unit}</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shrink-0">
                            <div className="text-right text-xs font-mono space-y-0.5">
                              <div className="text-gray-400">
                                Available: <strong className="text-white bg-black border border-white/5 px-2 py-0.5 inline-block">{c.available} {c.unit}</strong>
                              </div>
                              <div className="text-gray-400">
                                Batch Required: <strong className="text-white bg-black border border-white/5 px-2 py-0.5 inline-block">{c.required.toFixed(1)} {c.unit}</strong>
                              </div>
                            </div>

                            <div className="shrink-0 text-right min-w-[140px]">
                              {c.status === 'MISSING' ? (
                                <span className="px-2.5 py-1 text-[10px] font-black tracking-widest uppercase border border-red-500 text-red-500 bg-red-500/5 block text-center">
                                  🚫 MISSING FILE
                                </span>
                              ) : c.shortfall > 0 ? (
                                <div className="space-y-1">
                                  <span className="px-2.5 py-1 text-[10px] font-black tracking-widest uppercase border border-amber-500 text-amber-500 bg-amber-500/5 block text-center">
                                    ⚠️ SHORTFALL: -{c.shortfall.toFixed(1)}
                                  </span>
                                  <span className="text-[9px] text-[#fb923c] uppercase tracking-wider block font-mono text-center">
                                    Flagged to order
                                  </span>
                                </div>
                              ) : (
                                <span className="px-2.5 py-1 text-[10px] font-black tracking-widest uppercase border border-green-500 text-green-500 bg-green-500/5 block text-center">
                                  ✅ STOCK OK
                              </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {checkRes.overallStatus !== 'OK' && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => alert(`Purchase order request automatically drafted and submitted to ${testQuantity === 50 ? 'Queensland Metal Spinners, EPLAS Specialty and Plastics Unlimited' : 'suppliers'}! shortfalls are queued in isolation log pending receipt.`)}
                          className="w-full bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444] text-[10px] font-black uppercase tracking-widest py-3 transition-all cursor-pointer rounded-none"
                        >
                          ⚠️ DISPATCH COMPLIANCE PURCHASE ORDERS (PO) FOR SHORTFALL
                        </button>
                      </div>
                    )}

                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      ) : (
        /* GRID LIST OF DESIGNS */
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#1a1a1a] p-4 border border-white/5">
            <div className="relative w-full md:w-96 text-xs text-white">
              <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search assembly blueprints by name, item code..."
                className="w-full bg-black border border-white/10 pl-10 pr-4 py-2 outline-none focus:border-brand-orange-500 text-xs"
              />
            </div>
            <div className="text-xs text-gray-500">
              Showing {filteredItems.length} design items
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const checkRes = checkItemStockStatus(item, item.id === 'ITM-CAM-1011' ? 50 : 1);
              return (
                <div key={item.id} className="p-6 bg-[#1a1a1a] border border-white/10 hover:border-brand-orange-500/50 transition-all flex flex-col justify-between space-y-4 rounded-none">
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold bg-[#0d0d0d] text-brand-orange-500 border border-brand-orange-500/20 px-2 py-0.5">
                        {item.itemCode}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono uppercase">
                        Drafted {item.dateCreated}
                      </span>
                    </div>

                    {/* Stock Warning Status Flag badge */}
                    <div className="py-1">
                      {checkRes.overallStatus === 'CRITICAL_MISSING' ? (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 border border-red-500 text-red-500 bg-red-500/5 block text-center font-mono">
                          🚫 PO REQUIRED - MISSING PARTS
                        </span>
                      ) : checkRes.overallStatus === 'ORDER_NEEDED' ? (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 border border-amber-500 text-amber-500 bg-amber-500/5 block text-center font-mono animate-pulse">
                          ⚠️ TO BE ORDERED {item.id === 'ITM-CAM-1011' ? '(Qty 50 Run Short)' : '(Shorfall)'}
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 border border-green-500 text-green-500 bg-green-500/5 block text-center font-mono">
                          ✅ RAW STOCK SECURED & READY
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-serif font-black tracking-tight text-white mb-1 line-clamp-2">
                      {item.name}
                    </h3>
                    
                    <p className="text-xs text-gray-400 font-sans font-light line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] uppercase font-mono text-gray-400">
                    <span>Routing sequences: <strong className="text-white">{item.processes.length}</strong></span>
                    <span>Attached CADs: <strong className="text-brand-orange-500">{item.drawings.length}</strong></span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setTestQuantity(item.id === 'ITM-CAM-1011' ? 50 : 1);
                        setSelectedItemForDetails(item);
                      }}
                      className="flex-1 bg-black border border-brand-orange-500 hover:bg-brand-orange-500 hover:text-black text-brand-orange-500 text-[10px] font-bold uppercase tracking-widest py-3 rounded-none transition-all"
                    >
                      Review Blueprint cad Info
                    </button>
                    <button
                      onClick={() => handleDeleteItemTemplate(item.id, item.name)}
                      className="text-gray-500 hover:text-red-500 p-2.5 transition-colors border border-white/5 hover:border-red-500/20"
                      title="Delete item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="col-span-3 text-center py-12 bg-[#1a1a1a] border border-dashed border-white/10 text-gray-500 font-mono text-xs">
                No custom assemblies discovered in catalog index. Initialize one using design specs above.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
