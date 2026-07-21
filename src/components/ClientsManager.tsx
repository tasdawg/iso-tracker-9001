import React, { useState } from 'react';
import { Client } from '../types';
import { Search, Plus, MapPin, Mail, Phone, ShieldAlert, Edit, Trash2, X, Star } from 'lucide-react';

interface ClientsManagerProps {
  clients: Client[];
  onUpdateClients: (updatedClients: Client[]) => void;
}

export default function ClientsManager({
  clients,
  onUpdateClients
}: ClientsManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Client' | 'Supplier'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form States (Used for both add and edit)
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isoComplianceNotes, setIsoComplianceNotes] = useState('');
  const [relationType, setRelationType] = useState<'Client' | 'Supplier' | 'Both'>('Client');

  // Filter out soft-deleted clients
  const activeClients = clients.filter(c => !c.isDeleted);

  const filteredClients = activeClients.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Check Client vs Supplier relation filter
    const clientType = c.relationType || 'Client'; // fallback default
    const matchesType = 
      typeFilter === 'all' || 
      clientType === typeFilter || 
      clientType === 'Both';

    return matchesSearch && matchesType;
  });

  const openAddForm = () => {
    setEditingClient(null);
    setName('');
    setCompanyName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setIsoComplianceNotes('');
    setRelationType('Client');
    setShowAddForm(true);
  };

  const openEditForm = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setCompanyName(client.companyName);
    setEmail(client.email);
    setPhone(client.phone);
    setAddress(client.address);
    setIsoComplianceNotes(client.isoComplianceNotes);
    setRelationType(client.relationType || 'Client');
    setShowAddForm(true);
  };

  const handleSoftDelete = (id: string, company: string) => {
    if (confirm(`SOFT-DELETE WARNING:\n\nAre you sure you want to soft-delete the entity "${company}"? It will be removed from your active registries but archived in the master database according to ISO 9001 history validation regulations.`)) {
      const updated = clients.map(c => c.id === id ? { ...c, isDeleted: true } : c);
      onUpdateClients(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !companyName || !email) {
      alert("Please enter procurement officer contact name, company name, and email address.");
      return;
    }

    if (editingClient) {
      // Edit mode
      const updated = clients.map(c => c.id === editingClient.id ? {
        ...c,
        name,
        companyName,
        email,
        phone,
        address,
        isoComplianceNotes: isoComplianceNotes || 'Standard ISO 9001 regulations and weld criteria tracking apply.',
        relationType
      } : c);
      onUpdateClients(updated);
    } else {
      // Add mode
      const nextId = `CLI-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newClient: Client = {
        id: nextId,
        name,
        companyName,
        email,
        phone,
        address,
        isoComplianceNotes: isoComplianceNotes || 'Standard ISO 9001 regulations and weld criteria tracking apply.',
        relationType,
        isDeleted: false
      };
      onUpdateClients([...clients, newClient]);
    }

    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      
      {/* Table search / action bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-zinc-950 p-3 border border-zinc-800">
        <div className="flex flex-wrap items-center gap-3 flex-grow">
          <div className="relative text-xs text-white w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 text-zinc-500" size={13} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search index by name or ID..."
              className="w-full bg-black border border-zinc-800 pl-8 pr-3 py-1.5 outline-none focus:border-orange-500 text-xs uppercase"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 uppercase text-[10px] font-bold">Trace Type:</span>
            <div className="flex bg-black border border-zinc-800 p-0.5">
              {(['all', 'Client', 'Supplier'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1 text-[10px] uppercase font-bold cursor-pointer transition-colors ${
                    typeFilter === type
                      ? 'bg-orange-500 text-black'
                      : 'text-zinc-400 hover:text-white bg-transparent'
                  }`}
                >
                  {type === 'all' ? 'All Roles' : `${type}s`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={openAddForm}
          className="bg-orange-500 hover:bg-orange-400 text-black py-2 px-4 text-xs uppercase font-extrabold tracking-widest cursor-pointer whitespace-nowrap"
        >
          + Add Entry
        </button>
      </div>

      {/* Popout Sliding drawer or absolute overlay form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 text-white relative shadow-2xl">
            <div className="absolute top-0 right-0 p-3">
              <button
                onClick={() => setShowAddForm(false)}
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
                {editingClient ? 'Edit Partner Specification' : 'Register New Partner Spec'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-mono">
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
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Relation / Flow Type <span className="text-orange-500">*</span>
                  </label>
                  <select
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={relationType}
                    onChange={e => setRelationType(e.target.value as any)}
                  >
                    <option value="Client">Client (Wants Completed Fabrications)</option>
                    <option value="Supplier">Supplier (Provides Raw Material Stocks)</option>
                    <option value="Both">Both Roles (Cooperative Fabricator)</option>
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
                    value={name}
                    onChange={e => setName(e.target.value)}
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
                    value={email}
                    onChange={e => setEmail(e.target.value)}
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
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
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
                    value={address}
                    onChange={e => setAddress(e.target.value)}
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
                    value={isoComplianceNotes}
                    onChange={e => setIsoComplianceNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
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

      {/* Main Table-optimized List (Client and supplier register) */}
      <div className="overflow-x-auto bg-black border border-zinc-800">
        <table className="w-full text-left text-xs font-mono border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] bg-zinc-950">
              <th className="py-2.5 px-3 font-bold text-zinc-500">Partner ID</th>
              <th className="py-2.5 px-2">Enterprise Corporate LLC</th>
              <th className="py-2.5 px-2">Classification</th>
              <th className="py-2.5 px-2">Primary Officer Contact</th>
              <th className="py-2.5 px-2">FOB Logistics Location</th>
              <th className="py-2.5 px-2">Audit Compliance Specs</th>
              <th className="py-2.5 px-3 text-right">Operations</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map(client => {
              const relType = client.relationType || 'Client';
              return (
                <tr key={client.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-all text-zinc-300">
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-bold text-orange-500 font-mono tracking-wider bg-orange-550/10 px-1 py-0.5 border border-orange-500/10">
                      {client.id}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-sans font-extrabold text-white text-[13px] uppercase">
                    {client.companyName}
                  </td>
                  <td className="py-3 px-2 font-mono text-[9px] font-bold uppercase">
                    <span className={`px-1.5 py-0.5 border ${
                      relType === 'Client'
                        ? 'bg-zinc-950 text-zinc-300 border-zinc-700'
                        : relType === 'Supplier'
                          ? 'bg-orange-950/20 text-orange-400 border-orange-900/30'
                          : 'bg-indigo-950/20 text-indigo-400 border-indigo-900/30'
                    }`}>
                      {relType}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-zinc-200">{client.name}</p>
                      <p className="text-[9px] text-zinc-500">{client.email} | {client.phone || 'NO PHONE'}</p>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-zinc-400 truncate max-w-[150px] text-[10px]" title={client.address}>
                    <div className="flex items-center gap-1">
                      <MapPin size={10} className="text-zinc-600 shrink-0" />
                      <span>{client.address || 'Not Registered'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 max-w-[200px]" title={client.isoComplianceNotes}>
                    <div className="flex gap-1 items-start text-[10px] leading-relaxed text-zinc-400 font-sans italic line-clamp-2">
                      <ShieldAlert size={11} className="text-orange-500 shrink-0 mt-0.5" />
                      <span>{client.isoComplianceNotes}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => openEditForm(client)}
                        className="p-1 bg-zinc-950 hover:bg-orange-500 text-zinc-400 hover:text-black border border-zinc-800 hover:border-orange-500 transition-all cursor-pointer"
                        title="Edit profile"
                      >
                        <Edit size={11} />
                      </button>
                      <button
                        onClick={() => handleSoftDelete(client.id, client.companyName)}
                        className="p-1 bg-zinc-950 hover:bg-red-950 hover:text-red-400 text-zinc-500 border border-zinc-800 focus:outline-none transition-all cursor-pointer"
                        title="Soft delete from registries"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-zinc-500 font-sans text-xs">
                  NO ENTERPRISES OR SUPPLIER AGENCIES MATCH THE FILTER SPECIFICATION
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
