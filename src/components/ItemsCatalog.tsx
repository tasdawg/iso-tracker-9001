/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Item, Material, Drawing, ProcessTemplate, CutListItem, SubItemRelation, Station, LaserCutPart } from '../types';
import { generateNextItemId, resolveFileUrl } from '../utils';
import { Search, Plus, Trash2, ShieldAlert, FileText, Share2, Layers, CheckSquare, PlusCircle, Paperclip, ExternalLink, ChevronDown, ChevronUp, Workflow, Edit2, Zap } from 'lucide-react';

interface ItemsCatalogProps {
  items: Item[];
  allMaterials: Material[];
  stations: Station[];
  currentUser: { name: string };
  settings: any | null;
  onUpdateItems: (updatedItems: Item[]) => void;
}

export default function ItemsCatalog({
  items,
  allMaterials,
  stations,
  currentUser,
  settings,
  onUpdateItems
}: ItemsCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<Item | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
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
  const [drawingsReq, setDrawingsReq] = useState<{ name: string; fileType: 'DXF' | 'PDF' | 'DWG'; fileSize: string; designVersion: string; filePath?: string }[]>([]);
  // Laser cut parts (flat sheet parts that are just laser cutting, each with its own DXF / drawing file)
  const [laserPartsReq, setLaserPartsReq] = useState<{ description: string; drawingName: string; fileType: 'DXF' | 'PDF' | 'DWG'; fileSize: string; designVersion: string; filePath?: string }[]>([]);
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
    setDrawingsReq([...drawingsReq, { name: '', fileType: 'DXF' as 'DXF' | 'PDF' | 'DWG', fileSize: '', designVersion: '', filePath: undefined }]);
  };
  const handleRemoveDrawing = (idx: number) => {
    setDrawingsReq(drawingsReq.filter((_, i) => i !== idx));
  };
  const handleDwgFieldChange = (idx: number, field: keyof typeof drawingsReq[0], val: any) => {
    const updated = [...drawingsReq];
    (updated[idx] as any)[field] = val;
    setDrawingsReq(updated);
  };

  // Upload drawing file to server and populate metadata
  const handleUploadDrawingFile = async (idx: number, file: File) => {
    if (!file) return;

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    let fileType: 'DXF' | 'PDF' | 'DWG' = 'DXF';
    if (ext === '.pdf') fileType = 'PDF';
    else if (ext === '.dwg') fileType = 'DWG';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const result = await res.json();
      
      if (!result.success) {
        alert(result.error || 'Upload failed');
        return;
      }

      const updated = [...drawingsReq];
      updated[idx] = {
        ...updated[idx],
        name: file.name,
        fileType,
        fileSize: result.fileSize,
        filePath: result.filePath
      };
      setDrawingsReq(updated);
    } catch (err) {
      alert('Upload failed. Please try again.');
      console.error(err);
    }
  };

  const handleAddLaserPart = () => {
    setLaserPartsReq([...laserPartsReq, { description: '', drawingName: '', fileType: 'DXF' as 'DXF' | 'PDF' | 'DWG', fileSize: '', designVersion: '', filePath: undefined }]);
  };
  const handleRemoveLaserPart = (idx: number) => {
    setLaserPartsReq(laserPartsReq.filter((_, i) => i !== idx));
  };
  const handleLaserFieldChange = (idx: number, field: keyof typeof laserPartsReq[0], val: any) => {
    const updated = [...laserPartsReq];
    (updated[idx] as any)[field] = val;
    setLaserPartsReq(updated);
  };

  // Upload the laser part CAD file to server and populate metadata
  const handleUploadLaserPartFile = async (idx: number, file: File) => {
    if (!file) return;

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    let fileType: 'DXF' | 'PDF' | 'DWG' = 'DXF';
    if (ext === '.pdf') fileType = 'PDF';
    else if (ext === '.dwg') fileType = 'DWG';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const result = await res.json();

      if (!result.success) {
        alert(result.error || 'Upload failed');
        return;
      }

      const updated = [...laserPartsReq];
      updated[idx] = {
        ...updated[idx],
        drawingName: file.name,
        fileType,
        fileSize: result.fileSize,
        filePath: result.filePath
      };
      setLaserPartsReq(updated);
    } catch (err) {
      alert('Upload failed. Please try again.');
      console.error(err);
    }
  };

  const handleAddSubItem = () => {
    const availChildren = items.filter(i => i.id !== selectedItemForDetails?.id && i.id !== editingItemId);
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

  // Reset all blueprint form fields to a blank state
  const resetItemForm = () => {
    setName('');
    setItemCode('');
    setDescription('');
    setMaterialsReq([]);
    setRowSupplierFilters({});
    setProcessesReq([]);
    setCutListReq([]);
    setDrawingsReq([]);
    setLaserPartsReq([]);
    setSubItemsReq([]);
    setNewPresetVal('');
  };

  // Pre-populate the blueprint form from an existing item record (loaded from database) and enter edit mode
  const handleEditItem = (item: Item) => {
    setEditingItemId(item.id);
    setName(item.name);
    setItemCode(item.itemCode);
    setDescription(item.description);

    setMaterialsReq((item.materials || []).map(m => ({ materialId: m.materialId, qty: m.qtyNeeded })));
    const filters: Record<number, string> = {};
    (item.materials || []).forEach((m, idx) => {
      const foundMat = allMaterials.find(mat => mat.id === m.materialId);
      if (foundMat) filters[idx] = foundMat.supplier;
    });
    setRowSupplierFilters(filters);

    setProcessesReq((item.processes || []).map(p => ({ name: p.name, estimatedHours: p.estimatedHours })));
    setCutListReq((item.cutList || []).map(c => ({ type: c.type, description: c.description, size: c.size, lengthMm: c.lengthMm, qty: c.qty })));
    setDrawingsReq((item.drawings || []).map(d => ({ name: d.name, fileType: d.fileType, fileSize: d.fileSize, designVersion: d.designVersion, filePath: d.filePath })));
    setLaserPartsReq((item.laserCutParts || []).map(lp => ({ description: lp.description, drawingName: lp.drawingName, fileType: lp.fileType, fileSize: lp.fileSize, designVersion: lp.designVersion || '', filePath: lp.filePath })));
    setSubItemsReq((item.subItems || []).map(s => ({ childItemId: s.childItemId, qty: s.qty })));

    setSelectedItemForDetails(null);
    setShowAddForm(true);
  };

  // Submit blueprint form — creates a new template or updates the existing one when in edit mode
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !itemCode || !description) {
      alert("Please fill in main details (Name, Code, and Description) to register structural item blueprint.");
      return;
    }

    // Assemble structured fields
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

    // Preserve original upload audit trail for drawings that already exist on the item being edited
    const originalItem = editingItemId ? items.find(i => i.id === editingItemId) : null;
    const compileDrawings: Drawing[] = drawingsReq.filter(dr => dr.name).map(dr => {
      const existingDwg = originalItem?.drawings?.find(d => d.name === dr.name && (!dr.filePath || d.filePath === dr.filePath));
      return {
        name: dr.name,
        fileType: dr.fileType,
        fileSize: dr.fileSize,
        uploadDate: existingDwg?.uploadDate || new Date().toISOString().split('T')[0],
        uploadedBy: existingDwg?.uploadedBy || currentUser.name,
        designVersion: dr.designVersion,
        filePath: dr.filePath
      };
    });

    // Preserve original upload audit trail for laser cut parts that already exist on the item being edited
    const compileLaserParts: LaserCutPart[] = laserPartsReq.filter(lp => lp.description || lp.drawingName).map(lp => {
      const existingLp = originalItem?.laserCutParts?.find(x =>
        (lp.drawingName && x.drawingName === lp.drawingName) || (!lp.drawingName && x.description === lp.description)
      );
      return {
        description: lp.description,
        drawingName: lp.drawingName,
        fileType: lp.fileType,
        fileSize: lp.fileSize,
        uploadDate: existingLp?.uploadDate || new Date().toISOString().split('T')[0],
        uploadedBy: existingLp?.uploadedBy || currentUser.name,
        designVersion: lp.designVersion,
        filePath: lp.filePath
      };
    });

    if (editingItemId) {
      // Update the existing item in place — keep original ID, creation date and author for traceability
      const updatedItems = items.map(i => i.id === editingItemId ? {
        ...i,
        name,
        itemCode: itemCode.toUpperCase(),
        description,
        materials: compileMaterials,
        cutList: cutListReq,
        processes: compileProcesses,
        drawings: compileDrawings,
        laserCutParts: compileLaserParts,
        subItems: subItemsReq
      } : i);
      onUpdateItems(updatedItems);
    } else {
      const newItemId = generateNextItemId(items);

      const newItem: Item = {
        id: newItemId,
        name,
        itemCode: itemCode.toUpperCase(),
        description,
        materials: compileMaterials,
        cutList: cutListReq,
        processes: compileProcesses,
        drawings: compileDrawings,
        laserCutParts: compileLaserParts,
        subItems: subItemsReq,
        dateCreated: new Date().toISOString().split('T')[0],
        createdBy: currentUser.name
      };

      onUpdateItems([...items, newItem]);
    }

    // Reset forms and exit edit mode
    setShowAddForm(false);
    setEditingItemId(null);
    resetItemForm();
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
            Manufactured blueprints index. Design nested assemblies, specify metal mill requirements, register laser cut parts with their DXF nest files and mount CAD drawings.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedItemForDetails(null);
            resetItemForm();
            setEditingItemId(null);
            setShowAddForm(!showAddForm);
          }}
          className="bg-brand-orange-500 hover:bg-brand-orange-400 text-black py-3 px-6 text-xs uppercase font-bold tracking-widest rounded-none transition-colors"
        >
          {showAddForm ? (editingItemId ? 'Cancel Edit & View Catalog' : 'View Catalog Database') : 'Design New Component Blueprint'}
        </button>
      </div>

      {showAddForm ? (
        <div className="max-w-4xl mx-auto bg-[#1a1a1a] p-8 md:p-10 border border-brand-orange-500/30 text-white space-y-8">
          <div className="pb-4 border-b border-white/5">
            <h3 className="font-serif text-xl font-bold">{editingItemId ? 'Edit Component Blueprint' : 'Standard Assembly Blueprint Modeler'}</h3>
            <p className="text-xs text-gray-400 mt-1">
              {editingItemId
                ? `Modifying existing template ${itemCode}. Changes save back to the catalog database on compile.`
                : 'Write production instructions and link CAD files to create a traceable component template.'}
            </p>
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
                        {items.filter(i => i.id !== editingItemId).map(i => (
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

            {/* LASER CUT PARTS & DXF NEST FILES */}
            <div className="bg-black p-6 border border-white/5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h4 className="text-xs uppercase tracking-widest font-bold text-brand-orange-500 flex items-center gap-1.5">
                  <Zap size={14} /> Laser Cut Parts &amp; DXF Nest Files
                </h4>
                <button
                  type="button"
                  onClick={handleAddLaserPart}
                  className="text-[10px] text-brand-orange-400 hover:underline uppercase font-bold tracking-wider"
                >
                  + Add Laser Part
                </button>
              </div>

              {laserPartsReq.length > 0 ? (
                <div className="space-y-2">
                  {laserPartsReq.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_96px_40px] gap-2 bg-[#090909] p-3 border border-white/5 items-center">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-gray-500 uppercase font-bold">CAD / DXF File</label>
                        <input
                          type="file"
                          accept=".dxf,.pdf,.dwg"
                          onChange={e => handleUploadLaserPartFile(idx, e.target.files?.[0] || null)}
                          className="text-[10px] text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-orange-600 file:text-black hover:file:bg-orange-500 cursor-pointer bg-black border border-white/10 p-1"
                        />
                        {row.drawingName && (
                          <p className="text-[9px] text-gray-400 truncate font-mono">{row.drawingName} ({row.fileSize})</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-gray-500 uppercase font-bold">Part Description (short)</label>
                        <input
                          type="text"
                          placeholder='e.g. "Door hinge bracket plate, 3mm"'
                          value={row.description}
                          onChange={e => handleLaserFieldChange(idx, 'description', e.target.value)}
                          className="bg-black border border-white/10 p-2 text-xs text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-gray-500 uppercase font-bold">Revision</label>
                        <input
                          type="text"
                          value={row.designVersion}
                          onChange={e => handleLaserFieldChange(idx, 'designVersion', e.target.value)}
                          className="bg-black border border-white/10 p-2 text-xs text-center font-mono text-white"
                        />
                      </div>
                      <button type="button" onClick={() => handleRemoveLaserPart(idx)} className="text-red-500 hover:text-red-400 p-2 self-end">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 text-center py-2">No laser cut parts attached. Register flat sheet DXF work here when the item is just a laser cut with no other routing.</p>
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
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-gray-500 uppercase font-bold">CAD File</label>
                        <input
                          type="file"
                          accept=".pdf,.dxf,.dwg"
                          onChange={e => handleUploadDrawingFile(idx, e.target.files?.[0] || null)}
                          className="text-[10px] text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-orange-600 file:text-black hover:file:bg-orange-500 cursor-pointer bg-black border border-white/10 p-1"
                        />
                        {row.name && (
                          <p className="text-[9px] text-gray-400 truncate font-mono">{row.name} ({row.fileSize})</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-gray-500 uppercase font-bold">File Type</label>
                        <select
                          value={row.fileType}
                          onChange={e => handleDwgFieldChange(idx, 'fileType', e.target.value)}
                          className="bg-black border border-white/10 p-2 text-xs text-white font-mono"
                        >
                          <option value="">Auto-detect</option>
                          <option value="DXF">DXF</option>
                          <option value="PDF">PDF</option>
                          <option value="DWG">DWG</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-gray-500 uppercase font-bold">Upload Status</label>
                        {row.filePath ? (
                          <p className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                            ✓ Uploaded to server
                          </p>
                        ) : (
                          <p className="text-[10px] text-gray-500">Not uploaded</p>
                        )}
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex flex-col gap-1 flex-1">
                          <label className="text-[9px] text-gray-500 uppercase font-bold">Revision</label>
                          <input
                            type="text"
                            placeholder=""
                            value={row.designVersion}
                            onChange={e => handleDwgFieldChange(idx, 'designVersion', e.target.value)}
                            className="bg-black border border-white/10 p-2 text-xs text-center font-mono text-white flex-1"
                          />
                        </div>
                        <button type="button" onClick={() => handleRemoveDrawing(idx)} className="text-red-500 hover:text-red-400 p-2">
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
                onClick={() => {
                  setEditingItemId(null);
                  resetItemForm();
                  setShowAddForm(false);
                }}
                className="bg-black border border-white/10 uppercase tracking-widest text-[10px] px-6 py-3 hover:text-white"
              >
                Discard Form
              </button>
              <button
                type="submit"
                className="bg-brand-orange-500 hover:bg-brand-orange-400 text-black uppercase tracking-widest text-[10px] font-bold px-8 py-3"
              >
                {editingItemId ? 'Save Changes to Blueprint' : 'Compile Part Blueprint Model'}
              </button>
            </div>
          </form>
        </div>
      ) : selectedItemForDetails ? (
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

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEditItem(selectedItemForDetails)}
                className="border border-zinc-700 text-zinc-300 hover:border-brand-orange-500 hover:text-brand-orange-400 py-2 px-4 uppercase text-xs tracking-wider flex items-center gap-1.5"
              >
                <Edit2 size={13} /> Edit Blueprint
              </button>
              <button
                onClick={() => handleDeleteItemTemplate(selectedItemForDetails.id, selectedItemForDetails.name)}
                className="border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-black py-2 px-4 uppercase text-xs tracking-wider"
              >
                Purge catalog Item
              </button>
            </div>
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
                    <div key={dIdx} className="p-4 bg-[#0a0a0a] border border-white/10 font-mono text-xs flex flex-col justify-between gap-3">
                      <div>
                        <div className="font-bold text-white truncate max-w-[200px]">{draw.name}</div>
                        <div className="text-[10px] text-gray-500 mt-1 uppercase font-sans">
                          {draw.fileType} file &bull; Size: {draw.fileSize} &bull; ver: <strong className="text-brand-orange-400">{draw.designVersion}</strong>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        {draw.filePath ? (
                          <a
                            href={resolveFileUrl(draw.filePath, settings?.publicUrl || '')}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-brand-orange-500 hover:text-brand-orange-400 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                          >
                            View File <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-[10px] text-gray-600 italic">No file uploaded</span>
                        )}
                        <span className={`text-[10px] px-2.5 py-1 uppercase font-bold font-sans ${
                          draw.filePath 
                            ? 'text-green-400 bg-green-500/10 border border-green-500/20' 
                            : 'text-[#D9823B] bg-brand-orange-500/10 border border-[#C8620A]/20'
                        }`}>
                          {draw.filePath ? 'UPLOADED' : 'ATTACHED'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-gray-500 font-sans">No drawing attachments located.</div>
              )}
            </div>

            {/* Laser cut parts & DXF nest files */}
            {selectedItemForDetails.laserCutParts && selectedItemForDetails.laserCutParts.length > 0 && (
              <div className="p-6 bg-black border border-lime-500/20 space-y-4 lg:col-span-2">
                <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-lime-400 pb-2 border-b border-white/10 flex justify-between items-center">
                  <span>Laser Cut Parts &amp; DXF Nest Files</span>
                  <Zap size={14} />
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedItemForDetails.laserCutParts.map((lp, lpIdx) => (
                    <div key={lpIdx} className="p-4 bg-[#0a0a0a] border border-white/10 font-mono text-xs flex flex-col justify-between gap-3">
                      <div>
                        <div className="font-bold text-white truncate" title={lp.description}>{lp.description || lp.drawingName}</div>
                        {lp.drawingName && (
                          <div className="text-[10px] text-gray-500 mt-1 uppercase font-sans">
                            File: <strong className="text-white normal-case">{lp.drawingName}</strong> &bull; {lp.fileType} file{lp.fileSize ? ` &bull; Size: ${lp.fileSize}` : ''}{lp.designVersion ? ` &bull; ver: <strong className="text-brand-orange-400">{lp.designVersion}</strong>` : ''}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        {lp.filePath ? (
                          <a
                            href={resolveFileUrl(lp.filePath, settings?.publicUrl || '')}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-brand-orange-500 hover:text-brand-orange-400 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                          >
                            View File <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-[10px] text-gray-600 italic">No file uploaded</span>
                        )}
                        <span className={`text-[10px] px-2.5 py-1 uppercase font-bold font-sans ${
                          lp.filePath
                            ? 'text-green-400 bg-green-500/10 border border-green-500/20'
                            : 'text-[#D9823B] bg-brand-orange-500/10 border border-[#C8620A]/20'
                        }`}>
                          {lp.filePath ? 'UPLOADED' : 'ATTACHED'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

          {/* HIGH-DENSITY ITEMS TABLE */}
          <div className="overflow-x-auto bg-black border-[0.5px] border-[#2222225c]">
            <table className="w-full text-left text-xs font-mono border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] bg-zinc-950">
                  <th className="py-2.5 px-3 font-bold text-zinc-500">Exp</th>
                  <th className="py-2.5 px-2 font-bold text-zinc-500">Item Code</th>
                  <th className="py-2.5 px-2">Assembly Name</th>
                  <th className="py-2.5 px-2 text-center">Drafted</th>
                  <th className="py-2.5 px-2 text-center">Routing Seqs</th>
                  <th className="py-2.5 px-2 text-center">CAD Files</th>
                  <th className="py-2.5 px-2 text-center">Laser Cuts</th>
                  <th className="py-2.5 px-2 text-center">Sub-Parts</th>
                  <th className="py-2.5 px-2 text-center">Materials / Cuts</th>
                  <th className="py-2.5 px-2 text-center">Stock Status</th>
                  <th className="py-2.5 px-3 text-right">Rapid Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const checkRes = checkItemStockStatus(item, item.id === 'ITM-CAM-1011' ? 50 : 1);
                  const isExpanded = expandedItemId === item.id;

                  return (
                    <React.Fragment key={item.id}>
                      <tr className={`border-b border-zinc-900 hover:bg-zinc-900/30 transition-all ${isExpanded ? 'bg-orange-500/5' : 'text-zinc-300'}`}>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                            className="text-zinc-500 hover:text-orange-500 p-0.5 cursor-pointer focus:outline-none"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                        <td className="py-3 px-2">
                          <button
                            onClick={() => setSelectedItemForDetails(item)}
                            className="font-extrabold text-orange-500 hover:text-orange-400 tracking-wider text-[11px] underline cursor-pointer focus:outline-none bg-transparent"
                          >
                            {item.itemCode}
                          </button>
                        </td>
                        <td className="py-3 px-2 font-sans font-extrabold text-white uppercase text-[13px]">
                          <span>{item.name}</span>
                          <span className="block text-[9px] text-zinc-500 uppercase font-mono mt-0.5">{item.id} &bull; by {item.createdBy}</span>
                        </td>
                        <td className="py-3 px-2 text-center text-[10px] font-sans font-bold text-zinc-400">
                          {item.dateCreated}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="text-[10px] font-bold text-zinc-300">{(item.processes || []).length}</span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="text-[10px] font-bold text-orange-500">{(item.drawings || []).length}</span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {(item.laserCutParts || []).length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-lime-400" title={`${(item.laserCutParts || []).length} laser cut part(s) with DXF / drawing files`}>
                              <Zap size={11} /> {(item.laserCutParts || []).length}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`text-[10px] font-bold ${(item.subItems || []).length > 0 ? 'text-cyan-400' : 'text-zinc-600'}`}>
                            {(item.subItems || []).length}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="text-[10px] font-bold text-zinc-300">{(item.materials || []).length} mat(s)</span>
                          <span className="block text-[8px] text-zinc-600 uppercase mt-0.5">{(item.cutList || []).length} cut line(s)</span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {checkRes.overallStatus === 'CRITICAL_MISSING' ? (
                            <span className="inline-block text-[9px] uppercase tracking-widest font-black text-red-500 border border-red-500/40 bg-red-500/5 px-1.5 py-0.5">PO Required</span>
                          ) : checkRes.overallStatus === 'ORDER_NEEDED' ? (
                            <span className="inline-block text-[9px] uppercase tracking-widest font-black text-amber-500 border border-amber-500/40 bg-amber-500/5 px-1.5 py-0.5 animate-pulse">To Be Ordered</span>
                          ) : (
                            <span className="inline-block text-[9px] uppercase tracking-widest font-black text-emerald-400 border border-emerald-500/30 bg-emerald-500/5 px-1.5 py-0.5">Stock Secured</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex justify-end gap-1.5 items-center">
                            <button
                              onClick={() => {
                                setTestQuantity(item.id === 'ITM-CAM-1011' ? 50 : 1);
                                setSelectedItemForDetails(item);
                              }}
                              className="bg-black hover:bg-orange-500/10 border-[0.5px] border-[#2222225c] hover:border-orange-500 text-zinc-400 hover:text-orange-500 py-1 px-2 text-[9px] uppercase tracking-wider font-bold transition-all cursor-pointer"
                              title="Review blueprint CAD info"
                            >
                              Review Blueprint
                            </button>
                            <button
                              onClick={() => handleEditItem(item)}
                              className="p-1 bg-zinc-950 hover:bg-orange-500/10 hover:text-orange-500 text-zinc-400 border-[0.5px] border-[#2222225c] transition-all cursor-pointer"
                              title="Edit item blueprint"
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              onClick={() => handleDeleteItemTemplate(item.id, item.name)}
                              className="p-1 bg-zinc-950 hover:bg-red-950 hover:text-red-400 text-zinc-500 border-[0.5px] border-[#2222225c] transition-all cursor-pointer"
                              title="Delete item"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* INLINE ROW EXPANDER - DETAILED BOM, ROUTING & CAD (DROP-DOWN DETAIL) */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={11} className="bg-zinc-950/50 p-4 border-b-[0.5px] border-b-[#2222225c]">
                            <div className="space-y-3 font-sans max-w-6xl mx-auto">
                              <div className="flex justify-between items-center pb-1.5 border-b border-zinc-900">
                                <div>
                                  <h4 className="text-xs text-orange-500 uppercase font-black tracking-widest font-mono">
                                    Nested BOM, Routing Sequences &amp; CAD Detail — {item.itemCode}
                                  </h4>
                                  <p className="text-[10px] text-zinc-500 uppercase mt-0.5 font-mono">
                                    Template configuration for {item.name}. Drafted by {item.createdBy}.
                                  </p>
                                </div>
                              </div>

                              <p className="text-[11px] text-zinc-400 leading-relaxed">{item.description}</p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Bill of materials & stock check */}
                                <div className="p-3 bg-black border border-zinc-900 space-y-2">
                                  <h5 className="text-[10px] uppercase tracking-widest font-bold text-orange-500 flex items-center gap-1.5 pb-1.5 border-b border-zinc-900">
                                    <Layers size={12} /> ISO 9001 Bill of Materials &amp; Stock Check
                                  </h5>
                                  {checkRes.components.length > 0 ? (
                                    <div className="space-y-1 text-[10px] font-mono">
                                      {checkRes.components.map((c, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-1.5 hover:bg-zinc-950 transition-colors border-b border-zinc-900/30 gap-2">
                                          <span className="leading-tight text-zinc-400 flex items-start gap-2 font-sans font-bold uppercase min-w-[110px]">
                                            <span>{c.name}</span>
                                            <span className="text-[8px] text-zinc-600 font-mono normal-case shrink-0">{c.id}</span>
                                          </span>
                                          <div className="flex items-center gap-2.5 justify-end min-w-[190px]">
                                            <span className="text-zinc-500">Ava: {c.available} {c.unit}</span>
                                            <span className="text-zinc-500">Req: {c.required.toFixed(1)} {c.unit}</span>
                                            {c.status === 'MISSING' ? (
                                              <span className="px-1.5 py-0.5 text-[8px] font-black tracking-wider uppercase border border-red-500/40 text-red-500 bg-red-500/5 shrink-0">Missing</span>
                                            ) : c.shortfall > 0 ? (
                                              <span className="px-1.5 py-0.5 text-[8px] font-black tracking-wider uppercase border border-amber-500/40 text-amber-500 bg-amber-500/5 shrink-0">Short -{c.shortfall.toFixed(1)}</span>
                                            ) : (
                                              <span className="px-1.5 py-0.5 text-[8px] font-black tracking-wider uppercase border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 shrink-0">Stock OK</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-zinc-600 font-mono py-2 text-center uppercase">No raw materials listed for this template.</p>
                                  )}
                                </div>

                                {/* Fabrication routing sequences */}
                                <div className="p-3 bg-black border border-zinc-900 space-y-2">
                                  <h5 className="text-[10px] uppercase tracking-widest font-bold text-orange-500 flex items-center gap-1.5 pb-1.5 border-b border-zinc-900">
                                    <Workflow size={12} /> Fabrication Routing Sequences
                                  </h5>
                                  {(item.processes || []).length > 0 ? (
                                    <div className="space-y-1 text-[10px] font-mono">
                                      {item.processes.map((proc, pIdx) => (
                                        <div key={pIdx} className="flex justify-between items-center p-1.5 hover:bg-zinc-950 transition-colors border-b border-zinc-900/30 gap-2">
                                          <span className="leading-none text-zinc-400 flex items-center gap-2 font-sans font-bold uppercase min-w-[120px]">
                                            <span className="text-zinc-600 w-5 text-right shrink-0">#{proc.sequence}</span>
                                            <span>{proc.name}</span>
                                          </span>
                                          <span className="text-orange-400 shrink-0">{proc.estimatedHours} Hrs Est</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-zinc-600 font-mono py-2 text-center uppercase">No routing sheet sequences found.</p>
                                  )}
                                </div>

                                {/* CAD cut-sheets */}
                                <div className="p-3 bg-black border border-zinc-900 space-y-2">
                                  <h5 className="text-[10px] uppercase tracking-widest font-bold text-orange-500 flex items-center gap-1.5 pb-1.5 border-b border-zinc-900">
                                    <FileText size={12} /> CAD Cut-Sheets (Physical dimensions)
                                  </h5>
                                  {(item.cutList || []).length > 0 ? (
                                    <div className="space-y-1 text-[10px] font-mono">
                                      {item.cutList.map((cut, cIdx) => (
                                        <div key={cIdx} className="flex justify-between items-center p-1.5 hover:bg-zinc-950 transition-colors border-b border-zinc-900/30 gap-2">
                                          <span className="leading-tight text-white font-sans font-bold uppercase truncate" title={cut.description}>{cut.description}</span>
                                          <div className="flex items-center gap-2.5 justify-end shrink-0 text-zinc-500">
                                            <span>{cut.type} &bull; {cut.size}</span>
                                            <span className="text-orange-400">{cut.lengthMm} mm</span>
                                            <span>x{cut.qty}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-zinc-600 font-mono py-2 text-center uppercase">No specific cut sheet lines for this item.</p>
                                  )}
                                </div>

                                {/* Attached blueprint drawings */}
                                <div className="p-3 bg-black border border-zinc-900 space-y-2">
                                  <h5 className="text-[10px] uppercase tracking-widest font-bold text-orange-500 flex items-center gap-1.5 pb-1.5 border-b border-zinc-900">
                                    <Paperclip size={12} /> Attached Blueprint Drawings
                                  </h5>
                                  {(item.drawings || []).length > 0 ? (
                                    <div className="space-y-1 text-[10px] font-mono">
                                      {item.drawings.map((draw, dIdx) => (
                                        <div key={dIdx} className="flex justify-between items-center p-1.5 hover:bg-zinc-950 transition-colors border-b border-zinc-900/30 gap-2">
                                          <span className="leading-tight text-white font-sans font-bold truncate" title={draw.name}>{draw.name}</span>
                                          <div className="flex items-center gap-2.5 justify-end shrink-0">
                                            <span className="text-zinc-500">{draw.fileType} &bull; Ver {draw.designVersion || '—'}</span>
                                            {draw.filePath ? (
                                              <a
                                                href={resolveFileUrl(draw.filePath, settings?.publicUrl || '')}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-orange-500 hover:text-orange-400 font-bold uppercase flex items-center gap-1 shrink-0 transition-colors"
                                              >
                                                View File <ExternalLink size={10} />
                                              </a>
                                            ) : (
                                              <span className="text-zinc-600 italic shrink-0">Attached</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-zinc-600 font-mono py-2 text-center uppercase">No drawing attachments located.</p>
                                  )}
                                </div>

                                {/* Laser cut parts & DXF nest files */}
                                {(item.laserCutParts || []).length > 0 && (
                                  <div className="p-3 bg-black border border-zinc-900 space-y-2">
                                    <h5 className="text-[10px] uppercase tracking-widest font-bold text-lime-400 flex items-center gap-1.5 pb-1.5 border-b border-zinc-900">
                                      <Zap size={12} /> Laser Cut Parts &amp; DXF Files ({item.laserCutParts!.length})
                                    </h5>
                                    <div className="space-y-1 text-[10px] font-mono">
                                      {item.laserCutParts!.map((lp, lpIdx) => (
                                        <div key={lpIdx} className="flex justify-between items-center p-1.5 hover:bg-zinc-950 transition-colors border-b border-zinc-900/30 gap-2">
                                          <span className="leading-tight text-white font-sans font-bold truncate" title={lp.description}>{lp.description || lp.drawingName}</span>
                                          <div className="flex items-center gap-2.5 justify-end shrink-0 min-w-[180px]">
                                            {lp.drawingName && (
                                              <span className="text-zinc-500 truncate max-w-[160px]" title={lp.drawingName}>{lp.drawingName}</span>
                                            )}
                                            {lp.filePath ? (
                                              <a
                                                href={resolveFileUrl(lp.filePath, settings?.publicUrl || '')}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-orange-500 hover:text-orange-400 font-bold uppercase flex items-center gap-1 shrink-0 transition-colors"
                                              >
                                                View File <ExternalLink size={10} />
                                              </a>
                                            ) : (
                                              <span className="text-zinc-600 italic shrink-0">No file</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Constituent parts hierarchy */}
                              {(item.subItems || []).length > 0 && (
                                <div className="p-3 bg-black border border-orange-500/20 space-y-2">
                                  <h5 className="text-[10px] uppercase tracking-widest font-bold text-orange-500 flex items-center gap-1.5 pb-1.5 border-b border-zinc-900">
                                    <Layers size={12} /> Constituent Parts Hierarchy ({item.subItems.length} Parts Included)
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {item.subItems.map((sub, sIdx) => {
                                      const child = items.find(itm => itm.id === sub.childItemId);
                                      if (!child) return null;
                                      return (
                                        <div key={sIdx} className="p-2.5 bg-zinc-950 border border-zinc-900 flex justify-between items-center gap-3">
                                          <div className="min-w-0">
                                            <span className="text-[9px] font-mono text-orange-500 font-extrabold uppercase tracking-wide">{child.itemCode}</span>
                                            <p className="text-[11px] font-sans font-black text-white uppercase truncate leading-tight mt-0.5">
                                              {child.name} &bull; Qty {sub.qty} Pcs
                                            </p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setTestQuantity(sub.qty);
                                              setSelectedItemForDetails(child);
                                            }}
                                            className="shrink-0 bg-zinc-900 hover:bg-orange-500/10 border border-zinc-800 hover:border-orange-500/40 text-zinc-400 hover:text-orange-400 font-mono text-[8px] uppercase font-bold px-2.5 py-1.5 transition-all cursor-pointer"
                                          >
                                            Details &amp; CAD
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-zinc-500 font-sans text-xs">
                      NO CUSTOM ASSEMBLIES DISCOVERED IN CATALOG INDEX MATCHING THE REQUIREMENTS
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
