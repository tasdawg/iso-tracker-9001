/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Material, InventoryLog, User, Project } from '../types';
import { generateBatchCode, generateNextLogId } from '../utils';
import { 
  Plus, History, TrendingDown, ArrowDownLeft, Shield, ExternalLink, Search, 
  Tag, DownloadCloud, AlertTriangle, CheckCircle, FileSpreadsheet, User as UserIcon
} from 'lucide-react';

interface InventoryManagerProps {
  materials: Material[];
  logs: InventoryLog[];
  allUsers: User[];
  allProjects: Project[];
  currentUser: User;
  onUpdateMaterials: (updatedMaterials: Material[]) => void;
  onAddLog: (newLog: InventoryLog) => void;
}

export default function InventoryManager({
  materials,
  logs,
  allUsers,
  allProjects,
  currentUser,
  onUpdateMaterials,
  onAddLog
}: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'warehouse' | 'transactions'>('warehouse');
  const [showIncomeForm, setShowIncomeForm] = useState(false);

  // Income form state
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [incomingQty, setIncomingQty] = useState<number>(10);
  const [batchNo, setBatchNo] = useState('');
  const [supplier, setSupplier] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [certUrl, setCertUrl] = useState('');

  // Allocation/Client delivery form state
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [delMatId, setDelMatId] = useState('');
  const [delQty, setDelQty] = useState<number>(1);
  const [delProjectCode, setDelProjectCode] = useState('');
  const [delClientName, setDelClientName] = useState('');
  const [delNotes, setDelNotes] = useState('');

  // Filters
  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Submit Incoming Delivery
  const handleIncomingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId || incomingQty <= 0 || !batchNo || !supplier) {
      alert("Please complete required delivery input fields (Material, Quantity, Batch Code, and Supplier).");
      return;
    }

    const matchedMatIdx = materials.findIndex(m => m.id === selectedMaterialId);
    if (matchedMatIdx === -1) return;

    const matchedMat = materials[matchedMatIdx];
    const updatedMaterials = [...materials];

    // Compute updated stocks
    const newTotalStock = matchedMat.totalStock + incomingQty;
    const newAvailableStock = newTotalStock - matchedMat.allocatedStock;

    updatedMaterials[matchedMatIdx] = {
      ...matchedMat,
      totalStock: newTotalStock,
      availableStock: newAvailableStock,
      batchNo: batchNo, // update with latest tracked delivery batch
      supplier: supplier, 
      invoiceNo: invoiceNo || matchedMat.invoiceNo,
      poNumber: poNumber || matchedMat.poNumber,
      materialCertUrl: certUrl || matchedMat.materialCertUrl,
      receiptDate: new Date().toISOString().split('T')[0],
      receivedByUserId: currentUser.id
    };

    onUpdateMaterials(updatedMaterials);

    // Create Transaction Log
    const newLog: InventoryLog = {
      id: generateNextLogId(logs),
      type: 'INCOME',
      date: new Date().toISOString().replace(/\.\d+Z/, ''),
      materialId: selectedMaterialId,
      materialName: matchedMat.name,
      quantity: incomingQty,
      batchNo: batchNo,
      invoiceNo: invoiceNo,
      poNumber: poNumber,
      userId: currentUser.id,
      notes: notes || `Received incoming shipment of stock steel components. Checked against supplier mill test certifications.`
    };

    onAddLog(newLog);

    // Reset Form
    setShowIncomeForm(false);
    setSelectedMaterialId('');
    setBatchNo('');
    setSupplier('');
    setInvoiceNo('');
    setPoNumber('');
    setNotes('');
    setCertUrl('');
  };

  // Submit Stock Delivery Out/Allocation to Customer client
  const handleDeliverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delMatId || delQty <= 0) {
      alert("Please complete all required fields for physical warehouse withdrawal.");
      return;
    }

    const matchedIdx = materials.findIndex(m => m.id === delMatId);
    if (matchedIdx === -1) return;

    const mat = materials[matchedIdx];
    if (mat.availableStock < delQty) {
      alert(`Insufficient stock on shelf! Total physically on site: ${mat.totalStock} ${mat.unit}, Available: ${mat.availableStock} ${mat.unit}. Cannot complete allocation.`);
      return;
    }

    const updatedMaterials = [...materials];
    const newTotalStock = mat.totalStock - delQty;
    
    // Subtract from allocated or total depending on configuration
    const newAllocatedStock = Math.max(0, mat.allocatedStock - delQty);
    const newAvailableStock = newTotalStock - newAllocatedStock;

    updatedMaterials[matchedIdx] = {
      ...mat,
      totalStock: newTotalStock,
      allocatedStock: newAllocatedStock,
      availableStock: newAvailableStock
    };

    onUpdateMaterials(updatedMaterials);

    // Determine final batch of project creating this
    const activeProj = allProjects.find(p => p.id === delProjectCode);
    const resolvedProjectBatch = activeProj ? activeProj.batchNo : mat.batchNo;

    // Create Log
    const newLog: InventoryLog = {
      id: generateNextLogId(logs),
      type: 'DELIVERY_OUT',
      date: new Date().toISOString().replace(/\.\d+Z/, ''),
      materialId: delMatId,
      materialName: mat.name,
      quantity: delQty,
      batchNo: resolvedProjectBatch, // traces physical batch drawn
      projectCode: delProjectCode || undefined,
      clientName: delClientName || undefined,
      userId: currentUser.id,
      notes: delNotes || `Dispatched steel profile stock to client assembly site under job code ${delProjectCode || 'General'}.`
    };

    onAddLog(newLog);

    // Reset Form
    setShowDeliveryForm(false);
    setDelMatId('');
    setDelQty(1);
    setDelProjectCode('');
    setDelClientName('');
    setDelNotes('');
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto px-4 py-6">
      
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <span className="text-[10px] uppercase tracking-[0.45em] text-brand-orange-500 font-bold block mb-1">
            MATERIAL STORAGE AND COLD DRAW LOGISTICS
          </span>
          <h2 className="font-serif font-extrabold text-3xl md:text-5xl text-white tracking-tight">
            ISO Warehouse Inventory
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Strict physical stock traceability registers. Map structural material batch numbers to client delivery allocations.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowDeliveryForm(false);
              setShowIncomeForm(!showIncomeForm);
              if (materials.length > 0) setSelectedMaterialId(materials[0].id);
            }}
            className="bg-brand-orange-500 hover:bg-brand-orange-400 text-black py-3 px-6 text-xs uppercase font-bold tracking-widest rounded-none transition-colors"
          >
            Log Incoming Delivery
          </button>
          <button
            onClick={() => {
              setShowIncomeForm(false);
              setShowDeliveryForm(!showDeliveryForm);
              if (materials.length > 0) setDelMatId(materials[0].id);
            }}
            className="bg-black border border-brand-orange-500 text-brand-orange-500 hover:bg-brand-orange-500 hover:text-black py-3 px-6 text-xs uppercase font-bold tracking-widest rounded-none transition-colors"
          >
            Physical Stock Checkout
          </button>
        </div>
      </div>

      {/* Forms Drawer Panel */}
      {showIncomeForm && (
        <div className="p-8 bg-[#1a1a1a] border-l-4 border-brand-orange-500 border border-brand-orange-500/20 text-white animate-scaleUp">
          <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
            <h3 className="font-serif text-xl font-bold flex items-center gap-2">
              <DownloadCloud size={18} className="text-brand-orange-500" />
              Incoming ISO Raw Material Certification Portal
            </h3>
            <button onClick={() => setShowIncomeForm(false)} className="text-xs text-gray-400 hover:text-white">Close</button>
          </div>

          <form onSubmit={handleIncomingSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400">Structural Material Spec <span className="text-brand-orange-500">*</span></label>
                <select
                  required
                  value={selectedMaterialId}
                  onChange={e => setSelectedMaterialId(e.target.value)}
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white uppercase"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400">Incoming Quantity <span className="text-brand-orange-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white"
                  value={incomingQty}
                  onChange={e => setIncomingQty(parseFloat(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400">Original Mill Heat/Batch Number <span className="text-brand-orange-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MILL-HEAT-99014X"
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white font-mono"
                  value={batchNo}
                  onChange={e => setBatchNo(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400">Supplier Company Name <span className="text-brand-orange-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OneSteel Australia Pty"
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400">Invoice Reference Number</label>
                <input
                  type="text"
                  placeholder="INV-9902"
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white font-mono"
                  value={invoiceNo}
                  onChange={e => setInvoiceNo(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400">Purchase Order (PO) Number</label>
                <input
                  type="text"
                  placeholder="PO-2026-99"
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white font-mono"
                  value={poNumber}
                  onChange={e => setPoNumber(e.target.value)}
                />
              </div>

              <div className="md:col-span-3 space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400">Mill Test Certificate Drive PDF Link</label>
                <input
                  type="text"
                  placeholder="https://test-certificates-drive/BHP-99014X.pdf"
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white font-mono"
                  value={certUrl}
                  onChange={e => setCertUrl(e.target.value)}
                />
              </div>

              <div className="md:col-span-3 space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400">Verification Inspection Inspector Logs</label>
                <textarea
                  rows={2}
                  placeholder="Visual surface inspections checked, no pitting or rolling laminations detected."
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

            </div>

            <div className="p-4 bg-black/40 border border-[#C8620A]/20 text-[11px] text-gray-400 flex items-center gap-2">
              <Shield size={16} className="text-brand-orange-500 shrink-0" />
              <span>
                By pressing "Commit Raw stock", you certify that the material conforms physically to specifications, and the transaction will be digitally signed by <strong>{currentUser.name} ({currentUser.role})</strong>.
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowIncomeForm(false)}
                className="bg-black border border-white/10 uppercase tracking-widest text-[10px] px-6 py-2.5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-brand-orange-500 hover:bg-brand-orange-400 text-black uppercase tracking-widest text-[10px] font-bold px-8 py-2.5"
              >
                Commit Raw Stock Receipt
              </button>
            </div>
          </form>
        </div>
      )}

      {showDeliveryForm && (
        <div className="p-8 bg-[#1a1a1a] border-l-4 border-yellow-500 border border-white/5 text-white animate-scaleUp">
          <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
            <h3 className="font-serif text-xl font-bold flex items-center gap-2">
              <TrendingDown size={18} className="text-yellow-500" />
              Client Specific Allocation Stock Checkout
            </h3>
            <button onClick={() => setShowDeliveryForm(false)} className="text-xs text-gray-400 hover:text-white">Close</button>
          </div>

          <form onSubmit={handleDeliverySubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400">Select Raw Stock <span className="text-brand-orange-500">*</span></label>
                <select
                  required
                  value={delMatId}
                  onChange={e => setDelMatId(e.target.value)}
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name} (Available: {m.availableStock} on shelf)</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400">Withdraw Quantity <span className="text-brand-orange-500">*</span></label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white"
                  value={delQty}
                  onChange={e => setDelQty(parseFloat(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400">Link Active Project ID reference</label>
                <select
                  value={delProjectCode}
                  onChange={e => setDelProjectCode(e.target.value)}
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white font-mono"
                >
                  <option value="">No Project (General Floor Stock/Scrap)</option>
                  {allProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.id} - {p.title} (Batch: {p.batchNo})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400">Customer Client Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Engineering Co."
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white font-mono"
                  value={delClientName}
                  onChange={e => setDelClientName(e.target.value)}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400">Dispatch Inspection/Packing Release Logs</label>
                <textarea
                  rows={2}
                  placeholder="Steel structural profile cut down into rails, trace heat number re-stamped prior to shipment."
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white"
                  value={delNotes}
                  onChange={e => setDelNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowDeliveryForm(false)}
                className="bg-black border border-white/10 uppercase tracking-widest text-[10px] px-6 py-2.5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-yellow-600 hover:bg-yellow-500 text-black uppercase tracking-widest text-[10px] font-bold px-8 py-2.5"
              >
                Subtract & Log Checkout
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mini Statistics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[2px] bg-[#1a1a1a] p-[2px]">
        
        <div className="bg-black p-6 space-y-2">
          <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Storage Materials Listed</span>
          <div className="text-3xl font-extrabold font-mono text-white">{materials.length} Profiles</div>
        </div>

        <div className="bg-black p-6 space-y-2">
          <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Raw Sections Stockpile</span>
          <div className="text-3xl font-extrabold font-mono text-brand-orange-500">
            {materials.reduce((acc, current) => acc + current.totalStock, 0)} Units
          </div>
        </div>

        <div className="bg-black p-6 space-y-2">
          <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Allocated/Reserved Steel</span>
          <div className="text-3xl font-extrabold font-mono text-yellow-500">
            {materials.reduce((acc, current) => acc + current.allocatedStock, 0)} Units
          </div>
        </div>

        <div className="bg-black p-6 space-y-2">
          <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wider">Unassigned/Shelf Available</span>
          <div className="text-3xl font-extrabold font-mono text-green-400">
            {materials.reduce((acc, current) => acc + current.availableStock, 0)} Units
          </div>
        </div>

      </div>

      {/* Sub-tab selection */}
      <div className="flex border-b border-white/5 bg-[#0a0a0a] p-1 gap-[2px]">
        <button
          onClick={() => setActiveSubTab('warehouse')}
          className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider transition-all rounded-none text-center ${
            activeSubTab === 'warehouse' 
            ? 'bg-[#1a1a1a] text-brand-orange-500 border-t-2 border-brand-orange-500' 
            : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Shelved Warehousing Stocks
        </button>
        <button
          onClick={() => setActiveSubTab('transactions')}
          className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider transition-all rounded-none text-center ${
            activeSubTab === 'transactions' 
            ? 'bg-[#1a1a1a] text-brand-orange-500 border-t-2 border-brand-orange-500' 
            : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Traceability Ledger History ({logs.length})
        </button>
      </div>

      {/* Sub-Tab Contents */}
      {activeSubTab === 'warehouse' ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#1a1a1a] p-4 border border-white/5">
            <div className="relative w-full md:w-96 text-xs text-white">
              <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by profile specs, mill batches, or suppliers..."
                className="w-full bg-black border border-white/10 pl-10 pr-4 py-2 outline-none focus:border-brand-orange-500"
              />
            </div>
            <div className="text-xs text-gray-400">
              Showing {filteredMaterials.length} of {materials.length} structural specifications
            </div>
          </div>

          <div className="overflow-x-auto bg-[#1a1a1a] border border-white/5">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 uppercase tracking-widest text-[10px] bg-black bg-opacity-40">
                  <th className="py-4 px-4 font-bold text-gray-400">Material Specification Profile</th>
                  <th className="py-4 px-2">Type</th>
                  <th className="py-4 px-2">Original Mill Batch</th>
                  <th className="py-4 px-2">Supplier & PO</th>
                  <th className="py-4 px-2 text-right">Physical On Hand</th>
                  <th className="py-4 px-2 text-right">Allocated Status</th>
                  <th className="py-4 px-4 text-right">Available Stock</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map((mat) => (
                  <tr key={mat.id} className="border-b border-white/5 hover:bg-white/5 group">
                    <td className="py-4 px-4 font-sans max-w-sm">
                      <div className="font-extrabold text-[#ffffff] group-hover:text-brand-orange-500 transition-colors text-sm">
                        {mat.name}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1 font-mono">
                        Dim: <span className="text-gray-300">{mat.dimensions}</span> &bull; Grade: <span className="text-brand-orange-400">{mat.grade}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2 font-mono">
                      <span className="bg-[#111111] px-2 py-0.5 text-[10px] text-gray-300 border border-white/5">
                        {mat.type}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-brand-orange-500 font-bold truncate max-w-[150px]" title={mat.batchNo}>
                      {mat.batchNo}
                      {mat.materialCertUrl ? (
                        <a 
                          href={mat.materialCertUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="block text-[10px] text-green-400 font-sans hover:underline flex items-center gap-0.5 font-bold"
                        >
                          Millcert PDF <ExternalLink size={8} />
                        </a>
                      ) : (
                        <span className="block text-[10px] text-yellow-500 font-sans">No Cert loaded!</span>
                      )}
                    </td>
                    <td className="py-4 px-2 text-gray-400 text-[11px] font-sans">
                      <div>{mat.supplier}</div>
                      <div className="font-mono text-[9px] text-gray-500 mt-0.5">PO Ref: {mat.poNumber || 'N/A'}</div>
                    </td>
                    <td className="py-4 px-2 text-right text-white font-mono text-sm">{mat.totalStock} {mat.unit}</td>
                    <td className="py-4 px-2 text-right text-yellow-500 font-mono text-sm">{mat.allocatedStock} {mat.unit}</td>
                    <td className="py-4 px-4 text-right text-green-400 font-bold font-mono text-base">{mat.availableStock} {mat.unit}</td>
                  </tr>
                ))}

                {filteredMaterials.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-500 font-sans text-sm">
                      No shelving logs match your material search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TRANSACTIONS HISTORY LOG */
        <div className="space-y-4 font-mono text-xs">
          <div className="p-4 bg-[#1a1a1a] border border-white/5 flex justify-between items-center flex-wrap gap-2">
            <span className="text-[#9ca3af] uppercase text-[10px] tracking-wider font-bold">
              ISO-9001 Regulatory Legal Material Trace-ability ledger
            </span>
            <span className="text-[10px] text-gray-500">
              Audit log locks are permanent and digital operator stamps cannot be modified.
            </span>
          </div>

          <div className="bg-[#1a1a1a] border border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5">
              {logs.map((log) => {
                const operatorUser = allUsers.find(u => u.id === log.userId) || { name: 'Automated Agent', role: 'System' };
                
                return (
                  <div key={log.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-black/20 transition-colors">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 mt-0.5 text-[9px] font-bold uppercase tracking-wider border rounded-none ${
                          log.type === 'INCOME' ? 'border-green-500 text-green-500 bg-green-500/5' :
                          log.type === 'ALLOCATION' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' :
                          'border-blue-500 text-blue-500 bg-blue-500/5'
                        }`}>
                          {log.type}
                        </span>
                        <span className="text-gray-500 font-mono text-xs">{log.date.replace('T', ' ')}</span>
                      </div>
                      
                      <h4 className="text-sm font-bold text-white font-sans uppercase tracking-wide">
                        {log.materialName}
                      </h4>
                      <p className="text-xs text-gray-400 font-sans font-light leading-relaxed">
                        {log.notes}
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500 pt-1">
                        <span>Traced Batch Code: <strong className="text-brand-orange-500">{log.batchNo}</strong></span>
                        {log.invoiceNo && <span>Invoice ref: <strong className="text-gray-300">{log.invoiceNo}</strong></span>}
                        {log.poNumber && <span>PO ref: <strong className="text-gray-300">{log.poNumber}</strong></span>}
                        {log.projectCode && <span>Manufacture stream ID: <strong className="text-brand-orange-400">{log.projectCode}</strong></span>}
                        {log.clientName && <span>Target Client: <strong className="text-gray-300">{log.clientName}</strong></span>}
                      </div>
                    </div>

                    <div className="md:text-right border-l md:border-l-0 md:border-r border-brand-orange-500/20 pl-4 md:pl-0 md:pr-4">
                      <div className="text-right text-sm text-white font-bold">{log.type === 'INCOME' ? '+' : '-'}{log.quantity} Units</div>
                      <div className="text-[10px] text-gray-400 flex items-center justify-end gap-1 mt-1 font-sans">
                        <UserIcon size={11} className="text-brand-orange-500" />
                        <span>Registered by: <strong>{operatorUser.name}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {logs.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                  No traceability ledger logs currently stored.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
