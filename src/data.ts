/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Client, Material, Item, Project, InventoryLog } from './types';

export const INITIAL_USERS: User[] = [
  { id: 'usr-1', name: 'Robert Vance', role: 'Admin', avatar: 'RV' },
  { id: 'usr-2', name: 'Amelia Sterling', role: 'Production Manager', avatar: 'AS' },
  { id: 'usr-3', name: 'Jack Thompson', role: 'Worker', avatar: 'JT' },
  { id: 'usr-4', name: 'Marcus Brody', role: 'Worker', avatar: 'MB' },
  { id: 'usr-5', name: 'Liam Rodriguez', role: 'Worker', avatar: 'LR' },
  { id: 'usr-6', name: 'Chloe Chen', role: 'Worker', avatar: 'CC' },
  { id: 'usr-7', name: 'Siddharth Nair', role: 'Worker', avatar: 'SN' },
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'CLI-2026-0001',
    name: 'Apex Aerostructures Corp',
    companyName: 'Apex Aerostructures Ltd.',
    email: 'procurement@apex-aero.com',
    phone: '+61 3 9822 4411',
    address: 'Aero Drive, Sector 12, Melbourne VIC 3000',
    isoComplianceNotes: 'Requires full structural heat certification and NDT testing files for all primary welded structures. AS9100 / ISO 9001 compliant.',
    relationType: 'Client'
  },
  {
    id: 'CLI-2026-0002',
    name: 'Titanium Custom Engineering',
    companyName: 'TCE Infrastructure',
    email: 'fab-mgr@titaniumcustom.com.au',
    phone: '+61 2 4911 3822',
    address: '88 Smelters Road, Newcastle NSW 2300',
    isoComplianceNotes: 'Strict batch verification. Heat trace codes must be steel-stamped on physical material prior to final QA clearance.',
    relationType: 'Client'
  },
  {
    id: 'CLI-2026-0003',
    name: 'Nexus Heavy Industries Ltd',
    companyName: 'Nexus Mining & Energy',
    email: 'logistics@nexusheavy.com',
    phone: '+61 8 9342 1109',
    address: 'Lot 402 Great Eastern Highway, Kalgoorlie WA 6430',
    isoComplianceNotes: 'All structural beams require AS/NZS 1554.1 weld certifications and ultrasound trace files. Supplier certificate of conformity mandatory.',
    relationType: 'Client'
  },
  {
    id: 'CLI-2026-SUP0',
    name: 'Action Aluminium Pty Ltd',
    companyName: 'Action Aluminium',
    email: 'sales@actionaluminium.com.au',
    phone: '1300 300 400',
    address: '22 Assembly Drive, Brisbane QLD 4000',
    isoComplianceNotes: 'Certified ISO 9001 Supplier of architectural and structural aluminium extrusions with full testing traces.',
    relationType: 'Supplier'
  },
  {
    id: 'CLI-2026-0004',
    name: 'Royal Brisbane Hospital Trust',
    companyName: 'Queensland Health Infrastructure',
    email: 'procurement.hospital@health.qld.gov.au',
    phone: '+61 7 3646 8111',
    address: 'Butterfield St, Herston QLD 4029',
    isoComplianceNotes: 'Strict material sanitization audit and optical clear lens certification. High hygiene cleanroom assembly standards required for patient safety.',
    relationType: 'Client'
  }
];

export const INITIAL_MATERIALS: Material[] = [
  {
    id: 'MAT-2026-0001',
    name: 'RHS 100x50x4.0mm Rectangular Hollow Section',
    type: 'RHS',
    dimensions: '100x50x4mm x 6000mm length',
    grade: 'Grade C350L0',
    totalStock: 24,
    allocatedStock: 8,
    availableStock: 16,
    unit: 'Lengths',
    supplier: 'BHP Steel Products Australia',
    batchNo: 'BHP-MILL-88019-X',
    invoiceNo: 'INV-BH-2026-928',
    materialCertUrl: 'https://iso-certs.company-archive.net/certs/BHP-88019-X.pdf',
    poNumber: 'PO-99120',
    receivedByUserId: 'usr-2',
    receiptDate: '2026-05-10',
    price: 120.0,
    quantityPurchased: 24.0
  },
  {
    id: 'MAT-2026-0002',
    name: 'SHS 50x50x3.0mm Square Hollow Section',
    type: 'SHS',
    dimensions: '50x50x3mm x 6000mm length',
    grade: 'Grade C350L0',
    totalStock: 35,
    allocatedStock: 4,
    availableStock: 31,
    unit: 'Lengths',
    supplier: 'Liberty Steel Group',
    batchNo: 'LIB-CO-92431-Y',
    invoiceNo: 'INV-LS-2026-1182',
    materialCertUrl: 'https://iso-certs.company-archive.net/certs/LIB-92431-Y.pdf',
    poNumber: 'PO-99121',
    receivedByUserId: 'usr-1',
    receiptDate: '2026-05-12',
    price: 45.0,
    quantityPurchased: 35.0
  },
  {
    id: 'MAT-2026-0003',
    name: '10mm Mild Steel Structural Plate Sheet',
    type: 'Plate',
    dimensions: '2400x1200x10mm plate',
    grade: 'Grade AS3678-350',
    totalStock: 12,
    allocatedStock: 3,
    availableStock: 9,
    unit: 'Sheets',
    supplier: 'BlueScope Distribution Pty',
    batchNo: 'BLU-HEAT-71110-A',
    invoiceNo: 'INV-BSD-882190',
    materialCertUrl: 'https://iso-certs.company-archive.net/certs/BLU-71110-A.pdf',
    poNumber: 'PO-99132',
    receivedByUserId: 'usr-2',
    receiptDate: '2026-05-15',
    price: 310.0,
    quantityPurchased: 12.0
  },
  {
    id: 'MAT-2026-0004',
    name: '12mm Steel Flat Bar 50mm Width',
    type: 'Flat Bar',
    dimensions: '50x12mm x 6000mm length',
    grade: 'Grade AS3678-250',
    totalStock: 40,
    allocatedStock: 10,
    availableStock: 30,
    unit: 'Lengths',
    supplier: 'Vulcan Steel Steel Supplies',
    batchNo: 'VUL-MILL-50992-B',
    invoiceNo: 'INV-VULC-400192',
    materialCertUrl: 'https://iso-certs.company-archive.net/certs/VUL-50992-B.pdf',
    poNumber: 'PO-99144',
    receivedByUserId: 'usr-2',
    receiptDate: '2026-05-18',
    price: 28.5,
    quantityPurchased: 40.0
  },
  {
    id: 'MAT-2026-0005',
    name: 'DEVO Metal Spun Housing Front-Shell',
    type: 'Other',
    dimensions: 'Diameter 320mm x depth 150mm',
    grade: 'Spun structural Aluminium',
    totalStock: 12, // Needs 50, so deficient!
    allocatedStock: 0,
    availableStock: 12,
    unit: 'Units',
    supplier: 'Queensland Metal Spinners',
    batchNo: 'QMS-SPUN-DEVO-019',
    invoiceNo: 'INV-QMS-4482',
    materialCertUrl: 'https://iso-certs.company-archive.net/certs/QMS-DEVO-SHELL.pdf',
    poNumber: 'PO-99155',
    receivedByUserId: 'usr-3',
    receiptDate: '2026-06-10',
    price: 85.0,
    quantityPurchased: 12.0
  },
  {
    id: 'MAT-2026-0006',
    name: 'Aluminium Pole 2.4m CHS Profile',
    type: 'CHS',
    dimensions: '50mm diameter @ 2400mm length',
    grade: 'Grade 6060-T5 Ally',
    totalStock: 15, // Needs 50, so deficient!
    allocatedStock: 4,
    availableStock: 11,
    unit: 'Lengths',
    supplier: 'Alspec Aluminium Pty Ltd',
    batchNo: 'ALS-ALLY-902-Z',
    invoiceNo: 'INV-AL-901192',
    materialCertUrl: 'https://iso-certs.company-archive.net/certs/ALS-902-Z.pdf',
    poNumber: 'PO-99156',
    receivedByUserId: 'usr-2',
    receiptDate: '2026-06-11',
    price: 135.0,
    quantityPurchased: 15.0
  },
  {
    id: 'MAT-2026-0007',
    name: 'EPLAS Acrylic Plastic Sheet Clear',
    type: 'Plate',
    dimensions: '2440x1220x4.0mm sheets',
    grade: 'Optically clear PMMA Acrylic',
    totalStock: 15, // 15 sheets = 150 lenses; plenty of stock!
    allocatedStock: 0,
    availableStock: 15,
    unit: 'Sheets',
    supplier: 'EPLAS Specialty Plastics',
    batchNo: 'EPL-ACRYLIC-771',
    invoiceNo: 'INV-EPLAS-2009',
    materialCertUrl: 'https://iso-certs.company-archive.net/certs/EPLAS-ACRYLIC-771-CERT.pdf',
    poNumber: 'PO-99157',
    receivedByUserId: 'usr-1',
    receiptDate: '2026-06-12',
    price: 75.0,
    quantityPurchased: 15.0
  },
  {
    id: 'MAT-2026-0008',
    name: 'Acetal Polymer Round Lathe Rod Black',
    type: 'Other',
    dimensions: '50mm diameter x 3000mm length',
    grade: 'Pom-C engineering plastic',
    totalStock: 2, // Needs 5, so deficient!
    allocatedStock: 0,
    availableStock: 2,
    unit: 'Lengths',
    supplier: 'Plastics Unlimited',
    batchNo: 'PLU-ACETAL-M88',
    invoiceNo: 'INV-PL-88219',
    materialCertUrl: 'https://iso-certs.company-archive.net/certs/PLU-ACETAL-M88.pdf',
    poNumber: 'PO-99158',
    receivedByUserId: 'usr-2',
    receiptDate: '2026-06-12',
    price: 110.0,
    quantityPurchased: 2.0
  },
  {
    id: 'MAT-ACT-0001',
    name: 'Security Grille 6063 T6',
    type: 'Other',
    dimensions: '7.0mm x 1250 x 2460 M/F',
    grade: '6063 T6',
    totalStock: 1.0,
    allocatedStock: 0,
    availableStock: 1.0,
    unit: 'Units',
    supplier: 'Action Aluminium',
    batchNo: 'ACT-75213985-A',
    invoiceNo: '75213985',
    poNumber: 'PO-ACT-75213985',
    receivedByUserId: 'usr-2',
    receiptDate: '2025-07-11',
    price: 285.00,
    quantityPurchased: 1.0
  },
  {
    id: 'MAT-ACT-0002',
    name: 'Angle 6060 T5',
    type: 'Other',
    dimensions: '40.0 x 20.0 x 1.5 x 6.5 mtr',
    grade: '6060 T5',
    totalStock: 1.0,
    allocatedStock: 0,
    availableStock: 1.0,
    unit: 'Lengths',
    supplier: 'Action Aluminium',
    batchNo: 'ACT-75215687-B',
    invoiceNo: '75215687',
    poNumber: 'PO-ACT-75215687',
    receivedByUserId: 'usr-1',
    receiptDate: '2025-07-25',
    price: 35.10,
    quantityPurchased: 1.0
  },
  {
    id: 'MAT-ACT-0003',
    name: 'Sheet 5005 H34',
    type: 'Plate',
    dimensions: '6.0mm x 1200mm x 2400mm',
    grade: '5005 H34',
    totalStock: 1.0,
    allocatedStock: 0,
    availableStock: 1.0,
    unit: 'Sheets',
    supplier: 'Action Aluminium',
    batchNo: 'ACT-75216620-C',
    invoiceNo: '75216620',
    poNumber: 'PO-ACT-75216620',
    receivedByUserId: 'usr-2',
    receiptDate: '2025-08-01',
    price: 391.19,
    quantityPurchased: 1.0
  },
  {
    id: 'MAT-ACT-0004',
    name: 'Round Tube 6061 ROT4844',
    type: 'CHS',
    dimensions: '24.4m',
    grade: '6061',
    totalStock: 1.0,
    allocatedStock: 0,
    availableStock: 1.0,
    unit: 'Lengths',
    supplier: 'Action Aluminium',
    batchNo: 'ACT-75218645-D',
    invoiceNo: '75218645',
    poNumber: 'PO-ACT-75218645',
    receivedByUserId: 'usr-2',
    receiptDate: '2025-08-20',
    price: 478.73,
    quantityPurchased: 1.0
  },
  {
    id: 'MAT-ACT-0005',
    name: 'Machine Solid 2011',
    type: 'Other',
    dimensions: 'solid 2011 x 3.6m',
    grade: '2011',
    totalStock: 10.8,
    allocatedStock: 0,
    availableStock: 10.8,
    unit: 'Lengths',
    supplier: 'Action Aluminium',
    batchNo: 'ACT-75235610-E',
    invoiceNo: '75235610',
    poNumber: 'PO-ACT-75235610',
    receivedByUserId: 'usr-1',
    receiptDate: '2026-01-14',
    price: 107.20,
    quantityPurchased: 10.8
  },
  {
    id: 'MAT-ACT-0006',
    name: 'Angle 6061 T6',
    type: 'Other',
    dimensions: '38.1 x 38.1 x 4.75 x 5.5 mtr',
    grade: '6061 T6',
    totalStock: 1.0,
    allocatedStock: 0,
    availableStock: 1.0,
    unit: 'Lengths',
    supplier: 'Action Aluminium',
    batchNo: 'ACT-75239363-F1',
    invoiceNo: '75239363',
    poNumber: 'PO-ACT-75239363',
    receivedByUserId: 'usr-2',
    receiptDate: '2026-02-17',
    price: 1783.32,
    quantityPurchased: 1.0
  },
  {
    id: 'MAT-ACT-0007',
    name: 'Flat Bar 6061 T6',
    type: 'Flat Bar',
    dimensions: '50.0 x 100.0 x 2.5 mtr',
    grade: '6061 T6',
    totalStock: 1.0,
    allocatedStock: 0,
    availableStock: 1.0,
    unit: 'Lengths',
    supplier: 'Action Aluminium',
    batchNo: 'ACT-75239363-F2',
    invoiceNo: '75239363',
    poNumber: 'PO-ACT-75239363',
    receivedByUserId: 'usr-2',
    receiptDate: '2026-02-17',
    price: 337.64,
    quantityPurchased: 1.0
  },
  {
    id: 'MAT-ACT-0008',
    name: 'Round Tube 6060 T591 80mm',
    type: 'CHS',
    dimensions: '80.0 x 2.0 x 6.5 mtr',
    grade: '6060 T591',
    totalStock: 1.0,
    allocatedStock: 0,
    availableStock: 1.0,
    unit: 'Lengths',
    supplier: 'Action Aluminium',
    batchNo: 'ACT-75239363-F3',
    invoiceNo: '75239363',
    poNumber: 'PO-ACT-75239363',
    receivedByUserId: 'usr-2',
    receiptDate: '2026-02-17',
    price: 49.12,
    quantityPurchased: 1.0
  },
  {
    id: 'MAT-ACT-0009',
    name: 'Round Tube 6060 T591 ROT3216',
    type: 'CHS',
    dimensions: '32.0 X 1.6 3M LENGTHS',
    grade: '6060 T591',
    totalStock: 812.5,
    allocatedStock: 0,
    availableStock: 812.5,
    unit: 'Lengths',
    supplier: 'Action Aluminium',
    batchNo: 'ACT-75242191-G',
    invoiceNo: '75242191',
    poNumber: 'PO-ACT-75242191',
    receivedByUserId: 'usr-2',
    receiptDate: '2026-03-10',
    price: 4.81,
    quantityPurchased: 812.5
  },
  {
    id: 'MAT-ACT-0010',
    name: 'Machine Solid 2011 T6 MS55',
    type: 'Other',
    dimensions: '55MMX3.6M PER METRE',
    grade: '2011 T6',
    totalStock: 18.0,
    allocatedStock: 0,
    availableStock: 18.0,
    unit: 'Lengths',
    supplier: 'Action Aluminium',
    batchNo: 'ACT-75243006-H',
    invoiceNo: '75243006',
    poNumber: 'PO-ACT-75243006',
    receivedByUserId: 'usr-2',
    receiptDate: '2026-03-19',
    price: 113.23,
    quantityPurchased: 18.0
  },
  {
    id: 'MAT-ACT-0011',
    name: 'Round Solid 6061 T6',
    type: 'Other',
    dimensions: '50.8mm x 4.0 mtr',
    grade: '6061 T6',
    totalStock: 2.0,
    allocatedStock: 0,
    availableStock: 2.0,
    unit: 'Lengths',
    supplier: 'Action Aluminium',
    batchNo: 'ACT-75251086-I',
    invoiceNo: '75251086',
    poNumber: 'PO-ACT-75251086',
    receivedByUserId: 'usr-2',
    receiptDate: '2026-05-26',
    price: 82.05,
    quantityPurchased: 2.0
  },
  {
    id: 'MAT-ACT-0012',
    name: 'Aluminium Plate Sheet 5005 H34 3mm',
    type: 'Plate',
    dimensions: '3.0mm x 1200mm x 2400mm',
    grade: '5005 H34',
    totalStock: 10.0,
    allocatedStock: 0,
    availableStock: 10.0,
    unit: 'Sheets',
    supplier: 'Action Aluminium',
    batchNo: 'ACT-75239363-EXP1',
    invoiceNo: '75239363',
    poNumber: 'PO-ACT-75239363',
    receivedByUserId: 'usr-2',
    receiptDate: '2026-02-17',
    price: 185.00,
    quantityPurchased: 10.0
  },
  {
    id: 'MAT-ACT-0013',
    name: 'Optical PMMA Plexiglass Panel 4mm',
    type: 'Plate',
    dimensions: '4.0mm x 1220mm x 2440mm',
    grade: 'Optically Clear PMMA',
    totalStock: 5.0,
    allocatedStock: 0,
    availableStock: 5.0,
    unit: 'Sheets',
    supplier: 'Action Aluminium',
    batchNo: 'ACT-75239363-EXP2',
    invoiceNo: '75239363',
    poNumber: 'PO-ACT-75239363',
    receivedByUserId: 'usr-1',
    receiptDate: '2026-02-17',
    price: 95.00,
    quantityPurchased: 5.0
  },
  {
    id: 'MAT-2026-0009',
    name: 'Stainless Steel Fastening Screws M4',
    type: 'Other',
    dimensions: 'M4 x 12mm hex head specs',
    grade: '316 Marine Grade Stainless',
    totalStock: 500,
    allocatedStock: 0,
    availableStock: 500,
    unit: 'Units',
    supplier: 'Action Aluminium Hardware',
    batchNo: 'ACT-75239363-EXP3',
    invoiceNo: '75239363',
    poNumber: 'PO-ACT-75239363',
    receivedByUserId: 'usr-2',
    receiptDate: '2026-02-17',
    price: 1.50,
    quantityPurchased: 500
  }
];

export const INITIAL_ITEMS: Item[] = [
  {
    id: 'ITM-2026-0001',
    name: 'Heavy Base Welded Scaffold Crane Block',
    itemCode: 'ITM-9001-A',
    description: 'Complex crane block assembly. Contains nested structural frame and secondary mounting ear bracket plates.',
    materials: [
      { materialId: 'MAT-2026-0001', name: 'RHS 100x50x4.0mm Rectangular Hollow Section', qtyNeeded: 2 },
      { materialId: 'MAT-2026-0003', name: '10mm Mild Steel Structural Plate Sheet', qtyNeeded: 0.5 }
    ],
    cutList: [
      { type: 'RHS', description: 'Primary Tension Rail', size: '100x50x4mm', lengthMm: 2400, qty: 2 },
      { type: 'RHS', description: 'Transverse Stabilizer', size: '100x50x4mm', lengthMm: 950, qty: 4 },
      { type: 'Plate', description: 'Reinforcing Gusset Plate', size: '10mm Plate', lengthMm: 300, qty: 6 }
    ],
    processes: [
      { name: 'CNC Steel Tube Cutting', estimatedHours: 2.0, sequence: 1 },
      { name: 'Fitter Assembly & Clamping', estimatedHours: 3.5, sequence: 2 },
      { name: 'AS1554.1 Structural Welding', estimatedHours: 6.0, sequence: 3 },
      { name: 'Quality Inspection & Heat Trace Stamping', estimatedHours: 1.5, sequence: 4 }
    ],
    drawings: [
      { name: 'SCAFF-BLOCK-3D-ASSEMBLY.pdf', fileType: 'PDF', fileSize: '4.8 MB', uploadDate: '2026-06-02', uploadedBy: 'Robert Vance', designVersion: 'Rev 3' },
      { name: 'SCAFF-BLOCK-BASE-PART.dxf', fileType: 'DXF', fileSize: '1.2 MB', uploadDate: '2026-06-03', uploadedBy: 'Robert Vance', designVersion: 'Rev 3' },
      { name: 'SCAFF-PLATE-EAR-CONN.dxf', fileType: 'DXF', fileSize: '850 KB', uploadDate: '2026-06-03', uploadedBy: 'Amelia Sterling', designVersion: 'Rev 1.2' }
    ],
    subItems: [
      { childItemId: 'ITM-2026-0002', qty: 1 }, // Nested frame
      { childItemId: 'ITM-2026-0003', qty: 2 }  // Nested Flange plate
    ],
    dateCreated: '2026-06-01',
    createdBy: 'Robert Vance'
  },
  {
    id: 'ITM-2026-0002',
    name: 'Steel Base Chassis Frame',
    itemCode: 'ITM-9002-B',
    description: 'Chassis chassis frame manufactured using high-tensile RHS structural hollow tubing.',
    materials: [
      { materialId: 'MAT-2026-0001', name: 'RHS 100x50x4.0mm Rectangular Hollow Section', qtyNeeded: 1.5 }
    ],
    cutList: [
      { type: 'RHS', description: 'Main Frame Rail', size: '100x50x4mm', lengthMm: 1800, qty: 2 },
      { type: 'RHS', description: 'Cross Member Support', size: '100x50x4mm', lengthMm: 850, qty: 6 }
    ],
    processes: [
      { name: 'Abrasive Cutoff', estimatedHours: 1.5, sequence: 1 },
      { name: 'MIG Welding Structural Prep', estimatedHours: 4.0, sequence: 2 },
      { name: 'Tolerances Final Verification', estimatedHours: 1.0, sequence: 3 }
    ],
    drawings: [
      { name: 'CHASSIS-FRAME-DIMS.pdf', fileType: 'PDF', fileSize: '2.1 MB', uploadDate: '2026-05-18', uploadedBy: 'Amelia Sterling', designVersion: 'Rev B' },
      { name: 'CHASSIS-FRAME-NEST.dxf', fileType: 'DXF', fileSize: '700 KB', uploadDate: '2026-05-19', uploadedBy: 'Robert Vance', designVersion: 'Rev B' }
    ],
    subItems: [],
    dateCreated: '2026-05-18',
    createdBy: 'Amelia Sterling'
  },
  {
    id: 'ITM-2026-0003',
    name: 'Custom Flange Plate v2',
    itemCode: 'ITM-9003-C',
    description: 'Laser-cut mounting flange ear. Drilled mounting holes for secondary connection bolts.',
    materials: [
      { materialId: 'MAT-2026-0003', name: '10mm Mild Steel Structural Plate Sheet', qtyNeeded: 0.25 }
    ],
    cutList: [
      { type: 'Plate', description: 'Bolt Connection Plate', size: '10mm Plate', lengthMm: 200, qty: 4 }
    ],
    processes: [
      { name: 'HD Plasma Cutting', estimatedHours: 1.0, sequence: 1 },
      { name: 'CNC Drilling & Deburring', estimatedHours: 1.5, sequence: 2 }
    ],
    drawings: [
      { name: 'FLANGE-PLATE-V2-DETAIL.pdf', fileType: 'PDF', fileSize: '1.4 MB', uploadDate: '2026-05-20', uploadedBy: 'Robert Vance', designVersion: 'Rev 1' },
      { name: 'FLANGE-DRILL-SPEC.dxf', fileType: 'DXF', fileSize: '440 KB', uploadDate: '2026-05-20', uploadedBy: 'Robert Vance', designVersion: 'Rev 1' }
    ],
    subItems: [],
    dateCreated: '2026-05-20',
    createdBy: 'Robert Vance'
  },
  {
    id: 'ITM-CAM-1011',
    name: 'Security Camera Housing with Pole',
    itemCode: 'CAM-9001-A',
    description: 'Security camera housing with a spun-metal front-shell (DEVO), aluminium 2.4m CHS pole with drilled mounting holes, in-house blow-molded acrylic lens and lathe-turned spacer ring. Coated finish and manual line assembly.',
    materials: [
      { materialId: 'MAT-2026-0005', name: 'DEVO Metal Spun Housing Front-Shell', qtyNeeded: 1 },
      { materialId: 'MAT-2026-0006', name: 'Aluminium Pole 2.4m CHS Profile', qtyNeeded: 1 },
      { materialId: 'MAT-2026-0007', name: 'EPLAS Acrylic Plastic Sheet Clear', qtyNeeded: 0.1 },
      { materialId: 'MAT-2026-0008', name: 'Acetal Polymer Round Lathe Rod Black', qtyNeeded: 0.1 }
    ],
    cutList: [
      { type: 'CHS', description: 'Mounting Pole Stem', size: '50mm CHS x 2.4m', lengthMm: 2400, qty: 1 },
      { type: 'Plate', description: 'Acrylic Lens Sheet raw prep', size: '4mm Thick Acrylic', lengthMm: 300, qty: 1 }
    ],
    processes: [
      { name: 'Final Assembly Line Routing', estimatedHours: 2.5, sequence: 1 },
      { name: 'QMS Compliance Verify Stamp', estimatedHours: 1.0, sequence: 2 }
    ],
    drawings: [
      { name: 'CAM-HOUSING-3D-EXPLODED.pdf', fileType: 'PDF', fileSize: '4.2 MB', uploadDate: '2026-06-13', uploadedBy: 'Robert Vance', designVersion: 'Rev 1' }
    ],
    subItems: [
      { childItemId: 'ITM-CAM-PART-DEVO', qty: 1 },
      { childItemId: 'ITM-CAM-PART-POLE', qty: 1 },
      { childItemId: 'ITM-CAM-PART-LENS', qty: 1 },
      { childItemId: 'ITM-CAM-PART-SPACER', qty: 1 }
    ],
    dateCreated: '2026-06-13',
    createdBy: 'Robert Vance'
  },
  {
    id: 'ITM-CAM-PART-DEVO',
    name: 'DEVO Metal Spun Front-Shell',
    itemCode: 'CAM-PART-DEVO',
    description: 'Sourced from Queensland Metal Spinners. Requires preparation, surface treatment, and architectural powder coating finish.',
    materials: [
      { materialId: 'MAT-2026-0005', name: 'DEVO Metal Spun Housing Front-Shell', qtyNeeded: 1 }
    ],
    cutList: [],
    processes: [
      { name: 'Powder Coating (DEVO & Pole)', estimatedHours: 2.0, sequence: 1 }
    ],
    drawings: [
      { name: 'DEVO-SPUN-SHELL-REV2.pdf', fileType: 'PDF', fileSize: '2.5 MB', uploadDate: '2026-06-13', uploadedBy: 'Robert Vance', designVersion: 'Rev 2' }
    ],
    subItems: [],
    dateCreated: '2026-06-13',
    createdBy: 'Robert Vance'
  },
  {
    id: 'ITM-CAM-PART-POLE',
    name: '2.4m CHS Aluminium Mounting Pole',
    itemCode: 'CAM-PART-POLE',
    description: 'Aluminium support stem. Requires CNC mill drilling for secure bracket holes and exterior powder coating.',
    materials: [
      { materialId: 'MAT-2026-0006', name: 'Aluminium Pole 2.4m CHS Profile', qtyNeeded: 1 }
    ],
    cutList: [
      { type: 'CHS', description: 'Mounting Pole Stem', size: '50mm CHS x 2.4m', lengthMm: 2400, qty: 1 }
    ],
    processes: [
      { name: 'CNC Drilling & Deburring', estimatedHours: 1.5, sequence: 1 },
      { name: 'Powder Coating (DEVO & Pole)', estimatedHours: 2.0, sequence: 2 }
    ],
    drawings: [
      { name: 'ALLY-POLE-2.4M-DRILLING-REVB.dxf', fileType: 'DXF', fileSize: '1.1 MB', uploadDate: '2026-06-13', uploadedBy: 'Robert Vance', designVersion: 'Rev B' }
    ],
    subItems: [],
    dateCreated: '2026-06-13',
    createdBy: 'Robert Vance'
  },
  {
    id: 'ITM-CAM-PART-LENS',
    name: 'Blown Acrylic Camera Lens Dome',
    itemCode: 'CAM-PART-LENS',
    description: 'Optically clear dome lens. Cut to size from EPLAS sheets, thermo blow-molded in-house, prepped, and drilled with four mounting alignment holes.',
    materials: [
      { materialId: 'MAT-2026-0007', name: 'EPLAS Acrylic Plastic Sheet Clear', qtyNeeded: 0.1 }
    ],
    cutList: [
      { type: 'Plate', description: 'Acrylic Lens Sheet raw prep', size: '4mm Thick Acrylic', lengthMm: 300, qty: 1 }
    ],
    processes: [
      { name: 'Abrasive Cutoff', estimatedHours: 0.5, sequence: 1 },
      { name: 'In-House Blow Mold Lens', estimatedHours: 1.0, sequence: 2 },
      { name: 'Acrylic Lens Finishing & Drilling', estimatedHours: 1.0, sequence: 3 }
    ],
    drawings: [
      { name: 'ACRYLIC-LENS-BLOW-MOLD-REVA.pdf', fileType: 'PDF', fileSize: '3.2 MB', uploadDate: '2026-06-13', uploadedBy: 'Robert Vance', designVersion: 'Rev A' }
    ],
    subItems: [],
    dateCreated: '2026-06-13',
    createdBy: 'Robert Vance'
  },
  {
    id: 'ITM-CAM-PART-SPACER',
    name: 'Machined Plastic Spacer Ring',
    itemCode: 'CAM-PART-SPACER',
    description: 'In-house lathe-turned acetal spacer ring to isolate acrylic dome-lens and aluminium chassis.',
    materials: [
      { materialId: 'MAT-2026-0008', name: 'Acetal Polymer Round Lathe Rod Black', qtyNeeded: 0.1 }
    ],
    cutList: [],
    processes: [
      { name: 'Lathe Machining (Plastic spacer)', estimatedHours: 1.0, sequence: 1 }
    ],
    drawings: [
      { name: 'LATHE-PLASTIC-SPACER-REV1.dxf', fileType: 'DXF', fileSize: '850 KB', uploadDate: '2026-06-13', uploadedBy: 'Robert Vance', designVersion: 'Rev 1' }
    ],
    subItems: [],
    dateCreated: '2026-06-13',
    createdBy: 'Robert Vance'
  },
  {
    id: 'ITM-EXP-001-P1',
    name: 'Corner Mount Structural Bracket Plate',
    itemCode: 'EXP-001-P1',
    description: 'Folded corner mounting interface plate laser cut from 3mm 5005 Aluminium sheet.',
    materials: [
      { materialId: 'MAT-ACT-0012', name: 'Aluminium Plate Sheet 5005 H34 3mm', qtyNeeded: 1 }
    ],
    cutList: [
      { type: 'Plate', description: 'Folded Corner Mount Plate', size: '3mm Aluminium', lengthMm: 250, qty: 1 }
    ],
    processes: [
      { name: 'CNC Laser Aluminium Plate Profiling', estimatedHours: 0.5, sequence: 1 },
      { name: 'Manual Press Folding', estimatedHours: 0.5, sequence: 2 }
    ],
    drawings: [
      { name: 'EXP-1-BRACKET-PLATE-REVA.dxf', fileType: 'DXF', fileSize: '1.4 MB', uploadDate: '2026-06-20', uploadedBy: 'Robert Vance', designVersion: 'Rev A' }
    ],
    subItems: [],
    dateCreated: '2026-06-20',
    createdBy: 'Robert Vance'
  },
  {
    id: 'ITM-EXP-001-P2',
    name: 'Cam Housing Face Cover Plate',
    itemCode: 'EXP-001-P2',
    description: 'Laser cut shield sheet cover with bevel-routed circular camera lens aperture cutout.',
    materials: [
      { materialId: 'MAT-ACT-0012', name: 'Aluminium Plate Sheet 5005 H34 3mm', qtyNeeded: 1 }
    ],
    cutList: [
      { type: 'Plate', description: 'Beveled Face Cover', size: '3mm Aluminium', lengthMm: 180, qty: 1 }
    ],
    processes: [
      { name: 'CNC Laser Aluminum Profiling', estimatedHours: 0.4, sequence: 1 },
      { name: 'Edge Bevel Routing', estimatedHours: 0.6, sequence: 2 }
    ],
    drawings: [
      { name: 'EXP-1-FACE-COVER-DETAILS.pdf', fileType: 'PDF', fileSize: '2.1 MB', uploadDate: '2026-06-20', uploadedBy: 'Amelia Sterling', designVersion: 'Rev 1.0' }
    ],
    subItems: [],
    dateCreated: '2026-06-20',
    createdBy: 'Amelia Sterling'
  },
  {
    id: 'ITM-EXP-001-P3',
    name: 'Optical Clear Plexiglass Window',
    itemCode: 'EXP-001-P3',
    description: 'Optically clear viewing lens cut from PMMA Acrylic plate and micro-sanded for edge smoothing.',
    materials: [
      { materialId: 'MAT-ACT-0013', name: 'Optical PMMA Plexiglass Panel 4mm', qtyNeeded: 1 }
    ],
    cutList: [
      { type: 'Plate', description: 'Optical Clear Window Lens', size: '4mm Acrylic', lengthMm: 150, qty: 1 }
    ],
    processes: [
      { name: 'CNC Plastic Routing & Drilling', estimatedHours: 0.5, sequence: 1 },
      { name: 'Manual Edge Micro-Sanding & Novus Polishing', estimatedHours: 1.2, sequence: 2 }
    ],
    drawings: [
      { name: 'EXP-1-PLEXI-WINDOW-REVB.dxf', fileType: 'DXF', fileSize: '950 KB', uploadDate: '2026-06-20', uploadedBy: 'Amelia Sterling', designVersion: 'Rev B' }
    ],
    subItems: [],
    dateCreated: '2026-06-20',
    createdBy: 'Amelia Sterling'
  },
  {
    id: 'ITM-EXP-001',
    name: 'Hospital Camera Corner Mount Housing Spec',
    itemCode: 'EXP-001',
    description: 'Corner-mounted protective security camera enclosure designed for medical surveillance wards. Standard features include sand-polished optical clear plexiglass viewing window, TIG welded aluminium support brackets, pure white powder paint coating finish, and secure stainless fastening bolts.',
    materials: [
      { materialId: 'MAT-ACT-0012', name: 'Aluminium Plate Sheet 5005 H34 3mm', qtyNeeded: 2 },
      { materialId: 'MAT-ACT-0013', name: 'Optical PMMA Plexiglass Panel 4mm', qtyNeeded: 1 },
      { materialId: 'MAT-2026-0009', name: 'Stainless Steel Fastening Screws M4', qtyNeeded: 4 }
    ],
    cutList: [
      { type: 'Plate', description: 'M4 Stainless Mounting Screws Pack', size: 'Standard Hex', lengthMm: 12, qty: 4 }
    ],
    processes: [
      { name: 'CNC Machine Profiling & Router Drilling', estimatedHours: 1.0, sequence: 1 },
      { name: 'Acrylic Roughening & Plexiglass Sand Polishing', estimatedHours: 1.5, sequence: 2 },
      { name: 'Precision TIG Aluminium Fillet Welding', estimatedHours: 2.0, sequence: 3 },
      { name: 'Epoxy Powder Coating - Pearl Gloss White Coating', estimatedHours: 2.0, sequence: 4 },
      { name: 'Fastening Stainless Assembly & Seal Test', estimatedHours: 1.5, sequence: 5 }
    ],
    drawings: [
      { name: 'EXP-001-HOSP-SECURITY-CAM-3D.pdf', fileType: 'PDF', fileSize: '4.9 MB', uploadDate: '2026-06-20', uploadedBy: 'Robert Vance', designVersion: 'Rev 1.4' }
    ],
    subItems: [
      { childItemId: 'ITM-EXP-001-P1', qty: 1 },
      { childItemId: 'ITM-EXP-001-P2', qty: 1 },
      { childItemId: 'ITM-EXP-001-P3', qty: 1 }
    ],
    dateCreated: '2026-06-20',
    createdBy: 'Robert Vance'
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'PRJ-2026-0001',
    title: 'High-Tensile Base Upgrades',
    clientId: 'CLI-2026-0001',
    jobCode: 'APX-PO-9002',
    status: 'Production',
    batchNo: 'ISO-B-26001', // Our custom batch identifier
    dateCreated: '2026-06-05',
    deadline: '2026-06-25',
    subProjects: [
      {
        itemId: 'ITM-2026-0001',
        qty: 2,
        batchNo: 'SUB-B-26001-A',
        processes: [
          { name: 'CNC Steel Tube Cutting', sequence: 1, assignedUserId: 'usr-5', status: 'Completed', completionDate: '2026-06-10', checkedByUserId: 'usr-2' },
          { name: 'Fitter Assembly & Clamping', sequence: 2, assignedUserId: 'usr-3', status: 'In Progress', notes: 'Using fixture jig B-12.' },
          { name: 'AS1554.1 Structural Welding', sequence: 3, assignedUserId: 'usr-3', status: 'Pending' },
          { name: 'Quality Inspection & Heat Trace Stamping', sequence: 4, assignedUserId: 'usr-4', status: 'Pending' }
        ],
        isOutsourced: false
      },
      {
        itemId: 'ITM-2026-0003',
        qty: 12,
        batchNo: 'SUB-B-26001-B',
        processes: [
          { name: 'HD Plasma Cutting', sequence: 1, assignedUserId: 'usr-7', status: 'Completed', completionDate: '2026-06-08', checkedByUserId: 'usr-1' },
          { name: 'CNC Drilling & Deburring', sequence: 2, assignedUserId: 'usr-6', status: 'Completed', completionDate: '2026-06-09', checkedByUserId: 'usr-2' }
        ],
        isOutsourced: true,
        outsourcedSupplierName: 'Metro Galvanising & Machining',
        outsourcedPoNumber: 'PO-77218',
        outsourcedBatchNo: 'MGM-GALV-998A',
        outsourcedCertUrl: 'https://iso-certs.company-archive.net/certs/MGM-GALV-998A-CHEM.pdf',
        outsourcedStatus: 'QA Passed'
      }
    ],
    includeStockItems: [
      { materialId: 'MAT-2026-0001', qty: 4, batchNoUsed: 'BHP-MILL-88019-X' },
      { materialId: 'MAT-2026-0003', qty: 1, batchNoUsed: 'BLU-HEAT-71110-A' }
    ],
    qualityCertGenerated: false
  },
  {
    id: 'PRJ-2026-0002',
    title: 'Support Structural Carriage',
    clientId: 'CLI-2026-0002',
    jobCode: 'TCE-M-4458',
    status: 'QA Inspection',
    batchNo: 'ISO-B-26002',
    dateCreated: '2026-06-01',
    deadline: '2026-06-18',
    subProjects: [
      {
        itemId: 'ITM-2026-0002',
        qty: 4,
        batchNo: 'SUB-B-26002-A',
        processes: [
          { name: 'Abrasive Cutoff', sequence: 1, assignedUserId: 'usr-6', status: 'Completed', completionDate: '2026-06-04', checkedByUserId: 'usr-2' },
          { name: 'MIG Welding Structural Prep', sequence: 2, assignedUserId: 'usr-3', status: 'Completed', completionDate: '2026-06-09', checkedByUserId: 'usr-2' },
          { name: 'Tolerances Final Verification', sequence: 3, assignedUserId: 'usr-4', status: 'In Progress', notes: 'Measuring diagonal tolerances, within +1mm limit.' }
        ],
        isOutsourced: false
      }
    ],
    includeStockItems: [
      { materialId: 'MAT-2026-0001', qty: 4, batchNoUsed: 'BHP-MILL-88019-X' },
      { materialId: 'MAT-2026-0002', qty: 4, batchNoUsed: 'LIB-CO-92431-Y' }
    ],
    qualityCertGenerated: true,
    qualityPassedDate: '2026-06-12',
    qualityPassedByUserId: 'usr-2'
  },
  {
    id: 'PRJ-2026-0003',
    title: '50 Security Camera Housings with Poles',
    clientId: 'CLI-2026-0002',
    jobCode: 'TCE-CAM-50',
    status: 'Production',
    batchNo: 'ISO-CAM-50',
    dateCreated: '2026-06-13',
    deadline: '2026-07-20',
    subProjects: [
      {
        itemId: 'ITM-CAM-1011',
        qty: 50,
        batchNo: 'SUB-CAM-50-A',
        isOutsourced: false,
        processes: [
          { name: 'In-House Sheet Pre-Cut', sequence: 1, assignedUserId: 'usr-3', status: 'Completed', completionDate: '2026-06-13', checkedByUserId: 'usr-2' },
          { name: 'In-House Blow Mold Lens', sequence: 2, assignedUserId: 'usr-3', status: 'In Progress', notes: 'Blowing acrylic mold shells under 140C control.' },
          { name: 'Acrylic Lens Finishing & Drilling', sequence: 3, assignedUserId: 'usr-4', status: 'Pending' },
          { name: 'Aluminium Pole Milling', sequence: 4, assignedUserId: 'usr-5', status: 'Pending' },
          { name: 'Lathe Machining (Plastic spacer)', sequence: 5, assignedUserId: 'usr-6', status: 'Pending' },
          { name: 'Powder Coating (DEVO & Pole)', sequence: 6, assignedUserId: 'usr-6', status: 'Pending' },
          { name: 'Final Assembly Line Routing', sequence: 7, assignedUserId: 'usr-7', status: 'Pending' },
          { name: 'QMS Compliance Verify Stamp', sequence: 8, assignedUserId: 'usr-1', status: 'Pending' }
        ]
      }
    ],
    includeStockItems: [
      { materialId: 'MAT-2026-0005', qty: 50, batchNoUsed: 'QMS-SPUN-DEVO-019' },
      { materialId: 'MAT-2026-0006', qty: 50, batchNoUsed: 'ALS-ALLY-902-Z' },
      { materialId: 'MAT-2026-0007', qty: 5, batchNoUsed: 'EPL-ACRYLIC-771' },
      { materialId: 'MAT-2026-0008', qty: 5, batchNoUsed: 'PLU-ACETAL-M88' }
    ],
    qualityCertGenerated: false
  },
  {
    id: 'PRJ-EXP-0001',
    title: 'Hospital ICU Surveillance Corner Housings',
    clientId: 'CLI-2026-0004',
    jobCode: 'QLD-HOSP-CAM-EXP',
    status: 'Completed',
    batchNo: 'ISO-EXP-001',
    dateCreated: '2026-06-18',
    deadline: '2026-06-25',
    subProjects: [
      {
        itemId: 'ITM-EXP-001',
        qty: 4,
        batchNo: 'SUB-EXP-001-A',
        isOutsourced: false,
        processes: [
          { name: 'CNC Machine Profiling & Router Drilling', sequence: 1, assignedUserId: 'usr-3', status: 'Completed', completionDate: '2026-06-18', checkedByUserId: 'usr-2' },
          { name: 'Acrylic Roughening & Plexiglass Sand Polishing', sequence: 2, assignedUserId: 'usr-4', status: 'Completed', completionDate: '2026-06-19', checkedByUserId: 'usr-2', notes: 'Sanding with 1200 grit. Corner micrometer fits hospital ICU bracket tolerances.' },
          { name: 'Precision TIG Aluminium Fillet Welding', sequence: 3, assignedUserId: 'usr-3', status: 'Completed', completionDate: '2026-06-19', checkedByUserId: 'usr-2' },
          { name: 'Epoxy Powder Coating - Pearl Gloss White Coating', sequence: 4, assignedUserId: 'usr-6', status: 'Completed', completionDate: '2026-06-20', checkedByUserId: 'usr-2' },
          { name: 'Fastening Stainless Assembly & Seal Test', sequence: 5, assignedUserId: 'usr-7', status: 'Completed', completionDate: '2026-06-20', checkedByUserId: 'usr-2' }
        ]
      }
    ],
    includeStockItems: [
      { materialId: 'MAT-ACT-0012', qty: 8, batchNoUsed: 'ACT-75239363-EXP1' },
      { materialId: 'MAT-ACT-0013', qty: 4, batchNoUsed: 'ACT-75239363-EXP2' },
      { materialId: 'MAT-2026-0009', qty: 16, batchNoUsed: 'ACT-75239363-EXP3' }
    ],
    qualityCertGenerated: true,
    qualityPassedDate: '2026-06-21',
    qualityPassedByUserId: 'usr-2'
  }
];

export const INITIAL_INVENTORY_LOGS: InventoryLog[] = [
  {
    id: 'LOG-2026-0001',
    type: 'INCOME',
    date: '2026-05-10T09:12:00',
    materialId: 'MAT-2026-0001',
    materialName: 'RHS 100x50x4.0mm Rectangular Hollow Section',
    quantity: 20,
    batchNo: 'BHP-MILL-88019-X',
    invoiceNo: 'INV-BH-2026-928',
    poNumber: 'PO-99120',
    userId: 'usr-2',
    notes: 'Primary material delivery from BHP Mill. Mill certificate checked and loaded to ISO cloud.'
  },
  {
    id: 'LOG-2026-0002',
    type: 'INCOME',
    date: '2026-05-12T11:04:00',
    materialId: 'MAT-2026-0002',
    materialName: 'SHS 50x50x3.0mm Square Hollow Section',
    quantity: 35,
    batchNo: 'LIB-CO-92431-Y',
    invoiceNo: 'INV-LS-2026-1182',
    poNumber: 'PO-99121',
    userId: 'usr-1',
    notes: 'Liberty stock checked. No mechanical defects noted.'
  },
  {
    id: 'LOG-2026-0003',
    type: 'INCOME',
    date: '2026-05-15T14:30:00',
    materialId: 'MAT-2026-0003',
    materialName: '10mm Mild Steel Structural Plate Sheet',
    quantity: 12,
    batchNo: 'BLU-HEAT-71110-A',
    invoiceNo: 'INV-BSD-882190',
    poNumber: 'PO-99132',
    userId: 'usr-2',
    notes: 'Plate steel from BlueScope. Heat trace BLU-HEAT-71110-A stamped on corner.'
  },
  {
    id: 'LOG-2026-0004',
    type: 'ALLOCATION',
    date: '2026-06-05T10:15:00',
    materialId: 'MAT-2026-0001',
    materialName: 'RHS 100x50x4.0mm Rectangular Hollow Section',
    quantity: 4,
    batchNo: 'BHP-MILL-88019-X',
    projectCode: 'PRJ-2026-0001',
    userId: 'usr-2',
    notes: 'Materials reserved for Apex project job code APX-PO-9002.'
  },
  {
    id: 'LOG-2026-0005',
    type: 'ALLOCATION',
    date: '2026-06-05T10:18:00',
    materialId: 'MAT-2026-0003',
    materialName: '10mm Mild Steel Structural Plate Sheet',
    quantity: 1,
    batchNo: 'BLU-HEAT-71110-A',
    projectCode: 'PRJ-2026-0001',
    userId: 'usr-2',
    notes: 'Plate allocated to heavy chassis block custom cutting.'
  },
  {
    id: 'LOG-EXP-INC01',
    type: 'INCOME',
    date: '2026-06-15T08:30:00',
    materialId: 'MAT-ACT-0012',
    materialName: 'Aluminium Plate Sheet 5005 H34 3mm',
    quantity: 10,
    batchNo: 'ACT-75239363-EXP1',
    invoiceNo: '75239363',
    poNumber: 'PO-ACT-75239363',
    userId: 'usr-2',
    notes: 'Incoming 10 sheets of Action Aluminium plate sheet under invoice #75239363. Inspected for edge flatness and mechanical marks.'
  },
  {
    id: 'LOG-EXP-INC02',
    type: 'INCOME',
    date: '2026-06-15T08:45:00',
    materialId: 'MAT-ACT-0013',
    materialName: 'Optical PMMA Plexiglass Panel 4mm',
    quantity: 5,
    batchNo: 'ACT-75239363-EXP2',
    invoiceNo: '75239363',
    poNumber: 'PO-ACT-75239363',
    userId: 'usr-1',
    notes: 'Incoming 5 PMMA Lucite acrylic sheets under invoice #75239363. Verified double-sided protective papermask is complete & intact.'
  },
  {
    id: 'LOG-EXP-INC03',
    type: 'INCOME',
    date: '2026-06-15T09:00:00',
    materialId: 'MAT-2026-0009',
    quantity: 500,
    materialName: 'Stainless Steel Fastening Screws M4',
    batchNo: 'ACT-75239363-EXP3',
    invoiceNo: '75239363',
    poNumber: 'PO-ACT-75239363',
    userId: 'usr-2',
    notes: 'High-tensile corrosion resistant fasteners. Received & cataloged inside structural storage vaults.'
  },
  {
    id: 'LOG-EXP-DED01',
    type: 'DELIVERY_OUT',
    date: '2026-06-21T15:30:00',
    materialId: 'MAT-ACT-0012',
    materialName: 'Aluminium Plate Sheet 5005 H34 3mm',
    quantity: 8,
    batchNo: 'ACT-75239363-EXP1',
    projectCode: 'PRJ-EXP-0001',
    userId: 'usr-2',
    notes: '[ISO-9001 Output Dispatch] Project marked Completed. Deducted 8 sheets of Aluminium Plate Sheet 5005 H34 from stock vaults to fabricate hospital camera mount frames.'
  },
  {
    id: 'LOG-EXP-DED02',
    type: 'DELIVERY_OUT',
    date: '2026-06-21T15:31:00',
    materialId: 'MAT-ACT-0013',
    materialName: 'Optical PMMA Plexiglass Panel 4mm',
    quantity: 4,
    batchNo: 'ACT-75239363-EXP2',
    projectCode: 'PRJ-EXP-0001',
    userId: 'usr-2',
    notes: '[ISO-9001 Output Dispatch] Project marked Completed. Deducted 4 sheets of Optical PMMA Plexiglass Panel from stock vaults to cut optical camera lens shields.'
  },
  {
    id: 'LOG-EXP-DED03',
    type: 'DELIVERY_OUT',
    date: '2026-06-21T15:32:00',
    materialId: 'MAT-2026-0009',
    materialName: 'Stainless Steel Fastening Screws M4',
    quantity: 16,
    batchNo: 'ACT-75239363-EXP3',
    projectCode: 'PRJ-EXP-0001',
    userId: 'usr-2',
    notes: '[ISO-9001 Output Dispatch] Project marked Completed. Deducted 16 units of Fastening M4 Bolts from hardware bins.'
  }
];
