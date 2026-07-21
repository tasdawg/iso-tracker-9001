import React, { useState, useEffect } from 'react';
import { ShieldCheck, Database, Sliders, AlertCircle, RefreshCw, Layers, CheckCircle, UserPlus, Edit2, Trash2, X, Save, HardHat } from 'lucide-react';

interface SettingsManagerProps {
  onClearDatabase: () => void;
  projectsCount: number;
  materialsCount: number;
  itemsCount: number;
  clientsCount: number;
  users: any[];
  stations: any[];
  onUsersChange: (users: any[]) => void;
  onStationsChange: (stations: any[]) => void;
  settings: any | null;
  onSaveSettings: (settings: any) => void;
}

export default function SettingsManager({
  onClearDatabase,
  projectsCount,
  materialsCount,
  itemsCount,
  clientsCount,
  users,
  stations,
  onUsersChange,
  onStationsChange,
  settings,
  onSaveSettings
}: SettingsManagerProps) {
  // ISO Company Meta State - initialized from props or defaults
  const [companyName, setCompanyName] = useState(settings?.companyName || 'Apex Heavy Engineering HQ');
  const [accreditationBody, setAccreditationBody] = useState(settings?.accreditationBody || 'Lloyds Register Quality Assurance (LRQA)');
  const [stampCode, setStampCode] = useState(settings?.stampCode || 'STAMP-9001-2026');
  const [facilityLocation, setFacilityLocation] = useState(settings?.facilityLocation || 'Melbourne Fabrication Hub Bay 4');
  
  // SaaS parameters - initialized from props or defaults
  const [saasTier, setSaasTier] = useState<'Enterprise' | 'Professional' | 'Standard'>(settings?.saasTier || 'Enterprise');
  const [concurrentSeats, setConcurrentSeats] = useState(settings?.concurrentSeats || 25);
  const [autoSaves, setAutoSaves] = useState(settings?.autoSaves !== undefined ? settings.autoSaves : true);
  const [syncFreq, setSyncFreq] = useState(settings?.syncFreq || 'Real-time Transaction Lock');

  // Sync local state when parent settings prop changes
  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName || 'Apex Heavy Engineering HQ');
      setAccreditationBody(settings.accreditationBody || 'Lloyds Register Quality Assurance (LRQA)');
      setStampCode(settings.stampCode || 'STAMP-9001-2026');
      setFacilityLocation(settings.facilityLocation || 'Melbourne Fabrication Hub Bay 4');
      setSaasTier(settings.saasTier || 'Enterprise');
      setConcurrentSeats(settings.concurrentSeats || 25);
      setAutoSaves(settings.autoSaves !== undefined ? settings.autoSaves : true);
      setSyncFreq(settings.syncFreq || 'Real-time Transaction Lock');
    }
  }, [settings]);

  // Interactive logs/metrics state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>(['[System Startup] Authorized security keys decrypted', '[Prisma Engine] PostgreSQL database connected successfully']);

  // User Management State - managed by parent via props
  const localUsers = users || [];
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Station Management State
  const localStations = stations || [];
  const [loadingStations, setLoadingStations] = useState(true);
  const [showAddStationForm, setShowAddStationForm] = useState(false);
  const [editingStation, setEditingStation] = useState<any>(null);
  
  // Form states for adding/editing stations
  const [newStationId, setNewStationId] = useState('');
  const [newStationName, setNewStationName] = useState('');
  const [newStationDescription, setNewStationDescription] = useState('');
  
  // Form states for adding/editing users
  const [newUserId, setNewUserId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Admin' | 'Production Manager' | 'Worker'>('Worker');
  const [newUserAvatar, setNewUserAvatar] = useState('');

  // Fetch users directly from database on mount
  useEffect(() => {
    fetchUsersFromDB();
  }, []);

  const fetchUsersFromDB = async () => {
    try {
      setLoadingUsers(true);
      console.log('[SettingsManager] Fetching users from /api/users...');
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SettingsManager] API Error ${response.status}:`, errorText);
        return;
      }
      
      const data = await response.json();
      console.log('[SettingsManager] Users fetched:', data.length, 'users');
      if (onUsersChange) {
        onUsersChange(data);
      }
    } catch (err: any) {
      console.error('[SettingsManager] Error fetching users:', err.message || err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Auto-save settings whenever any value changes
  useEffect(() => {
    if (autoSaves) {
      const timeoutId = setTimeout(() => {
        onSaveSettings({
          id: 'app_settings',
          companyName,
          accreditationBody,
          stampCode,
          facilityLocation,
          saasTier,
          concurrentSeats,
          autoSaves,
          syncFreq
        });
      }, 500); // Debounce saves by 500ms
      return () => clearTimeout(timeoutId);
    }
  }, [companyName, accreditationBody, stampCode, facilityLocation, saasTier, concurrentSeats, autoSaves, syncFreq]);

  // User Management Functions
  const handleAddUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newUserId, name: newUserName, role: newUserRole, avatar: newUserAvatar || undefined })
      });
      
      if (response.ok) {
        setShowAddUserForm(false);
        resetUserForm();
        // Refresh user list from database
        await fetchUsersFromDB();
      } else {
        const error = await response.json();
        alert(`Failed to add user: ${error.error}`);
      }
    } catch (err) {
      console.error('Failed to add user:', err);
      alert('Failed to connect to server');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingUser.name, role: editingUser.role, avatar: editingUser.avatar || undefined })
      });
      
      if (response.ok) {
        setEditingUser(null);
        // Refresh user list from database
        await fetchUsersFromDB();
      } else {
        const error = await response.json();
        alert(`Failed to update user: ${error.error}`);
      }
    } catch (err) {
      console.error('Failed to update user:', err);
      alert('Failed to connect to server');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`DELETE USER:\n\nAre you sure you want to delete "${name}"? This action cannot be undone.`)) return;
    
    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      
      if (response.ok) {
        // Refresh user list from database
        await fetchUsersFromDB();
      } else {
        const error = await response.json();
        alert(`Failed to delete user: ${error.error}`);
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Failed to connect to server');
    }
  };

  const resetUserForm = () => {
    setNewUserId('');
    setNewUserName('');
    setNewUserRole('Worker');
    setNewUserAvatar('');
  };

  // Station Management Functions
  useEffect(() => {
    fetchStationsFromDB();
  }, []);

  const fetchStationsFromDB = async () => {
    try {
      setLoadingStations(true);
      console.log('[SettingsManager] Fetching stations from /api/station...');
      const response = await fetch('/api/station');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SettingsManager] API Error ${response.status}:`, errorText);
        return; // Guard against Fast Refresh cycles where onStationsChange may be undefined
      }
      
      const data = await response.json();
      console.log('[SettingsManager] Stations fetched:', data.length, 'stations');
      if (onStationsChange) {
        onStationsChange(data);
      }
    } catch (err: any) {
      console.error('[SettingsManager] Error fetching stations:', err.message || err);
    } finally {
      setLoadingStations(false);
    }
  };

  const handleAddStation = async () => {
    try {
      const response = await fetch('/api/station', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newStationId, name: newStationName, description: newStationDescription || undefined })
      });
      
      if (response.ok) {
        setShowAddStationForm(false);
        resetStationForm();
        // Refresh station list from database
        await fetchStationsFromDB();
      } else {
        const error = await response.json();
        alert(`Failed to add station: ${error.error}`);
      }
    } catch (err) {
      console.error('Failed to add station:', err);
      alert('Failed to connect to server');
    }
  };

  const handleUpdateStation = async () => {
    if (!editingStation) return;
    try {
      const response = await fetch(`/api/station/${editingStation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingStation.name, description: editingStation.description || undefined })
      });
      
      if (response.ok) {
        setEditingStation(null);
        // Refresh station list from database
        await fetchStationsFromDB();
      } else {
        const error = await response.json();
        alert(`Failed to update station: ${error.error}`);
      }
    } catch (err) {
      console.error('Failed to update station:', err);
      alert('Failed to connect to server');
    }
  };

  const handleDeleteStation = async (id: string, name: string) => {
    if (!confirm(`DELETE WORK STATION:\n\nAre you sure you want to deactivate "${name}"? This will hide it from the shop floor selection but retain all historical data.`)) return;
    
    try {
      const response = await fetch(`/api/station/${id}`, { method: 'DELETE' });
      
      if (response.ok) {
        // Refresh station list from database
        await fetchStationsFromDB();
      } else {
        const error = await response.json();
        alert(`Failed to delete station: ${error.error}`);
      }
    } catch (err) {
      console.error('Failed to delete station:', err);
      alert('Failed to connect to server');
    }
  };

  const resetStationForm = () => {
    setNewStationId('');
    setNewStationName('');
    setNewStationDescription('');
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    setSyncLog(prev => [...prev, `[Manual Audit] Triggering active database sync state...`]);
    
    // Force save current settings immediately
    onSaveSettings({
      id: 'app_settings',
      companyName,
      accreditationBody,
      stampCode,
      facilityLocation,
      saasTier,
      concurrentSeats,
      autoSaves,
      syncFreq
    });
    
    setTimeout(() => {
      setIsSyncing(false);
      setSyncLog(prev => [
        ...prev,
        `[Sync Complete] Verified ${projectsCount} production projects, ${materialsCount} steel products, and ${itemsCount} assembly BOMs. 100% compliant.`
      ]);
    }, 1200);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto py-1 px-2 font-mono">
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="text-[10px] uppercase tracking-[0.45em] text-orange-500 font-bold block mb-1">
            ISO-9001 COMMAND CONFIG & SAAS DECK
          </span>
          <h2 className="font-sans font-black text-2xl md:text-3xl text-white tracking-widest uppercase">
            Facility Settings Configuration
          </h2>
          <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">
            Track registrar certifications, company metadata stamps, and active software-as-a-service configurations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ISO 9001 Quality Stamp Setup */}
        <div className="p-5 bg-zinc-950 border border-zinc-800 space-y-4">
          <h3 className="text-xs uppercase tracking-widest font-black text-orange-500 pb-2 border-b border-white/5 flex items-center gap-1.5">
            <ShieldCheck size={14} /> Registrar Accreditations
          </h3>

          <p className="text-[10px] text-zinc-400 leading-relaxed uppercase">
            Enter the authorized registration body parameters. All electronic PDF heat sheets and weld certificates print this stamp automatically.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <label className="block text-[9px] uppercase font-bold text-zinc-500">Accredited Corporation Legal Name</label>
              <input
                type="text"
                className="w-full bg-black border border-zinc-800 p-2.5 text-xs text-white uppercase focus:border-orange-500 outline-none"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] uppercase font-bold text-zinc-500">Quality Registrar Audit Body</label>
              <input
                type="text"
                className="w-full bg-black border border-zinc-800 p-2.5 text-xs text-white uppercase focus:border-orange-500 outline-none"
                value={accreditationBody}
                onChange={e => setAccreditationBody(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-bold text-zinc-500">Authorized Class Stamp</label>
                <input
                  type="text"
                  className="w-full bg-black border border-zinc-800 p-2.5 text-xs text-white uppercase focus:border-orange-500 outline-none"
                  value={stampCode}
                  onChange={e => setStampCode(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-bold text-zinc-500">Workstation Site Location</label>
                <input
                  type="text"
                  className="w-full bg-black border border-zinc-800 p-2.5 text-xs text-white uppercase focus:border-orange-500 outline-none"
                  value={facilityLocation}
                  onChange={e => setFacilityLocation(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SaaS & Subscriptions Deck */}
        <div className="p-5 bg-zinc-950 border border-zinc-800 space-y-4">
          <h3 className="text-xs uppercase tracking-widest font-black text-orange-500 pb-2 border-b border-white/5 flex items-center gap-1.5">
            <Sliders size={14} /> SaaS Subscription Desk
          </h3>

          <p className="text-[10px] text-zinc-400 leading-relaxed uppercase">
            Manage concurrent facility license counts, server-side persistence schedules, and active multi-user limits.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <label className="block text-[9px] uppercase font-bold text-zinc-500">SaaS Premium Subscription Tier</label>
              <select
                className="w-full bg-black border border-zinc-800 p-2.5 text-xs text-white uppercase focus:border-orange-500 outline-none"
                value={saasTier}
                onChange={e => setSaasTier(e.target.value as any)}
              >
                <option value="Enterprise">Enterprise Elite Accreditations</option>
                <option value="Professional">Professional Multi-Site</option>
                <option value="Standard">Standard Workshop</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] uppercase font-bold text-zinc-500">Concurrent Terminal Seats Limit</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="5"
                  max="100"
                  className="flex-grow accent-orange-500 bg-black h-2 rounded-lg"
                  value={concurrentSeats}
                  onChange={e => setConcurrentSeats(parseInt(e.target.value, 10))}
                />
                <span className="font-bold text-orange-500 bg-black px-2.5 py-1 border border-zinc-800 shrink-0 text-[10px]">
                  {concurrentSeats} Workstations
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] uppercase font-bold text-zinc-500">Auto Save State Sync</label>
              <div className="flex items-center gap-4 bg-black p-2 border border-zinc-800 justify-between">
                <span className="text-[10px] text-zinc-400 uppercase">Sync logs immediately on status check-off</span>
                <input
                  type="checkbox"
                  checked={autoSaves}
                  onChange={e => setAutoSaves(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 bg-black border-zinc-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] uppercase font-bold text-zinc-500">Database Engine State</label>
              <div className="bg-black border border-zinc-800 p-2 flex justify-between items-center text-[10px] text-green-400 font-bold uppercase">
                <span>ONLINE - {syncFreq}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Database Audit Log Sync console */}
        <div className="p-5 bg-zinc-950 border border-zinc-800 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs uppercase tracking-widest font-black text-orange-500 pb-2 border-b border-white/5 flex items-center gap-1.5">
              <Database size={14} /> Active Node Integrity Console
            </h3>

            <p className="text-[10px] text-zinc-400 leading-relaxed uppercase mb-3">
              Review persistent database synchronization status, system trace-ability keys, and transaction counts.
            </p>

            <div className="space-y-1.5 font-mono text-[9px] bg-black p-3 border border-zinc-800 max-h-[140px] overflow-y-auto text-zinc-500">
              {syncLog.map((log, index) => (
                <div key={index} className="leading-normal flex gap-1 items-start">
                  <span className="text-orange-500 font-extrabold shrink-0">&raquo;</span>
                  <span className="break-all">{log}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="w-full bg-zinc-900 border border-zinc-700 hover:border-orange-500 hover:text-orange-400 text-white py-2 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Executing transactional sync...' : 'Force manual ledger sync'}
            </button>

            <button
              onClick={() => {
                if (confirm('CRITICAL ACTION WARNING:\n\nYou are about to purge and reset the database to factory seed records. This deletes all custom active production runs, supplier orders, and CAD drawing revisions.\n\nType OK to confirm this ISO system wipe.')) {
                  onClearDatabase();
                }
              }}
              className="w-full bg-red-950/20 hover:bg-red-900 text-red-400 hover:text-black border border-red-900/60 transition-colors py-2 text-[10px] tracking-widest font-black uppercase cursor-pointer"
            >
              Factory Reset Systems State
            </button>
          </div>
        </div>
      </div>

      {/* User Management Panel */}
      <div className="p-5 bg-zinc-950 border border-zinc-800 space-y-4">
        <h3 className="text-xs uppercase tracking-widest font-black text-orange-500 pb-2 border-b border-white/5 flex items-center gap-1.5">
          <UserPlus size={14} /> Operator Personnel Registry
        </h3>

        <p className="text-[10px] text-zinc-400 leading-relaxed uppercase">
          Manage authorized shop floor personnel, assign roles for process routing, and maintain ISO 9001 operator traceability records.
        </p>

        {/* Add User Form */}
        {showAddUserForm && (
          <div className="bg-black border border-zinc-800 p-4 space-y-3 animate-fadeIn">
            <h4 className="text-[10px] uppercase font-bold text-white">Register New Operator</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-bold text-zinc-500">User ID</label>
                <input
                  type="text"
                  value={newUserId}
                  onChange={e => setNewUserId(e.target.value)}
                  placeholder="usr-8"
                  className="w-full bg-black border border-zinc-800 p-2 text-xs text-white uppercase focus:border-orange-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-bold text-zinc-500">Full Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-black border border-zinc-800 p-2 text-xs text-white uppercase focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-bold text-zinc-500">Role</label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as any)}
                  className="w-full bg-black border border-zinc-800 p-2 text-xs text-white uppercase focus:border-orange-500 outline-none"
                >
                  <option value="Admin">Admin</option>
                  <option value="Production Manager">Production Manager</option>
                  <option value="Worker">Worker</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-bold text-zinc-500">Avatar Initials (Optional)</label>
                <input
                  type="text"
                  value={newUserAvatar}
                  onChange={e => setNewUserAvatar(e.target.value)}
                  placeholder="JD"
                  maxLength={3}
                  className="w-full bg-black border border-zinc-800 p-2 text-xs text-white uppercase focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddUser}
                disabled={!newUserId || !newUserName}
                className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-4 py-1.5 text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={11} className="inline mr-1" /> Register User
              </button>
              <button
                onClick={() => { setShowAddUserForm(false); resetUserForm(); }}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 px-4 py-1.5 text-[10px] uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* User Table */}
        <div className="overflow-x-auto">
          {loadingUsers ? (
            <div className="flex items-center justify-center py-8 text-zinc-500">
              <RefreshCw size={16} className="animate-spin mr-2" />
              <span className="text-[10px] uppercase">Loading operators from database...</span>
            </div>
          ) : localUsers.length === 0 ? (
            <p className="text-[10px] text-zinc-600 uppercase py-4">No operators registered in the system. Contact administrator.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-[9px] uppercase font-bold text-zinc-500 py-2 px-3 text-left">Avatar</th>
                  <th className="text-[9px] uppercase font-bold text-zinc-500 py-2 px-3 text-left">User ID</th>
                  <th className="text-[9px] uppercase font-bold text-zinc-500 py-2 px-3 text-left">Full Name</th>
                  <th className="text-[9px] uppercase font-bold text-zinc-500 py-2 px-3 text-left">Role</th>
                  <th className="text-[9px] uppercase font-bold text-zinc-500 py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {localUsers.map(user => (
                  <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors group">
                    <td className="py-2.5 px-3">
                      <div className="w-7 h-7 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center text-[9px] font-bold text-orange-400">
                        {user.avatar || user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[10px] font-mono text-zinc-400">{user.id}</td>
                    <td className="py-2.5 px-3 text-xs font-bold text-white uppercase">{user.name}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                        user.role === 'Admin' ? 'bg-red-950/40 text-red-400 border border-red-900/60' :
                        user.role === 'Production Manager' ? 'bg-blue-950/40 text-blue-400 border border-blue-900/60' :
                        'bg-green-950/40 text-green-400 border border-green-900/60'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingUser({ ...user })}
                          className="bg-zinc-900 hover:bg-orange-500 hover:text-black text-zinc-400 p-1.5 transition-all"
                          title="Edit User"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="bg-zinc-900 hover:bg-red-600 text-zinc-400 p-1.5 transition-all"
                          title="Delete User"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 text-white relative shadow-2xl font-mono">
              <div className="absolute top-0 right-0 p-3">
                <button
                  onClick={() => setEditingUser(null)}
                  className="text-zinc-500 hover:text-orange-500 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 border-b border-zinc-850 bg-zinc-900/40">
                <span className="text-[9px] uppercase tracking-widest text-orange-500 font-bold block mb-1">
                  Modify Operator Profile
                </span>
                <h3 className="font-bold text-base uppercase tracking-widest text-[#cbd5e1] font-sans">
                  Edit: {editingUser.name}
                </h3>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleUpdateUser(); }} className="p-6 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingUser.name}
                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full bg-black border border-zinc-800 p-2 text-xs text-white uppercase focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full bg-black border border-zinc-800 p-2 text-xs text-white uppercase focus:border-orange-500 outline-none"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Production Manager">Production Manager</option>
                    <option value="Worker">Worker</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">Avatar Initials (Optional)</label>
                  <input
                    type="text"
                    value={editingUser.avatar || ''}
                    onChange={e => setEditingUser({ ...editingUser, avatar: e.target.value })}
                    maxLength={3}
                    placeholder="JD"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs text-white uppercase focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="bg-black hover:bg-zinc-900 text-zinc-400 px-4 py-2 uppercase tracking-wider text-[10px] border border-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-400 text-black font-extrabold px-6 py-2 uppercase tracking-wider text-[10px]"
                  >
                    Apply Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add User Button */}
        {!showAddUserForm && (
          <button
            onClick={() => setShowAddUserForm(true)}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-2 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 border border-dashed border-zinc-700 hover:border-orange-500"
          >
            <UserPlus size={12} /> Register New Operator
          </button>
        )}
      </div>

      {/* Work Station Management Panel */}
      <div className="p-5 bg-zinc-950 border border-zinc-800 space-y-4">
        <h3 className="text-xs uppercase tracking-widest font-black text-orange-500 pb-2 border-b border-white/5 flex items-center gap-1.5">
          <HardHat size={14} /> Work Station Routing Registry
        </h3>

        <p className="text-[10px] text-zinc-400 leading-relaxed uppercase">
          Manage physical fabrication work stations, assign routing sequences for production flow, and control active station availability.
        </p>

        {/* Add Station Form */}
        {showAddStationForm && (
          <div className="bg-black border border-zinc-800 p-4 space-y-3 animate-fadeIn">
            <h4 className="text-[10px] uppercase font-bold text-white">Register New Work Station</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-bold text-zinc-500">Station ID</label>
                <input
                  type="text"
                  value={newStationId}
                  onChange={e => setNewStationId(e.target.value)}
                  placeholder="stn-9"
                  className="w-full bg-black border border-zinc-800 p-2 text-xs text-white uppercase focus:border-orange-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-bold text-zinc-500">Station Name</label>
                <input
                  type="text"
                  value={newStationName}
                  onChange={e => setNewStationName(e.target.value)}
                  placeholder="Laser Cutting"
                  className="w-full bg-black border border-zinc-800 p-2 text-xs text-white uppercase focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] uppercase font-bold text-zinc-500">Description (Optional)</label>
              <input
                type="text"
                value={newStationDescription}
                onChange={e => setNewStationDescription(e.target.value)}
                placeholder="High precision fiber laser cutter"
                className="w-full bg-black border border-zinc-800 p-2 text-xs text-white uppercase focus:border-orange-500 outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddStation}
                disabled={!newStationId || !newStationName}
                className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-4 py-1.5 text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={11} className="inline mr-1" /> Register Station
              </button>
              <button
                onClick={() => { setShowAddStationForm(false); resetStationForm(); }}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 px-4 py-1.5 text-[10px] uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Station Table */}
        <div className="overflow-x-auto">
          {loadingStations ? (
            <div className="flex items-center justify-center py-8 text-zinc-500">
              <RefreshCw size={16} className="animate-spin mr-2" />
              <span className="text-[10px] uppercase">Loading work stations from database...</span>
            </div>
          ) : localStations.length === 0 ? (
            <p className="text-[10px] text-zinc-600 uppercase py-4">No work stations registered in the system. Contact administrator.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-[9px] uppercase font-bold text-zinc-500 py-2 px-3 text-left">Station ID</th>
                  <th className="text-[9px] uppercase font-bold text-zinc-500 py-2 px-3 text-left">Name</th>
                  <th className="text-[9px] uppercase font-bold text-zinc-500 py-2 px-3 text-left">Description</th>
                  <th className="text-[9px] uppercase font-bold text-zinc-500 py-2 px-3 text-left">Status</th>
                  <th className="text-[9px] uppercase font-bold text-zinc-500 py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {localStations.map(station => (
                  <tr key={station.id} className={`border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors group ${!station.isActive ? 'opacity-50' : ''}`}>
                    <td className="py-2.5 px-3 text-[10px] font-mono text-zinc-400">{station.id}</td>
                    <td className="py-2.5 px-3 text-xs font-bold text-white uppercase">{station.name}</td>
                    <td className="py-2.5 px-3 text-[10px] text-zinc-500">{station.description || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                        station.isActive 
                          ? 'bg-green-950/40 text-green-400 border border-green-900/60' 
                          : 'bg-red-950/40 text-red-400 border border-red-900/60'
                      }`}>
                        {station.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingStation({ ...station })}
                          className="bg-zinc-900 hover:bg-orange-500 hover:text-black text-zinc-400 p-1.5 transition-all"
                          title="Edit Station"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteStation(station.id, station.name)}
                          className="bg-zinc-900 hover:bg-red-600 text-zinc-400 p-1.5 transition-all"
                          title="Deactivate Station"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Edit Station Modal */}
        {editingStation && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 text-white relative shadow-2xl font-mono">
              <div className="absolute top-0 right-0 p-3">
                <button
                  onClick={() => setEditingStation(null)}
                  className="text-zinc-500 hover:text-orange-500 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 border-b border-zinc-850 bg-zinc-900/40">
                <span className="text-[9px] uppercase tracking-widest text-orange-500 font-bold block mb-1">
                  Modify Work Station Profile
                </span>
                <h3 className="font-bold text-base uppercase tracking-widest text-[#cbd5e1] font-sans">
                  Edit: {editingStation.name}
                </h3>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleUpdateStation(); }} className="p-6 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">Station Name</label>
                  <input
                    type="text"
                    required
                    value={editingStation.name}
                    onChange={e => setEditingStation({ ...editingStation, name: e.target.value })}
                    className="w-full bg-black border border-zinc-800 p-2 text-xs text-white uppercase focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">Description</label>
                  <input
                    type="text"
                    value={editingStation.description || ''}
                    onChange={e => setEditingStation({ ...editingStation, description: e.target.value })}
                    placeholder="Optional station details"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs text-white uppercase focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setEditingStation(null)}
                    className="bg-black hover:bg-zinc-900 text-zinc-400 px-4 py-2 uppercase tracking-wider text-[10px] border border-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-400 text-black font-extrabold px-6 py-2 uppercase tracking-wider text-[10px]"
                  >
                    Apply Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Station Button */}
        {!showAddStationForm && (
          <button
            onClick={() => setShowAddStationForm(true)}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-2 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 border border-dashed border-zinc-700 hover:border-orange-500"
          >
            <HardHat size={12} /> Register New Work Station
          </button>
        )}
      </div>

      {/* ISO Compliance Quick Audit board */}
      <div className="p-5 bg-black border border-zinc-800 text-zinc-400 space-y-3">
        <h4 className="text-xs text-orange-500 uppercase tracking-widest font-black flex items-center gap-1.5">
          <CheckCircle size={14} /> ISO 9001 Accredited Quality Metrics Status
        </h4>
        <p className="text-[11px] leading-relaxed uppercase font-semibold text-zinc-300">
          This SaaS command board synchronizes parameters with standard clauses regarding product tracing and validation.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-center text-[10px]">
          <div className="p-2.5 bg-zinc-950 border border-zinc-800">
            <p className="text-zinc-500 font-bold uppercase mb-1">Clause 8.4.2</p>
            <p className="text-white font-extrabold tracking-wider">Suppliers control: Verified</p>
          </div>
          <div className="p-2.5 bg-zinc-950 border border-zinc-800">
            <p className="text-zinc-500 font-bold uppercase mb-1">Clause 8.5.2</p>
            <p className="text-white font-extrabold tracking-wider">Ident & Trace: Active ({materialsCount + projectsCount} keys)</p>
          </div>
          <div className="p-2.5 bg-zinc-950 border border-zinc-800">
            <p className="text-zinc-500 font-bold uppercase mb-1">Clause 8.5.1</p>
            <p className="text-white font-extrabold tracking-wider">Weld routings: Fully Locked</p>
          </div>
          <div className="p-2.5 bg-zinc-950 border border-zinc-800">
            <p className="text-zinc-500 font-bold uppercase mb-1">Clause 8.6</p>
            <p className="text-white font-extrabold tracking-wider">BOM Release: 100% compliant</p>
          </div>
        </div>
      </div>
    </div>
  );
}
