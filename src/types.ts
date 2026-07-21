/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Admin' | 'Production Manager' | 'Worker';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface Client {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  isoComplianceNotes: string;
  relationType?: 'Client' | 'Supplier' | 'Both'; // Distinguished role
  isDeleted?: boolean; // Soft delete hook
}

export interface Material {
  id: string;
  name: string; // e.g. "RHS 100x50x4mm", "Grade 350 Mild Steel Plate"
  type: 'RHS' | 'SHS' | 'CHS' | 'Plate' | 'H-Beam' | 'Flat Bar' | 'Other';
  dimensions: string; // e.g. "100x50x4 @ 6000mm" or "2400x1200x10mm"
  grade: string; // e.g. "Grade 350", "Grade 250", "316 Stainless"
  totalStock: number; // Current physical quantity
  allocatedStock: number; // Stock reserved for active projects
  availableStock: number; // totalStock - allocatedStock
  unit: string; // "Lengths", "Sheets", "kg"
  supplier: string;
  batchNo: string; // Original Mill Batch Code
  invoiceNo: string;
  materialCertUrl?: string; // Link/mock cert file (ISO 9001 require)
  poNumber?: string;
  receivedByUserId: string; // Logged-in user who processed receipt
  receiptDate: string;
  isDeleted?: boolean; // Soft delete hook
  price?: number; // Purchase price per unit from supplier invoice
  quantityPurchased?: number; // Original quantity purchased from supplier invoice
}

export interface CutListItem {
  type: 'RHS' | 'SHS' | 'CHS' | 'Plate' | 'Flat Bar' | 'Other';
  description: string; // e.g., "Main Frame Member"
  size: string; // e.g., "100x50x4"
  lengthMm: number; // Cut length
  qty: number;
}

export interface MaterialRequirement {
  materialId: string;
  name: string;
  qtyNeeded: number;
}

export interface Drawing {
  name: string;
  fileType: 'DXF' | 'PDF' | 'DWG';
  fileSize: string;
  uploadDate: string;
  uploadedBy: string;
  designVersion: string; // e.g., "Rev A"
}

export interface ProcessTemplate {
  name: string;          // e.g. "Laser Cutting", "CNC Folding", "MIG Welding"
  estimatedHours: number;
  sequence: number;      // Sequence in order: 1, 2, 3
}

export interface SubItemRelation {
  childItemId: string;   // Reference to sub-item
  qty: number;
}

export interface Item {
  id: string;
  name: string; // e.g. "Steel Base Chassis", "Custom Flange Plate v2"
  itemCode: string; // Unique part number: e.g. "P-8022"
  description: string;
  materials: MaterialRequirement[];
  cutList: CutListItem[];
  processes: ProcessTemplate[];
  drawings: Drawing[];
  subItems: SubItemRelation[]; // Hierarchical nesting of parts
  dateCreated: string;
  createdBy: string;
  isDeleted?: boolean; // Soft delete hook
}

export interface SubProjectProcess {
  name: string;
  sequence: number;
  assignedUserId: string; // Assigned Worker, Admin, or Mgr
  status: 'Pending' | 'In Progress' | 'Completed';
  completionDate?: string;
  checkedByUserId?: string; // Quality controller signature (ISO 9001)
  notes?: string;
}

export interface SubProject {
  itemId: string; // Reference to Item
  qty: number;
  batchNo: string; // The sub-job batch number
  processes: SubProjectProcess[];
  // Second-supplier outsourced part details
  isOutsourced: boolean;
  outsourcedSupplierName?: string;
  outsourcedPoNumber?: string;
  outsourcedBatchNo?: string;
  outsourcedCertUrl?: string; // second-supplier material certificate
  outsourcedStatus?: 'Ordered' | 'Dispatched' | 'Delivered' | 'QA Passed';
}

export interface Project {
  id: string; // e.g., "PRJ-2026-001"
  title: string;
  clientId: string; // Reference to Client
  jobCode: string; // Unique client PO or reference
  status: 'Engineering' | 'Production' | 'QA Inspection' | 'Completed' | 'Shipped';
  batchNo: string; // Our main manufacturing process batch code (ISO 9001 ID)
  dateCreated: string;
  deadline: string;
  subProjects: SubProject[];
  includeStockItems: {
    materialId: string;
    qty: number;
    batchNoUsed: string; // Tracks precisely WHICH batch we pulled from
    invoiceNoUsed?: string; // Logs the original invoice number (e.g. 75243006)
  }[];
  qualityCertGenerated: boolean;
  qualityPassedDate?: string;
  qualityPassedByUserId?: string;
  notVisible?: number; // 0 = visible, 1 = hidden (soft-delete equivalent)
}

export interface InventoryLog {
  id: string;
  type: 'INCOME' | 'ALLOCATION' | 'DELIVERY_OUT' | 'SCRAP';
  date: string;
  materialId: string;
  materialName: string;
  quantity: number;
  batchNo: string; // Traced batch
  invoiceNo?: string;
  poNumber?: string;
  projectCode?: string; // Connected project if allocation/delivery
  clientName?: string; // Connection client if material delivered
  userId: string; // Receiver or Allocator User ID
  notes?: string;
  externalPoNo?: string; // Outsourced supplier PO
  externalCertUrl?: string; // Cert link for second-supplier parts
}

export interface Setting {
  id: string;
  companyName: string;
  accreditationBody: string;
  stampCode: string;
  facilityLocation: string;
  saasTier: 'Enterprise' | 'Professional' | 'Standard';
  concurrentSeats: number;
  autoSaves: boolean;
  syncFreq: string;
}

export interface Station {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}
