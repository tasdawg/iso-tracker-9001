/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, Material, Item, Client, InventoryLog } from './types';

// LocalStorage Keys
const KEYS = {
  PROJECTS: 'iso_projects_v1',
  MATERIALS: 'iso_materials_v1',
  ITEMS: 'iso_items_v1',
  CLIENTS: 'iso_clients_v1',
  INVENTORY_LOGS: 'iso_logs_v1',
  CURRENT_USER: 'iso_current_user_v1'
};

export function getStoredData() {
  const projects = localStorage.getItem(KEYS.PROJECTS);
  const materials = localStorage.getItem(KEYS.MATERIALS);
  const items = localStorage.getItem(KEYS.ITEMS);
  const clients = localStorage.getItem(KEYS.CLIENTS);
  const logs = localStorage.getItem(KEYS.INVENTORY_LOGS);

  return {
    projects: projects ? JSON.parse(projects) as Project[] : [],
    materials: materials ? JSON.parse(materials) as Material[] : [],
    items: items ? JSON.parse(items) as Item[] : [],
    clients: clients ? JSON.parse(clients) as Client[] : [],
    logs: logs ? JSON.parse(logs) as InventoryLog[] : [],
  };
}

export function saveStoredData(data: {
  projects: Project[];
  materials: Material[];
  items: Item[];
  clients: Client[];
  logs: InventoryLog[];
}) {
  localStorage.setItem(KEYS.PROJECTS, JSON.stringify(data.projects));
  localStorage.setItem(KEYS.MATERIALS, JSON.stringify(data.materials));
  localStorage.setItem(KEYS.ITEMS, JSON.stringify(data.items));
  localStorage.setItem(KEYS.CLIENTS, JSON.stringify(data.clients));
  localStorage.setItem(KEYS.INVENTORY_LOGS, JSON.stringify(data.logs));
}

// Generate unique batch code
export function generateBatchCode(prefix: string = 'QR'): string {
  const year = new Date().getFullYear();
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${randNum}`;
}

// Recursively resolve all drawings for an item and its sub-items
export function getJoinedDrawings(item: Item, allItems: Item[]): { itemName: string; name: string; fileType: 'DXF' | 'PDF' | 'DWG'; fileSize: string; uploadDate: string; uploadedBy: string; designVersion: string }[] {
  let drawings: { itemName: string; name: string; fileType: 'DXF' | 'PDF' | 'DWG'; fileSize: string; uploadDate: string; uploadedBy: string; designVersion: string }[] = [];
  
  // Add direct drawings
  if (item.drawings) {
    item.drawings.forEach(d => {
      drawings.push({
        itemName: item.name,
        ...d
      });
    });
  }

  // Add child drawings
  if (item.subItems) {
    item.subItems.forEach(sub => {
      const child = allItems.find(i => i.id === sub.childItemId);
      if (child) {
        const childDrawings = getJoinedDrawings(child, allItems);
        drawings = [...drawings, ...childDrawings];
      }
    });
  }

  // Remove duplicates by drawing file name
  const filtered: typeof drawings = [];
  const names = new Set<string>();
  drawings.forEach(d => {
    const key = `${d.itemName}-${d.name}`;
    if (!names.has(key)) {
      names.add(key);
      filtered.push(d);
    }
  });

  return filtered;
}

// Helper to get nested hierarchy as flat list or structured tree
export interface FlatHierarchyItem {
  id: string;
  name: string;
  code: string;
  level: number;
  qtyRequired: number;
}

export function getItemHierarchy(itemId: string, allItems: Item[], level: number = 0, multiplier: number = 1): FlatHierarchyItem[] {
  const item = allItems.find(i => i.id === itemId);
  if (!item) return [];

  let list: FlatHierarchyItem[] = [{
    id: item.id,
    name: item.name,
    code: item.itemCode,
    level,
    qtyRequired: multiplier
  }];

  if (item.subItems) {
    item.subItems.forEach(sub => {
      const children = getItemHierarchy(sub.childItemId, allItems, level + 1, sub.qty * multiplier);
      list = [...list, ...children];
    });
  }

  return list;
}

// ISO-9001 Format Sequential ID Generators: ID Prefix-YEAR-0001 format
export function generateNextId(prefix: string, existingIds: string[]): string {
  const currentYear = new Date().getFullYear();
  const yearStr = currentYear.toString();
  const searchPrefix = `${prefix}-${yearStr}-`;
  
  let maxNo = 0;
  existingIds.forEach(id => {
    if (id && id.toUpperCase().startsWith(searchPrefix)) {
      const parts = id.split('-');
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNo) {
          maxNo = num;
        }
      }
    }
  });
  
  const nextNo = maxNo + 1;
  const paddedNo = String(nextNo).padStart(4, '0');
  return `${prefix}-${yearStr}-${paddedNo}`;
}

export function generateNextProjectId(projects: Project[]): string {
  return generateNextId('PRJ', projects.map(p => p.id));
}

export function generateNextClientId(clients: Client[]): string {
  return generateNextId('CLI', clients.map(c => c.id));
}

export function generateNextMaterialId(materials: Material[]): string {
  return generateNextId('MAT', materials.map(m => m.id));
}

export function generateNextItemId(items: Item[]): string {
  return generateNextId('ITM', items.map(i => i.id));
}

export function generateNextLogId(logs: InventoryLog[]): string {
  return generateNextId('LOG', logs.map(l => l.id));
}

// Resolve a file path to a full URL using the configured publicUrl setting.
// If publicUrl is set and filePath is a relative /uploads/... path, prepends it.
// Otherwise returns the path as-is (works for absolute URLs and localhost/dev).
export function resolveFileUrl(filePath: string | undefined | null, publicUrl: string): string {
  if (!filePath) return '';
  if (publicUrl && filePath.startsWith('/uploads/')) {
    const base = publicUrl.replace(/\/$/, '');
    return `${base}${filePath}`;
  }
  return filePath;
}

