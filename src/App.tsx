/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project, Material, Item, Client, InventoryLog, User, SubProject, SubProjectProcess, Setting, Station } from './types';
import { getStoredData, saveStoredData, generateBatchCode, generateNextId, generateNextLogId } from './utils';
import ProjectDetails from './components/ProjectDetails';
import ProjectForm from './components/ProjectForm';
import MaterialsManager from './components/MaterialsManager';
import ClientsManager from './components/ClientsManager';
import ItemsCatalog from './components/ItemsCatalog';
import SettingsManager from './components/SettingsManager';
import PrePage from './components/PrePage';
import SimpleProjectPage from './components/SimpleProjectPage';

import { 
  Building2, Warehouse, FileSliders, BarChart3, Radio, Layers, 
  Workflow, PlusCircle, Users, Settings, LogIn, ChevronRight, CheckCircle, ShieldCheck,
  LogOut, Play, Square, Timer, HardHat, Search, Edit2, Trash2, CheckSquare, Eye, RefreshCw, X, ChevronDown, ChevronUp
} from 'lucide-react';

// Helper function to recursively resolve recursive BOM material requirements for stock deduction
const getFullReqsForItem = (item: Item, allItems: Item[]): { materialId: string; name: string; qtyNeeded: number }[] => {
  const reqsMap = new Map<string, { materialId: string; name: string; qtyNeeded: number }>();
  
  if (item.materials) {
    item.materials.forEach(m => {
      const existing = reqsMap.get(m.materialId);
      if (existing) {
        existing.qtyNeeded += m.qtyNeeded;
      } else {
        reqsMap.set(m.materialId, { ...m });
      }
    });
  }

  const recurse = (subList: any[], multiplier: number) => {
    if (!subList) return;
    subList.forEach(sub => {
      const child = allItems.find(i => i.id === sub.childItemId);
      if (child) {
        if (child.materials) {
          child.materials.forEach(childMat => {
            const needed = childMat.qtyNeeded * sub.qty * multiplier;
            const existing = reqsMap.get(childMat.materialId);
            if (existing) {
              existing.qtyNeeded += needed;
            } else {
              reqsMap.set(childMat.materialId, {
                materialId: childMat.materialId,
                name: childMat.name,
                qtyNeeded: needed
              });
            }
          });
        }
        if (child.subItems && child.subItems.length > 0) {
          recurse(child.subItems, sub.qty * multiplier);
        }
      }
    });
  };

  recurse(item.subItems, 1);
  return Array.from(reqsMap.values());
};

export default function App() {
  // Global LocalStorage state
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [settings, setSettings] = useState<Setting | null>(() => {
    const saved = localStorage.getItem('app_settings');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Current operator state (ISO 9001 required operator trace)
  // NOTE: Operator is initially null - will be set from DB users when data loads
  const [operator, setOperator] = useState<User | null>(null);

  // Shop floor states for induction and priority sorting
  // hasCompletedInitialLogin forces PrePage to always show on first app load so admin/user can login
  const [hasCompletedInitialLogin, setHasCompletedInitialLogin] = useState<boolean>(false);
  const [isInducted, setIsInducted] = useState<boolean>(() => localStorage.getItem('operator_inducted') === 'true');
  const [activeStage, setActiveStage] = useState<string>(() => localStorage.getItem('operator_active_stage') || 'All Stages');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => localStorage.getItem('operator_project_id'));

  // Navigation states
  const [currentTab, setCurrentTab] = useState<'projects' | 'materials' | 'items' | 'clients' | 'settings'>('projects');
  
  // View states
  const [selectedProjectForView, setSelectedProjectForView] = useState<Project | null>(null);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Quick state overrides
  const [isSyncing, setIsSyncing] = useState(false);

  // Force normal workers to see only the Projects tab
  useEffect(() => {
    if (operator?.role === 'Worker' && currentTab !== 'projects') {
      setCurrentTab('projects');
    }
  }, [operator, currentTab]);

  // Initial Seed Loading
  useEffect(() => {
    fetch('/api/data')
      .then(res => {
        if (!res.ok) throw new Error('API server response not ok');
        return res.json();
      })
      .then(data => {
        if (data && data.projects) {
          // Initialize lists safely
          setProjects(data.projects);
          setMaterials(data.materials);
          setItems(data.items);
          setClients(data.clients);
          setLogs(data.logs);
          // Users MUST come from database only - no localStorage fallback
          if (data.users && data.users.length > 0) {
            setUsers(data.users);
            // Set operator from DB users - prefer saved ID, fallback to first user
            const savedId = localStorage.getItem('operator_id');
            const foundUser = savedId ? data.users.find(u => u.id === savedId) : data.users[0];
            setOperator(foundUser || data.users[0]);
          } else {
            console.error("[Data Load Error] No users found in database. Please check server.ts seeding.");
            setUsers([]);
          }
          if (data.stations) {
            setStations(data.stations);
          }
          if (data.settings) {
            setSettings(data.settings);
          }
        }
      })
      .catch(err => {
        console.error("[Data Load Error] Failed to fetch from database:", err);
        console.warn("All data must come from the database. Please ensure the server is running and Prisma is initialized.");
        // Do NOT fallback to localStorage for users - they must come from DB
        setProjects([]);
        setMaterials([]);
        setItems([]);
        setClients([]);
        setLogs([]);
        setUsers([]);
      });
  }, []);

  // Save changes to localized state cache AND database via API sync
  const persistState = (
    updatedProj: Project[],
    updatedMats: Material[],
    updatedItems: Item[],
    updatedClients: Client[],
    updatedLogs: InventoryLog[]
  ) => {
    saveStoredData({
      projects: updatedProj,
      materials: updatedMats,
      items: updatedItems,
      clients: updatedClients,
      logs: updatedLogs
    });

    setIsSyncing(true);
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projects: updatedProj,
        materials: updatedMats,
        items: updatedItems,
        clients: updatedClients,
        logs: updatedLogs,
        settings: settings
      })
    })
    .then(async (res) => {
      setIsSyncing(false);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Sync Error] Backend failed:', errorText);
      }
    })
    .catch(err => {
      setIsSyncing(false);
      console.error('[Sync Connection Error] Offline caching mode:', err);
    });
  };

  // State adjustment triggers
  const updateProjectsState = (newProj: Project[]) => {
    setProjects(newProj);
    persistState(newProj, materials, items, clients, logs);
  };

  const updateMaterialsState = (newMats: Material[]) => {
    setMaterials(newMats);
    persistState(projects, newMats, items, clients, logs);
  };

  const updateItemsState = (newItems: Item[]) => {
    setItems(newItems);
    persistState(projects, materials, newItems, clients, logs);
  };

  const updateClientsState = (newClients: Client[]) => {
    setClients(newClients);
    persistState(projects, materials, items, newClients, logs);
  };

  const updateLogsState = (newLogs: InventoryLog[]) => {
    setLogs(newLogs);
    persistState(projects, materials, items, clients, newLogs);
  };

  // Settings persistence — saves to both localStorage and database
  const updateSettingsState = (updatedSettings: Setting) => {
    setSettings(updatedSettings);
    localStorage.setItem('app_settings', JSON.stringify(updatedSettings));
    persistState(projects, materials, items, clients, logs);
  };

  // Helper when adding a single project from form
  const handleAddNewProject = (newProject: Project, updatedMaterials: Material[]) => {
    // Automatically set relation types to client if appropriate
    const clientFound = clients.find(c => c.id === newProject.clientId);
    let updatedClientsList = [...clients];
    if (clientFound && !clientFound.relationType) {
      updatedClientsList = clients.map(c => c.id === newProject.clientId ? { ...c, relationType: 'Client' as const } : c);
      setClients(updatedClientsList);
    }

    const updatedProjects = [newProject, ...projects];
    setProjects(updatedProjects);
    setMaterials(updatedMaterials);
    setShowNewProjectForm(false);
    
    persistState(updatedProjects, updatedMaterials, items, updatedClientsList, logs);
  };

  // Helper when updating a project's subprojects/processes from detail view
  const handleUpdateProjectSchema = (updatedProject: Project) => {
    // Check if project status is changed to Completed
    const original = projects.find(p => p.id === updatedProject.id);
    let finalMaterials = [...materials];
    let finalLogs = [...logs];

    if (original && original.status !== 'Completed' && updatedProject.status === 'Completed') {
      const deductionRes = triggerMaterialsDeduction(updatedProject);
      finalMaterials = deductionRes.nextMaterials;
      finalLogs = deductionRes.nextLogs;
    }

    const updatedProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    setProjects(updatedProjects);
    setMaterials(finalMaterials);
    setLogs(finalLogs);
    
    if (selectedProjectForView && selectedProjectForView.id === updatedProject.id) {
      setSelectedProjectForView(updatedProject);
    }

    persistState(updatedProjects, finalMaterials, items, clients, finalLogs);
  };

  // Subtract physical raw metals and logs when marked completed
  const triggerMaterialsDeduction = (project: Project): { nextMaterials: Material[], nextLogs: InventoryLog[] } => {
    const nextMaterials = [...materials];
    const nextLogs = [...logs];

    // Compute total materials to deduct
    const deductionsMap = new Map<string, number>();

    // 1. Direct IncludeStockItems allocations
    if (project.includeStockItems) {
      project.includeStockItems.forEach(alloc => {
        const cur = deductionsMap.get(alloc.materialId) || 0;
        deductionsMap.set(alloc.materialId, cur + alloc.qty);
      });
    }

    // 2. Recursive BOM requirements for each subproject quantity
    if (project.subProjects) {
      project.subProjects.forEach(sub => {
        const subItem = items.find(i => i.id === sub.itemId);
        if (subItem) {
          const reqs = getFullReqsForItem(subItem, items);
          reqs.forEach(req => {
            const cur = deductionsMap.get(req.materialId) || 0;
            const subitemMultiplier = req.qtyNeeded * sub.qty;
            deductionsMap.set(req.materialId, cur + subitemMultiplier);
          });
        }
      });
    }

    // Process deduction
    deductionsMap.forEach((qtyToDeduct, matId) => {
      const matIdx = nextMaterials.findIndex(m => m.id === matId);
      if (matIdx !== -1) {
        const mat = nextMaterials[matIdx];
        
        // Subtract from physical totalStock and allocatedStock
        const newTotal = Math.max(0, mat.totalStock - qtyToDeduct);
        const newAllocated = Math.max(0, mat.allocatedStock - qtyToDeduct);
        
        nextMaterials[matIdx] = {
          ...mat,
          totalStock: newTotal,
          allocatedStock: newAllocated,
          availableStock: Math.max(0, newTotal - newAllocated)
        };

        // Write delivery log (use sequential ID generator to avoid unique constraint collisions)
        nextLogs.unshift({
          id: generateNextLogId(nextLogs),
          type: 'DELIVERY_OUT',
          date: new Date().toISOString().split('T')[0],
          materialId: mat.id,
          materialName: mat.name,
          quantity: qtyToDeduct,
          batchNo: mat.batchNo,
          projectCode: project.id,
          userId: operator.id,
          notes: `[ISO-9001 Output Dispatch] Project marked Completed. Deducted ${qtyToDeduct} units of Grade ${mat.grade} (${mat.dimensions}) allocation from digital vaults.`
        });
      }
    });

    return { nextMaterials, nextLogs };
  };

  const handleCompleteProjectDirectly = (project: Project) => {
    if (project.status === 'Completed') return;
    
    if (confirm(`COMPLETE PRODUCTION RUN & DEDUCT RAW STOCK:\n\nAre you sure you want to finalize the fabrication sequence for "${project.title}"?\n\nThis will automatically subtract all raw stock materials configured in the Bill of Materials (BOM) under ISO 9001 Clause 8.5, update inventory balances, and log dispatch transactions with operator reference: ${operator.name}.`)) {
      const updatedProject: Project = {
        ...project,
        status: 'Completed' as const,
        qualityPassedDate: new Date().toISOString().split('T')[0],
        qualityPassedByUserId: operator.id
      };
      
      handleUpdateProjectSchema(updatedProject);
    }
  };

  const handleUpdateProjectDetailsInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    const updated = projects.map(p => p.id === editingProject.id ? editingProject : p);
    setProjects(updated);
    setEditingProject(null);
    persistState(updated, materials, items, clients, logs);
  };

  const handleSoftDeleteProject = (id: string, title: string) => {
    if (confirm(`SOFT-DELETE PROJECT:\n\nAre you sure you want to soft-delete the active production stream "${title}"? This removes it from active shop floor boards while retaining all certified weld signatures for statutory compliance.`)) {
      const updated = projects.map(p => p.id === id ? { ...p, notVisible: 1 } : p);
      setProjects(updated);
      persistState(updated, materials, items, clients, logs);
    }
  };

  const isProjectAssignedToOperator = (proj: Project) => {
    if (!proj || !proj.subProjects) return false;
    return proj.subProjects.some(sub => 
      sub && sub.processes && sub.processes.some(proc => {
        if (!proc) return false;
        const userMatch = proc.assignedUserId === operator?.id;
        const stageMatch = activeStage === 'All Stages' || proc.name === activeStage;
        return userMatch && stageMatch;
      })
    );
  };

  const handleFactoryReset = () => {
    localStorage.clear();
    location.reload();
  };

  // Master lists (filtering hidden projects)
  const activeProjects = projects.filter(p => p.notVisible !== 1);

  // Project search results matching queries
  const searchedProjects = activeProjects.filter(p => {
    const matchesSearch = 
      p.title.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.batchNo.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(projectSearch.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesClient = clientFilter === 'all' || p.clientId === clientFilter;

    return matchesSearch && matchesStatus && matchesClient;
  });

  // Priority sorting: put assigned projects at the top, others at the bottom
  const assignedProjects = searchedProjects.filter(isProjectAssignedToOperator);
  const otherProjects = searchedProjects.filter(p => !isProjectAssignedToOperator(p));
  const filteredProjects = [...assignedProjects, ...otherProjects];

  const handleAddMaterialBatch = (newMat: Material, newLog: InventoryLog) => {
    const updatedMaterials = [...materials, newMat];
    const updatedLogs = [newLog, ...logs];
    setMaterials(updatedMaterials);
    setLogs(updatedLogs);
    persistState(projects, updatedMaterials, items, clients, updatedLogs);
  };

  // Always start at PrePage — user must login/induct before accessing the system
  if (!hasCompletedInitialLogin) {
    return (
      <PrePage 
              allUsers={users}
              currentOperator={operator}
              onUsersChange={setUsers}
              activeStage={activeStage}
        stations={stations}
        settings={settings}
        onInduct={(user, stage, projectId) => {
          setOperator(user);
          setActiveStage(stage);
          setIsInducted(true);
          setHasCompletedInitialLogin(true);
          localStorage.setItem('operator_inducted', 'true');
          localStorage.setItem('operator_active_stage', stage);
          localStorage.setItem('operator_id', user.id);
          if (projectId) {
            setActiveProjectId(projectId);
            localStorage.setItem('operator_project_id', projectId);
          } else {
            setActiveProjectId(null);
            localStorage.removeItem('operator_project_id');
          }
        }}
        projects={projects}
        items={items}
        materials={materials}
        logs={logs}
        onAddMaterialBatch={handleAddMaterialBatch}
      />
    );
  }

  // After induction: Workers with an active project go straight to the run card view
  if (operator.role === 'Worker' && activeProjectId) {
    const activeProj = projects.find(p => p.id === activeProjectId && p.notVisible !== 1);
    
    if (activeProj) {
      return (
        <div className="min-h-screen bg-black text-[#d1d5db] font-sans antialiased flex flex-col p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <SimpleProjectPage 
              project={activeProj}
              allItems={items}
              allMaterials={materials}
              allUsers={users}
              currentUser={operator}
              onUpdateProject={handleUpdateProjectSchema}
              onExitProject={() => {
                setActiveProjectId(null);
                localStorage.removeItem('operator_project_id');
                if (operator.role === 'Worker') {
                  setIsInducted(false);
                  localStorage.removeItem('operator_inducted');
                }
              }}
            />
          </div>
        </div>
      );
    } else {
      // No active project assigned — fall back to main dashboard
      if (operator.role === 'Worker') {
        setActiveProjectId(null);
        localStorage.removeItem('operator_project_id');
      }
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased flex flex-col lg:flex-row">
      
      {/* LEFT SIDEBAR - Elegant Pure Black sidebar with neon orange highlights */}
      <aside className="hidden lg:flex w-64 bg-zinc-950 border-r border-zinc-800 flex-col shrink-0 justify-between sticky top-0 h-screen z-40">
        <div className="flex-grow flex flex-col overflow-y-auto">
          {/* Logo Section with strong technical identity */}
          <div className="p-8 flex-shrink-0 text-center border-b border-zinc-900 mb-6 relative">
            <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></div>
            <h1 className="font-sans font-black tracking-[0.15em] text-orange-500 text-2xl leading-tight">ISO-9001</h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 mt-1">BATCH TRACKER</p>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 space-y-1">
            {(operator.role === 'Worker'
              ? ([
                  { id: 'projects', label: 'Projects Planner' }
                ] as const)
              : ([
                  { id: 'projects', label: 'Projects Planner' },
                  { id: 'materials', label: 'Raw Materials Spec' },
                  { id: 'items', label: 'CAD Bill of Items' },
                  { id: 'clients', label: 'Clients & Suppliers' },
                  { id: 'settings', label: 'System Settings' }
                ] as const)
            ).map((tab) => {
              const isActive = currentTab === tab.id && !selectedProjectForView && !showNewProjectForm;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedProjectForView(null);
                    setShowNewProjectForm(false);
                    setCurrentTab(tab.id);
                  }}
                  className={`flex items-center space-x-3 p-3 transition-all uppercase tracking-widest text-[10px] rounded-none w-full text-left border border-transparent font-bold cursor-pointer ${
                    isActive
                      ? 'bg-orange-500 text-black border-orange-500' 
                      : 'text-zinc-450 hover:text-orange-500 hover:bg-zinc-900 bg-transparent'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Operator Stamp bottom section of sidebar */}
        <div className="p-6 border-t border-zinc-900 space-y-4 bg-zinc-950/80 flex-shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Operator Token</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-green-950/50 text-green-400 font-bold border border-green-900/30">ONLINE</span>
          </div>
          <div>
            <p className="text-xs uppercase font-sans font-black tracking-wider text-slate-300">{operator.name}</p>
            <p className="text-[9px] text-zinc-500 font-mono tracking-wider truncate mb-1">{operator.role}</p>
            <div className="flex items-center gap-1 text-[9px] text-orange-500 uppercase font-mono font-bold">
              <HardHat size={11} className="shrink-0 text-orange-500" />
              <span>{activeStage.replace('All Stages', 'ANY STAGE')}</span>
            </div>
          </div>
          
          <button
            onClick={() => {
              setHasCompletedInitialLogin(false);
              setIsInducted(false);
              setActiveStage('All Stages');
              setActiveProjectId(null);
              setOperator(null);
              localStorage.removeItem('operator_inducted');
              localStorage.removeItem('operator_active_stage');
              localStorage.removeItem('operator_id');
              localStorage.removeItem('operator_project_id');
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-zinc-800 text-zinc-400 hover:border-orange-500 hover:text-orange-500 text-[10px] font-mono font-bold uppercase tracking-widest transition-all rounded-none cursor-pointer bg-black"
          >
            <LogOut size={11} className="shrink-0" />
            Check out / Switch Shift
          </button>

          {isSyncing && (
            <div className="text-[9px] text-zinc-500 font-mono uppercase flex items-center justify-center gap-1.5 animate-pulse">
              <RefreshCw size={10} className="animate-spin" />
              Syncing to node database...
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT CONTAINER - Main layout area */}
      <div className="flex-grow flex flex-col min-w-0 bg-black min-h-screen">
        
        {/* MOBILE TOP BAR NAVIGATION OVERLAYS */}
        <div className="lg:hidden flex-shrink-0 bg-zinc-950 border-b border-zinc-900 p-4">
          <div className="flex justify-between items-center">
            <h1 className="font-sans font-black tracking-widest text-orange-500 text-lg uppercase">BMT-9001</h1>
            <div className="flex items-center gap-2">
              <select
                value={currentTab}
                onChange={(e) => {
                  setSelectedProjectForView(null);
                  setShowNewProjectForm(false);
                  setCurrentTab(e.target.value as any);
                }}
                className="bg-black border border-zinc-800 text-zinc-300 text-[10px] py-1 px-2.5 uppercase font-bold tracking-wider outline-none"
              >
                <option value="projects">Projects Planner</option>
                {operator.role !== 'Worker' && (
                  <>
                    <option value="materials">Raw Materials Spec</option>
                    <option value="items">CAD Bill of Items</option>
                    <option value="clients">Clients & Suppliers</option>
                    <option value="settings">System Settings</option>
                  </>
                )}
              </select>
              <button
                onClick={() => {
                  setHasCompletedInitialLogin(false);
                  setIsInducted(false);
                  setActiveStage('All Stages');
                  setActiveProjectId(null);
                  setOperator(null);
                  localStorage.removeItem('operator_inducted');
                  localStorage.removeItem('operator_active_stage');
                  localStorage.removeItem('operator_id');
                  localStorage.removeItem('operator_project_id');
                }}
                className="text-red-500 border border-red-950 p-1 bg-black shrink-0 text-xs uppercase font-extrabold"
              >
                Exit
              </button>
            </div>
          </div>
        </div>

        {/* DESKTOP HEADER BANNER */}
        <header className="hidden lg:flex h-20 border-b border-zinc-900 items-center justify-between px-10 flex-shrink-0 bg-zinc-950/20 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex flex-col">
            <span className="text-[9px] text-orange-500 font-extrabold tracking-[0.4em] uppercase mb-0.5">
              {selectedProjectForView ? 'Assembly Control traveler' : showNewProjectForm ? 'Model Fabrication Project' : `${currentTab.toUpperCase()} LEDGER`}
            </span>
            <h2 className="font-sans text-2xl lg:text-3xl font-black leading-none text-white tracking-widest uppercase">
              {selectedProjectForView 
                ? `Job Spec: ${selectedProjectForView.id}`
                : showNewProjectForm 
                  ? 'Incorporate Stream' 
                  : currentTab === 'projects' 
                    ? 'Active Stream projects' 
                    : currentTab === 'materials' 
                      ? 'Supplied raw materials' 
                      : currentTab === 'items' 
                        ? 'Design blueprints' 
                        : currentTab === 'settings'
                          ? 'Platform System parameters'
                          : 'Corporate Audit profiles'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Current Operator</p>
              <p className="text-xs font-black uppercase text-slate-300">{operator.name}</p>
            </div>
            
            {currentTab === 'projects' && !selectedProjectForView && !showNewProjectForm && (
              <button
                onClick={() => {
                  if (items.length === 0 || clients.length === 0) {
                    alert("A Client profile and an Item template must be registered to start job generation.");
                    return;
                  }
                  setShowNewProjectForm(true);
                }}
                className="bg-orange-500 hover:bg-orange-400 text-black py-2 px-5 text-xs uppercase font-extrabold tracking-widest transition-colors cursor-pointer"
              >
                + Register New Project Run
              </button>
            )}

            {(selectedProjectForView || showNewProjectForm) && (
              <button
                onClick={() => {
                  setSelectedProjectForView(null);
                  setShowNewProjectForm(false);
                }}
                className="px-4 py-2 border border-zinc-800 hover:border-orange-500 text-zinc-300 hover:text-orange-500 text-[10px] uppercase tracking-widest transition-all font-bold cursor-pointer bg-black"
              >
                &larr; Return to Planner
              </button>
            )}
          </div>
        </header>

        {/* PRIMARY MAIN FRAME */}
        <main className="flex-grow w-full max-w-7xl mx-auto py-8 px-4 lg:px-10 overflow-y-auto">
          
          {selectedProjectForView ? (
            <ProjectDetails 
              project={selectedProjectForView}
              allItems={items}
              allMaterials={materials}
              allUsers={users}
              currentUser={operator}
              onBack={() => setSelectedProjectForView(null)}
              onUpdateProject={handleUpdateProjectSchema}
              onViewSimpleCard={() => {
                setActiveProjectId(selectedProjectForView.id);
                localStorage.setItem('operator_project_id', selectedProjectForView.id);
                setSelectedProjectForView(null);
              }}
            />
          ) : showNewProjectForm ? (
            <ProjectForm
              projects={projects}
              allItems={items}
              allMaterials={materials}
              allClients={clients}
              currentUser={operator}
              onCancel={() => setShowNewProjectForm(false)}
              onSubmit={handleAddNewProject}
            />
          ) : (
            <>
              {/* TAB: PROJECTS WORKFLOW PLANNER */}
              {currentTab === 'projects' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Search and high-density filters option bar */}
                  <div className="bg-zinc-950 p-3 border-[0.5px] border-[#2222225c] flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
                    <div className="flex flex-wrap items-center gap-3 flex-grow">
                      <div className="relative text-xs text-white w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2 text-zinc-500" size={13} />
                        <input
                          type="text"
                          className="w-full bg-black border border-zinc-800 pl-8 pr-3 py-1.5 outline-none focus:border-orange-500 text-xs uppercase font-mono"
                          placeholder="Search job name, batch, or ID..."
                          value={projectSearch}
                          onChange={e => setProjectSearch(e.target.value)}
                        />
                      </div>

                      {/* Client Filter */}
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <span className="text-zinc-500 text-[9px] uppercase font-bold">Client:</span>
                        <select
                          value={clientFilter}
                          onChange={e => setClientFilter(e.target.value)}
                          className="bg-black border-[0.5px] border-[#2222225c] text-zinc-300 py-1 px-2 text-[10px] uppercase font-bold outline-none cursor-pointer focus:border-orange-500"
                        >
                          <option value="all">All Clients</option>
                          {clients.filter(c => !c.isDeleted).map(c => (
                            <option key={c.id} value={c.id}>{c.companyName}</option>
                          ))}
                        </select>
                      </div>

                      {/* Status filter */}
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <span className="text-zinc-500 text-[9px] uppercase font-bold">Stage:</span>
                        <select
                          value={statusFilter}
                          onChange={e => setStatusFilter(e.target.value)}
                          className="bg-black border-[0.5px] border-[#2222225c] text-zinc-300 py-1 px-2 text-[10px] uppercase font-bold outline-none cursor-pointer focus:border-orange-500"
                        >
                          <option value="all">All Stages</option>
                          <option value="Engineering">Engineering Config</option>
                          <option value="Production">In Production</option>
                          <option value="QA Inspection">QA Inspection</option>
                          <option value="Completed">Completed Run</option>
                          <option value="Shipped">Dispatched & Shipped</option>
                        </select>
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-500 font-mono uppercase font-bold self-center">
                      Showing {filteredProjects.length} traceable shop routings
                    </div>
                  </div>

                  {/* HIGH-DENSITY OPTIMIZED PROJECTS TABLE */}
                  <div className="overflow-x-auto bg-black border-[0.5px] border-[#2222225c]">
                    <table className="w-full text-left text-xs font-mono border-collapse min-w-[750px]">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] bg-zinc-950">
                          <th className="py-2.5 px-3 font-bold text-zinc-500">Exp</th>
                          <th className="py-2.5 px-2 font-bold text-zinc-500">Job ID</th>
                          <th className="py-2.5 px-2">Production stream Title</th>
                          <th className="py-2.5 px-2">Mill Batch Tracing</th>
                          <th className="py-2.5 px-2 font-bold text-zinc-500">Assignee Client</th>
                          <th className="py-2.5 px-2 text-center">Milestone</th>
                          <th className="py-2.5 px-2 text-center">Routings Progress</th>
                          <th className="py-2.5 px-3 text-right">Rapid Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProjects.map((proj) => {
                          const clientObj = clients.find(c => c.id === proj.clientId);
                          const isExpanded = expandedProjectId === proj.id;

                          // calculate route completions
                          let totalProcs = 0;
                          let completedProcs = 0;
                          (proj.subProjects || []).forEach(sub => {
                            (sub.processes || []).forEach(p => {
                              totalProcs++;
                              if (p && p.status === 'Completed') completedProcs++;
                            });
                          });

                          const progressVal = totalProcs > 0 ? Math.round((completedProcs / totalProcs) * 100) : 0;
                          const isAssigned = isProjectAssignedToOperator(proj);

                          return (
                            <React.Fragment key={proj.id}>
                              <tr className={`border-b border-zinc-900 hover:bg-zinc-900/30 transition-all ${
                                isAssigned ? 'bg-orange-550/[0.02] border-l border-l-orange-500' : 'text-zinc-300'
                              }`}>
                                <td className="py-3 px-3">
                                  <button
                                    onClick={() => setExpandedProjectId(isExpanded ? null : proj.id)}
                                    className="text-zinc-500 hover:text-orange-500 p-0.5 cursor-pointer focus:outline-none"
                                  >
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </button>
                                </td>
                                <td className="py-3 px-2">
                                  <button
                                    onClick={() => setSelectedProjectForView(proj)}
                                    className="font-extrabold text-orange-500 hover:text-orange-400 tracking-wider text-[11px] underline cursor-pointer focus:outline-none bg-transparent"
                                  >
                                    {proj.id}
                                  </button>
                                </td>
                                <td className="py-3 px-2 font-sans font-extrabold text-white uppercase text-[13px]">
                                  <div className="flex items-center flex-wrap gap-1.5 leading-tight">
                                    <span>{proj.title}</span>
                                    {isAssigned && (
                                      <span className="bg-orange-500 text-black font-mono text-[8px] font-black px-1.5 py-0.5 tracking-wider uppercase">
                                        ★ ASSIGNED TO MY SHIFT
                                      </span>
                                    )}
                                  </div>
                                  <span className="block text-[9px] text-zinc-500 uppercase font-mono mt-0.5">PO Ref: {proj.jobCode}</span>
                                </td>
                                <td className="py-3 px-2">
                                  <span className="text-[10px] font-bold text-zinc-200">
                                    {proj.batchNo}
                                  </span>
                                </td>
                                <td className="py-3 px-2 max-w-[120px] truncate uppercase font-sans text-xs text-zinc-400 font-bold" title={clientObj?.companyName}>
                                  {clientObj ? clientObj.companyName : 'DIRECT FABRICATION'}
                                </td>
                                <td className="py-3 px-2 text-center text-[10px] font-sans font-bold text-zinc-400">
                                  {proj.deadline}
                                </td>
                                <td className="py-3 px-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-grow bg-zinc-950 h-1.5 border border-zinc-800 overflow-hidden text-left max-w-[100px]">
                                        <div className="bg-orange-500 h-full" style={{ width: `${progressVal}%` }}></div>
                                      </div>
                                      <span className="font-mono text-[9px] font-bold text-zinc-455">{progressVal}%</span>
                                    </div>
                                    <span className="block text-[8px] text-zinc-500 uppercase">
                                      {completedProcs}/{totalProcs} Operations Check
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setEditingProject(proj);
                                      }}
                                      className="p-1 bg-zinc-950 hover:bg-orange-500 text-zinc-400 hover:text-black border-[0.5px] border-[#2222225c] hover:border-orange-500 transition-all cursor-pointer"
                                      title="Edit project timeline"
                                    >
                                      <Edit2 size={11} />
                                    </button>

                                    {proj.status !== 'Completed' && (
                                      <button
                                        onClick={() => handleCompleteProjectDirectly(proj)}
                                        className="bg-black hover:bg-green-500 hover:text-black text-green-400 border border-green-950/85 hover:border-green-500 text-[9px] uppercase tracking-wider px-2 py-1 font-bold transition-all cursor-pointer"
                                        title="Mark job complete & deduct stock keys"
                                      >
                                        Deduct
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleSoftDeleteProject(proj.id, proj.title)}
                                      className="p-1 bg-zinc-950 hover:bg-red-950 hover:text-red-400 text-zinc-500 border-[0.5px] border-[#2222225c] transition-all cursor-pointer"
                                      title="Soft delete record"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* INLINE ROW EXPANDER - DETAILED SUB-ASSEMBLIES & SUB-PROJECTS (BOM TREE LISTINGS) */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={8} className="bg-zinc-950/50 p-4 border-b-[0.5px] border-b-[#2222225c]">
                                    <div className="space-y-3 font-sans max-w-5xl mx-auto">
                                      <div className="flex justify-between items-center pb-1.5 border-b border-zinc-900 col-span-3">
                                        <div>
                                          <h4 className="text-xs text-orange-500 uppercase font-black tracking-widest font-mono">
                                            Nested Subprojects & BOM Subflows
                                          </h4>
                                          <p className="text-[10px] text-zinc-500 uppercase mt-0.5 font-mono">
                                            Utilizing template configurations. Mark individual parts fabrication steps as completed.
                                          </p>
                                        </div>

                                        {/* Status quick toggle */}
                                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                          <span className="text-zinc-500 uppercase">Production Status:</span>
                                          <select
                                            className="bg-black border border-zinc-800 text-white p-1 text-[10px] uppercase font-bold"
                                            value={proj.status}
                                            onChange={(e) => {
                                              const updatedProject: Project = { ...proj, status: e.target.value as any };
                                              handleUpdateProjectSchema(updatedProject);
                                            }}
                                          >
                                            <option value="Engineering">Engineering</option>
                                            <option value="Production">Production</option>
                                            <option value="QA Inspection font-bold text-orange-500">QA Inspection</option>
                                            <option value="Completed">Completed Run</option>
                                            <option value="Shipped">Dispatched & Shipped</option>
                                          </select>
                                        </div>
                                      </div>

                                      {/* Subprojects Loop */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(proj?.subProjects || []).map((sub, sIdx) => {
                                          const subItemTemplate = items.find(itm => itm.id === sub.itemId);
                                          return (
                                            <div key={sIdx} className="p-3 bg-black border border-zinc-900 space-y-2">
                                              <div className="flex justify-between items-center bg-zinc-950 p-1.5 border-b border-zinc-900 text-[10px] font-mono">
                                                <span className="text-orange-500 font-extrabold font-mono text-[11px]">
                                                  {subItemTemplate ? subItemTemplate.itemCode : 'PART'} ({sub.qty} Pcs)
                                                </span>
                                                <span className="uppercase text-zinc-400 font-bold">
                                                  Batch Ref: {sub.batchNo}
                                                </span>
                                              </div>

                                              <p className="text-xs font-sans font-black text-slate-300 uppercase leading-none">
                                                {subItemTemplate ? subItemTemplate.name : 'Sub Assembly Unit'}
                                              </p>

                                              {/* Sub-Processes router list */}
                                              <div className="space-y-1.5 text-[10px] font-mono pt-1 text-zinc-400">
                                                {(sub?.processes || []).map((proc, pIdx) => {
                                                  const isStepDone = proc.status === 'Completed';
                                                  return (
                                                    <div key={pIdx} className="flex justify-between items-center p-1 hover:bg-zinc-950 transition-colors">
                                                      <span className="leading-none text-zinc-400 flex items-center gap-1.5 font-sans font-bold uppercase">
                                                        <span className="text-zinc-600">#{proc.sequence}</span>
                                                        <span>{proc.name}</span>
                                                      </span>

                                                      <div className="flex items-center gap-2">
                                                        <select
                                                          className="bg-black border border-zinc-800 text-zinc-500 p-0.5 text-[9px] uppercase cursor-pointer"
                                                          value={proc.assignedUserId || ''}
                                                          onChange={(e) => {
                                                            const updatedSubprojects = [...proj.subProjects];
                                                            const updProcesses = [...updatedSubprojects[sIdx].processes];
                                                            updProcesses[pIdx] = { ...updProcesses[pIdx], assignedUserId: e.target.value };
                                                            updatedSubprojects[sIdx].processes = updProcesses;

                                                            handleUpdateProjectSchema({
                                                              ...proj,
                                                              subProjects: updatedSubprojects
                                                            });
                                                          }}
                                                        >
                                                          <option value="">Unassigned</option>
                                                          {users.map(u => (
                                                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                                          ))}
                                                        </select>

                                                        <button
                                                          onClick={() => {
                                                            const updatedSubprojects = [...proj.subProjects];
                                                            const updProcesses = [...updatedSubprojects[sIdx].processes];
                                                            const nextStatus = isStepDone ? 'Pending' : 'Completed';
                                                            
                                                            updProcesses[pIdx] = { 
                                                              ...updProcesses[pIdx], 
                                                              status: nextStatus as any,
                                                              completionDate: nextStatus === 'Completed' ? new Date().toISOString().split('T')[0] : undefined,
                                                              checkedByUserId: nextStatus === 'Completed' ? operator.id : undefined
                                                            };
                                                            updatedSubprojects[sIdx].processes = updProcesses;

                                                            // Auto sync of project state
                                                            handleUpdateProjectSchema({
                                                              ...proj,
                                                              subProjects: updatedSubprojects
                                                            });
                                                          }}
                                                          className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                                            isStepDone
                                                              ? 'bg-green-500/10 text-green-400 border border-green-900/30 font-bold'
                                                              : 'bg-zinc-900 text-zinc-500 hover:border-orange-500 hover:text-orange-400 border border-zinc-800 text-[9px]'
                                                          }`}
                                                        >
                                                          {isStepDone ? '✓ Sign-off' : 'Pending'}
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

                                      <div className="pt-2 text-right">
                                        <button
                                          onClick={() => setSelectedProjectForView(proj)}
                                          className="text-[10px] text-orange-500 hover:text-orange-400 uppercase tracking-widest font-black underline flex items-center justify-end gap-1 font-mono cursor-pointer"
                                        >
                                          <Eye size={12} /> Inspect Advanced Travelers & AS1554.1 Weld Certifications
                                        </button>
                                      </div>

                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}

                        {filteredProjects.length === 0 && (
                          <tr>
                            <td colSpan={8} className="text-center py-16 text-zinc-500 font-sans text-xs">
                              NO CHANNELS DISCOVERED OR ARCHIVED PROJECTS RECORDED MATCHING THE REQUIREMENTS
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* ISO Regulatory guide boards */}
                  <div className="p-4 bg-zinc-950 border-[0.5px] border-[#2222225c] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-zinc-400">
                    <div>
                      <h4 className="text-xs uppercase text-orange-500 tracking-wider font-extrabold flex items-center gap-1.5">
                        <ShieldCheck size={13} /> Continuous Operator Audit Trails (Clause 8.5)
                      </h4>
                      <p className="text-[10px] text-zinc-550 leading-relaxed uppercase mt-0.5">
                        All check-offs store the signatures of who cleared structural segments and weld sequences. Quality certificates download directly in inspect view.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: MATERIAL STORAGE CATALOG */}
              {currentTab === 'materials' && (
                <MaterialsManager
                  materials={materials}
                  currentUser={operator}
                  onUpdateMaterials={updateMaterialsState}
                  logs={logs}
                  onAddLog={(newLog) => {
                    const updatedLogs = [newLog, ...logs];
                    setLogs(updatedLogs);
                    persistState(projects, materials, items, clients, updatedLogs);
                  }}
                />
              )}

              {/* TAB: ITEMS CATALOUGE & BOMs */}
              {currentTab === 'items' && (
                <ItemsCatalog
                  items={items}
                  allMaterials={materials}
                  currentUser={operator}
                  onUpdateItems={updateItemsState}
                />
              )}

              {/* TAB: SUPPLIERS AND CLIENTS */}
              {currentTab === 'clients' && (
                <ClientsManager
                  clients={clients}
                  onUpdateClients={updateClientsState}
                />
              )}

              {/* TAB: SYSTEM & CONFIG DECK */}
              {currentTab === 'settings' && (
                <SettingsManager
                  onClearDatabase={handleFactoryReset}
                  projectsCount={activeProjects.length}
                  materialsCount={materials.filter(m => !m.isDeleted).length}
                  itemsCount={items.filter(i => !i.isDeleted).length}
                  clientsCount={clients.filter(c => !c.isDeleted).length}
                  users={users}
                  onUsersChange={setUsers}
                  stations={stations}
                  onStationsChange={setStations}                  settings={settings}
                  onSaveSettings={updateSettingsState}
                />
              )}
            </>
          )}

        </main>

        {/* POPOUT EDIT PROJECT MODAL DIALOG CONTAINER */}
        {editingProject && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 text-white relative shadow-2xl font-mono">
              <div className="absolute top-0 right-0 p-3">
                <button
                  onClick={() => setEditingProject(null)}
                  className="text-zinc-500 hover:text-orange-500 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 border-b border-zinc-850 bg-zinc-900/40">
                <span className="text-[9px] uppercase tracking-widest text-orange-500 font-bold block mb-1">
                  Adjust Production Run Parameters
                </span>
                <h3 className="font-bold text-base uppercase tracking-widest text-[#cbd5e1] font-sans">
                  Edit Project Stream Timeline
                </h3>
              </div>

              <form onSubmit={handleUpdateProjectDetailsInline} className="p-6 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">Fabrication Stream Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-black border border-zinc-800 p-2 text-xs text-white uppercase focus:border-orange-500 outline-none"
                    value={editingProject.title}
                    onChange={e => setEditingProject({ ...editingProject, title: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">Milestone Deadline</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-black border border-zinc-800 p-2 text-xs text-white uppercase focus:border-orange-500 outline-none"
                    value={editingProject.deadline}
                    onChange={e => setEditingProject({ ...editingProject, deadline: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">Client Reference Code</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-black border border-zinc-800 p-2 text-xs text-white uppercase focus:border-orange-500 outline-none"
                    value={editingProject.jobCode}
                    onChange={e => setEditingProject({ ...editingProject, jobCode: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">Stream Production Batch code</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-black border border-zinc-800 p-2 text-xs text-zinc-400 uppercase outline-none"
                    disabled
                    value={editingProject.batchNo}
                  />
                  <p className="text-[8px] text-zinc-550 italic uppercase">Primary trace parameters cannot be altered in active sequences.</p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="bg-black hover:bg-zinc-900 text-zinc-400 px-4 py-2 uppercase tracking-wider text-[10px] border border-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-400 text-black font-extrabold px-6 py-2 uppercase tracking-wider text-[10px]"
                  >
                    Apply changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Industrial Footer with Regulatory standard markers */}
        <footer className="bg-[#080808] border-t border-zinc-900 mt-20">
          <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-zinc-500 font-mono">
            <div className="space-y-1 text-center md:text-left">
              <div className="text-white font-bold tracking-widest text-[9px] uppercase">
                ISO 9001:2015 CERTIFIED BATCH TRACKER SYSTEM
              </div>
              <p className="font-light text-zinc-400 font-sans uppercase text-[10px] tracking-wider">
                Developed in coordination with AS9100 material trace-ability guidelines. System code locked inside Node.js.
              </p>
            </div>

            <div className="text-center md:text-right space-y-1 text-[10px]">
              <div>
                SYSTEM ID: <strong className="text-white">BMT-9001-FACILITY</strong>
              </div>
              <div className="text-[9px] text-zinc-650">
                ACTIVE STATUS: <strong className="text-orange-500">ACC-OK</strong>
              </div>
            </div>
          </div>
        </footer>

      </div> {/* END OF RIGHT CONTAINER */}

    </div>
  );
}
