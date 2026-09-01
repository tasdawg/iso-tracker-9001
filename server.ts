import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

// Multer file upload configuration
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const drawingsDir = path.join(uploadsDir, 'drawings');
if (!fs.existsSync(drawingsDir)) {
  fs.mkdirSync(drawingsDir, { recursive: true });
}
const csvDir = path.join(uploadsDir, 'csv');
if (!fs.existsSync(csvDir)) {
  fs.mkdirSync(csvDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, csvDir);
    } else {
      cb(null, drawingsDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    const uniqueName = `${base}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/pdf',
    'application/dxf',
    'application/dwg',
    'text/csv',
    'application/vnd.ms-excel',
    'text/plain'
  ];
  const allowedExts = ['.pdf', '.dxf', '.dwg', '.csv', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, DXF, DWG, CSV'));
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Legacy records store the flat /uploads/<file> path, but multer saves into subfolders
// (drawings/, csv/) — fall back to those folders so old links keep resolving.
app.get('/uploads/:file', (req, res, next) => {
  const name = req.params.file;
  if (!name.includes('/') && !fs.existsSync(path.join(uploadsDir, name))) {
    for (const sub of ['drawings', 'csv']) {
      const candidate = path.join(uploadsDir, sub, name);
      if (fs.existsSync(candidate)) {
        return res.sendFile(candidate);
      }
    }
  }
  next();
});

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const subDir = path.resolve(path.dirname(req.file.path)) === path.resolve(csvDir) ? 'csv' : 'drawings';
  const filePath = `/uploads/${subDir}/${req.file.filename}`;
  const fileSizeKB = Math.round(req.file.size / 1024);
  const fileSizeStr = fileSizeKB >= 1024 ? `${Math.round(fileSizeKB / 1024)} MB` : `${fileSizeKB} KB`;
  
  res.json({
    success: true,
    filename: req.file.filename,
    originalName: req.file.originalname,
    filePath,
    fileSize: fileSizeStr,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

// Upload mill cert for project sub-contract.
// Stores the file only — the client commits outsourcedCertUrl through /api/sync on save,
// so a later persistState can never overwrite an uploaded cert from stale local state.
app.post('/api/upload-mill-cert', upload.single('millCert'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { projectId } = req.body;
  if (!projectId) {
    return res.status(400).json({ error: 'Project ID required' });
  }

  const subDir = path.resolve(path.dirname(req.file.path)) === path.resolve(csvDir) ? 'csv' : 'drawings';
  const filePath = `/uploads/${subDir}/${req.file.filename}`;

  res.json({
    success: true,
    url: filePath,
    filename: req.file.filename,
    originalName: req.file.originalname
  });
});

// Ensure Setting record exists (seed on first run)
async function ensureSettingRecord() {
  try {
    const existing = await prisma.setting.findUnique({ where: { id: 'global' } });
    if (!existing) {
      await prisma.setting.create({
        data: {
          id: 'global',
          companyName: 'Apex Heavy Engineering HQ',
          accreditationBody: 'Lloyds Register Quality Assurance (LRQA)',
          stampCode: 'STAMP-9001-2026',
          facilityLocation: 'Melbourne Fabrication Hub Bay 4',
          saasTier: 'Enterprise',
          concurrentSeats: 25,
          autoSaves: true,
          syncFreq: 'Real-time Transaction Lock',
          ncrSeverities: undefined as any,
          publicUrl: ''
        }
      });
    }
  } catch (err) {
    console.warn('[Prisma] Setting seed skipped:', err);
  }
}

// Seed SQLite database table records if they are empty
async function seedDatabaseIfEmpty() {
  try {
    await ensureSettingRecord();
    
    // Seed Users if empty
    let usersCount = 0;
    try {
      usersCount = await prisma.user.count();
    } catch (e) {
      console.warn('[Prisma] Users table not initialized, skipping count check:', e);
    }
    if (usersCount === 0) {
      console.log('[Prisma] Seeding default users...');
      await prisma.user.createMany({
        data: [
          { id: 'usr-1', name: 'Robert Vance', role: 'Admin', avatar: 'RV' },
          { id: 'usr-2', name: 'Amelia Sterling', role: 'Production Manager', avatar: 'AS' },
          { id: 'usr-3', name: 'Jack Thompson', role: 'Worker', avatar: 'JT' },
          { id: 'usr-4', name: 'Marcus Brody', role: 'Worker', avatar: 'MB' },
          { id: 'usr-5', name: 'Liam Rodriguez', role: 'Worker', avatar: 'LR' },
          { id: 'usr-6', name: 'Chloe Chen', role: 'Worker', avatar: 'CC' },
          { id: 'usr-7', name: 'Siddharth Nair', role: 'Worker', avatar: 'SN' },
        ]
      });
      console.log('[Prisma] Default users seeded successfully!');
    }

    // Seed Stations if empty
    let stationCount = 0;
    try {
      stationCount = await prisma.station.count();
    } catch (e) {
      console.warn('[Prisma] Stations table not initialized, skipping count check:', e);
    }
    if (stationCount === 0) {
      console.log('[Prisma] Seeding default work stations...');
      await prisma.station.createMany({
        data: [
          { id: 'stn-1', name: 'Lathe' },
          { id: 'stn-2', name: 'Milling' },
          { id: 'stn-3', name: 'Pressbrake' },
          { id: 'stn-4', name: 'Bandsaw' },
          { id: 'stn-5', name: 'Finishing/Polishing' },
          { id: 'stn-6', name: 'Welding/Fabrication' },
          { id: 'stn-7', name: 'Powder coating' },
          { id: 'stn-8', name: 'Assembly' },
        ]
      });
      console.log('[Prisma] Default work stations seeded successfully!');
    }

    const clientsCount = await prisma.client.count();
    const hasHospitalClient = await prisma.client.findUnique({
      where: { id: 'CLI-2026-0004' }
    });
    if (clientsCount === 0 || !hasHospitalClient) {
      console.log('[Prisma] Database is empty or missing hospital template data. Loading and executing seed.sql...');
      const seedSqlPath = path.join(process.cwd(), 'prisma', 'seed.sql');
      if (fs.existsSync(seedSqlPath)) {
        const seedSql = fs.readFileSync(seedSqlPath, 'utf-8');
        // Strip SQL-style comments and split by semicolon
        const statements = seedSql
          .replace(/--.*$/gm, '')
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
          await prisma.$executeRawUnsafe(statement);
        }
        console.log('[Prisma] SQL Seeding successfully completed!');
      } else {
        console.error('[Prisma] seed.sql file not found at:', seedSqlPath);
      }
    } else {
      console.log('[Prisma] Database already contains records. Skipping SQL seeding.');
    }
  } catch (seedErr) {
    console.error('[Prisma] Error executing seed.sql:', seedErr);
  }
}

// Normalize process names in items and projects to match station names
async function normalizeProcessNames() {
  try {
    const stations = await prisma.station.findMany({ where: { isActive: true } });
    if (stations.length === 0) return;

    const stationNames = new Set(stations.map(s => s.name));
    
    // Fuzzy mapping table for common legacy process names → station names
    const nameMapping: [RegExp, string][] = [
      [/^lathe/i, 'Lathe'],
      [/cnc\s*lathe/i, 'Lathe'],
      [/milling/i, 'Milling'],
      [/cnc\s*mill/i, 'Milling'],
      [/pressbrake|panbreak|folding/i, 'Pressbrake'],
      [/\bbandsaw\b|\bbansaw\b/i, 'Bandsaw'],
      [/sanding|finishing|polishing/i, 'Finishing/Polishing'],
      [/powder\s*coating/i, 'Powder coating'],
      [/welding|fabrication/i, 'Welding/Fabrication'],
      [/\bassembly\b/i, 'Assembly'],
    ];

    function mapProcessName(name: string): string {
      for (const [pattern, stationName] of nameMapping) {
        if (pattern.test(name)) return stationName;
      }
      // Check if the name itself is a station name or contains one
      for (const sn of stationNames) {
        if (name.toLowerCase() === sn.toLowerCase()) return sn;
        if (name.toLowerCase().includes(sn.toLowerCase())) return sn;
      }
      return name; // Leave unchanged if no match found
    }

    // Normalize item processes
    const dbItems = await prisma.item.findMany();
    let itemsUpdated = 0;
    for (const item of dbItems) {
      const parsedProcesses: any[] = JSON.parse(item.processes);
      let changed = false;
      const normalized = parsedProcesses.map((p: any) => {
        const originalName = p.name;
        const mappedName = mapProcessName(p.name);
        if (mappedName !== originalName) changed = true;
        return { ...p, name: mappedName };
      });
      if (changed) {
        await prisma.item.update({
          where: { id: item.id },
          data: { processes: JSON.stringify(normalized) }
        });
        itemsUpdated++;
        console.log(`[Migration] Item ${item.id}: normalized ${normalized.length} process names`);
      }
    }

    // Normalize project subProject processes
    const dbProjects = await prisma.project.findMany();
    let projectsUpdated = 0;
    for (const proj of dbProjects) {
      const parsedSubs: any[] = JSON.parse(proj.subProjects);
      let changed = false;
      const updatedSubs = parsedSubs.map((sub: any) => {
        if (!sub.processes || !Array.isArray(sub.processes)) return sub;
        const normalizedProcs = sub.processes.map((p: any) => {
          const originalName = p.name;
          const mappedName = mapProcessName(p.name);
          if (mappedName !== originalName) changed = true;
          return { ...p, name: mappedName };
        });
        return { ...sub, processes: normalizedProcs };
      });
      if (changed) {
        await prisma.project.update({
          where: { id: proj.id },
          data: { subProjects: JSON.stringify(updatedSubs) }
        });
        projectsUpdated++;
        console.log(`[Migration] Project ${proj.id}: normalized processes`);
      }
    }

    if (itemsUpdated > 0 || projectsUpdated > 0) {
      console.log(`[Migration] Process name normalization complete: ${itemsUpdated} items, ${projectsUpdated} projects updated.`);
    } else {
      console.log('[Migration] All process names already match station names.');
    }
  } catch (err) {
    console.warn('[Migration] Process name normalization skipped:', err);
  }
}

// Ensure database is seeded and process names normalized before serving requests
async function initialize() {
  await seedDatabaseIfEmpty();
  await normalizeProcessNames();
}

initialize().catch(err => console.error('[Init] Failed:', err));

// REST API Endpoints
app.get('/api/data', async (req, res) => {
  try {
    const dbClients = await prisma.client.findMany();
    const dbMaterials = await prisma.material.findMany();
    const dbItems = await prisma.item.findMany();
    const dbProjects = await prisma.project.findMany();
    const dbLogs = await prisma.inventoryLog.findMany();
    const dbUsers = await prisma.user.findMany();
    const dbStations = await prisma.station.findMany({ where: { isActive: true } });
    const dbSettings = await prisma.setting.findUnique({ where: { id: 'global' } });

    // Map serialized DB fields back to real TypeScript structures for Frontend consumption
    const clients = dbClients;
    const materials = dbMaterials;
    const items = dbItems.map(item => ({
      ...item,
      materials: JSON.parse(item.materials),
      cutList: JSON.parse(item.cutList),
      processes: JSON.parse(item.processes),
      drawings: JSON.parse(item.drawings),
      laserCutParts: JSON.parse(item.laserCutParts || '[]'),
      subItems: JSON.parse(item.subItems),
    }));
    const projects = dbProjects.map(p => ({
      ...p,
      subProjects: JSON.parse(p.subProjects),
      includeStockItems: JSON.parse(p.includeStockItems),
    }));
    const logs = dbLogs;
    const users = dbUsers;
    const stations = dbStations;

    res.json({ clients, materials, items, projects, logs, users, stations, settings: dbSettings || null });
  } catch (error: any) {
    console.error('[Prisma] Failed to get database records:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync entire state in standard transactional updates
app.post('/api/sync', async (req, res) => {
  try {
    const { clients, materials, items, projects, logs, users, settings } = req.body;

    // Use upsert for all records to avoid unique constraint errors
    // This handles both new records and updates atomically

    // Upsert Users
    if (users && users.length > 0) {
      for (const u of users) {
        await prisma.user.upsert({
          where: { id: u.id },
          update: {
            name: u.name,
            role: u.role,
            avatar: u.avatar || null
          },
          create: {
            id: u.id,
            name: u.name,
            role: u.role,
            avatar: u.avatar || null
          }
        });
      }
    }

    // Upsert Clients
    if (clients && clients.length > 0) {
      for (const c of clients) {
        await prisma.client.upsert({
          where: { id: c.id },
          update: c,
          create: c
        });
      }
    }

    // Upsert Materials
    if (materials && materials.length > 0) {
      for (const m of materials) {
        await prisma.material.upsert({
          where: { id: m.id },
          update: m,
          create: m
        });
      }
    }

    // Upsert Items
    if (items && items.length > 0) {
      for (const item of items) {
        await prisma.item.upsert({
          where: { id: item.id },
          update: {
            name: item.name,
            itemCode: item.itemCode,
            description: item.description,
            materials: JSON.stringify(item.materials || []),
            cutList: JSON.stringify(item.cutList || []),
            processes: JSON.stringify(item.processes || []),
            drawings: JSON.stringify(item.drawings || []),
            laserCutParts: JSON.stringify(item.laserCutParts || []),
            subItems: JSON.stringify(item.subItems || []),
            dateCreated: item.dateCreated,
            createdBy: item.createdBy,
          },
          create: {
            id: item.id,
            name: item.name,
            itemCode: item.itemCode,
            description: item.description,
            materials: JSON.stringify(item.materials || []),
            cutList: JSON.stringify(item.cutList || []),
            processes: JSON.stringify(item.processes || []),
            drawings: JSON.stringify(item.drawings || []),
            laserCutParts: JSON.stringify(item.laserCutParts || []),
            subItems: JSON.stringify(item.subItems || []),
            dateCreated: item.dateCreated,
            createdBy: item.createdBy,
          }
        });
      }
    }

    // Upsert Projects
    if (projects && projects.length > 0) {
      for (const p of projects) {
        await prisma.project.upsert({
          where: { id: p.id },
          update: {
            title: p.title,
            clientId: p.clientId,
            jobCode: p.jobCode,
            status: p.status,
            batchNo: p.batchNo,
            deadline: p.deadline,
            subProjects: JSON.stringify(p.subProjects || []),
            includeStockItems: JSON.stringify(p.includeStockItems || []),
            qualityCertGenerated: p.qualityCertGenerated ?? false,
            qualityPassedDate: p.qualityPassedDate || null,
            qualityPassedByUserId: p.qualityPassedByUserId || null,
            notVisible: p.notVisible !== undefined ? p.notVisible : 0,
          },
          create: {
            id: p.id,
            title: p.title,
            clientId: p.clientId,
            jobCode: p.jobCode,
            status: p.status,
            batchNo: p.batchNo,
            dateCreated: p.dateCreated || new Date().toISOString().split('T')[0],
            deadline: p.deadline,
            subProjects: JSON.stringify(p.subProjects || []),
            includeStockItems: JSON.stringify(p.includeStockItems || []),
            qualityCertGenerated: p.qualityCertGenerated ?? false,
            qualityPassedDate: p.qualityPassedDate || null,
            qualityPassedByUserId: p.qualityPassedByUserId || null,
            notVisible: p.notVisible !== undefined ? p.notVisible : 0,
          }
        });
      }
    }

    // Upsert Logs (using composite unique or just create since logs are append-only)
    if (logs && logs.length > 0) {
      for (const l of logs) {
        await prisma.inventoryLog.upsert({
          where: { id: l.id },
          update: {
            type: l.type,
            date: l.date,
            materialId: l.materialId,
            materialName: l.materialName,
            quantity: l.quantity,
            batchNo: l.batchNo,
            invoiceNo: l.invoiceNo || null,
            poNumber: l.poNumber || null,
            projectCode: l.projectCode || null,
            clientName: l.clientName || null,
            userId: l.userId,
            notes: l.notes || null,
            externalPoNo: l.externalPoNo || null,
            externalCertUrl: l.externalCertUrl || null,
          },
          create: {
            id: l.id,
            type: l.type,
            date: l.date,
            materialId: l.materialId,
            materialName: l.materialName,
            quantity: l.quantity,
            batchNo: l.batchNo,
            invoiceNo: l.invoiceNo || null,
            poNumber: l.poNumber || null,
            projectCode: l.projectCode || null,
            clientName: l.clientName || null,
            userId: l.userId,
            notes: l.notes || null,
            externalPoNo: l.externalPoNo || null,
            externalCertUrl: l.externalCertUrl || null,
          }
        });
      }
    }

    // Upsert Settings (company meta & SaaS parameters)
    if (settings) {
      await prisma.setting.upsert({
        where: { id: 'global' },
        update: {
          companyName: settings.companyName,
          accreditationBody: settings.accreditationBody,
          stampCode: settings.stampCode,
          facilityLocation: settings.facilityLocation,
          saasTier: settings.saasTier,
          concurrentSeats: parseInt(settings.concurrentSeats, 10) || 25,
          autoSaves: settings.autoSaves !== undefined ? !!settings.autoSaves : true,
          syncFreq: settings.syncFreq,
          publicUrl: settings.publicUrl || null
        },
        create: {
          id: 'global',
          companyName: settings.companyName || 'Apex Heavy Engineering HQ',
          accreditationBody: settings.accreditationBody || 'Lloyds Register Quality Assurance (LRQA)',
          stampCode: settings.stampCode || 'STAMP-9001-2026',
          facilityLocation: settings.facilityLocation || 'Melbourne Fabrication Hub Bay 4',
          saasTier: settings.saasTier || 'Enterprise',
          concurrentSeats: parseInt(settings.concurrentSeats, 10) || 25,
          autoSaves: settings.autoSaves !== undefined ? !!settings.autoSaves : true,
          syncFreq: settings.syncFreq || 'Real-time Transaction Lock',
          ncrSeverities: undefined as any,
          publicUrl: settings.publicUrl || null
        }
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Prisma] Failed to sync data to SQL database:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error: any) {
    console.error('[Prisma] Failed to get users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { id, name, role, avatar } = req.body;
    if (!id || !name || !role) {
      return res.status(400).json({ error: 'ID, name, and role are required' });
    }
    
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { id } });
    if (existing) {
      return res.status(409).json({ error: 'User with this ID already exists' });
    }

    const user = await prisma.user.create({
      data: { id, name, role, avatar: avatar || null }
    });
    res.json(user);
  } catch (error: any) {
    console.error('[Prisma] Failed to create user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, avatar } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        role,
        avatar: avatar || null
      }
    });
    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('[Prisma] Failed to update user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is assigned to any processes in projects
    const projects = await prisma.project.findMany();
    let isAssigned = false;
    for (const project of projects) {
      const subProjects = JSON.parse(project.subProjects);
      for (const sub of subProjects) {
        if (sub.processes && sub.processes.some((p: any) => p.assignedUserId === id)) {
          isAssigned = true;
          break;
        }
      }
      if (isAssigned) break;
    }

    if (isAssigned) {
      return res.status(409).json({ 
        error: 'Cannot delete user. This user is assigned to active project processes.',
        canDelete: false 
      });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('[Prisma] Failed to delete user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all stations
app.get('/api/station', async (req, res) => {
  try {
    const stations = await prisma.station.findMany();
    res.json(stations);
  } catch (error: any) {
    console.error('[Prisma] Failed to get stations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new station
app.post('/api/station', async (req, res) => {
  try {
    const { id, name, description } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: 'ID and name are required' });
    }
    
    // Check if station already exists
    const existing = await prisma.station.findUnique({ where: { id } });
    if (existing) {
      return res.status(409).json({ error: 'Station with this ID already exists' });
    }

    const station = await prisma.station.create({
      data: { 
        id, 
        name, 
        description: description || null,
        isActive: true 
      }
    });
    res.json(station);
  } catch (error: any) {
    console.error('[Prisma] Failed to create station:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a station
app.put('/api/station/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const station = await prisma.station.update({
      where: { id },
      data: {
        name,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true
      }
    });
    res.json(station);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Station not found' });
    }
    console.error('[Prisma] Failed to update station:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a station (soft delete by setting isActive to false)
app.delete('/api/station/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete - set isActive to false instead of hard delete
    await prisma.station.update({
      where: { id },
      data: { isActive: false }
    });
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Station not found' });
    }
    console.error('[Prisma] Failed to delete station:', error);
    res.status(500).json({ error: error.message });
  }
});

// List available databases in prisma directory
app.get('/api/databases', async (req, res) => {
  try {
    const prismaDir = path.join(process.cwd(), 'prisma');
    if (!fs.existsSync(prismaDir)) {
      return res.json({ databases: [] });
    }

    const files = fs.readdirSync(prismaDir)
      .filter(f => f.endsWith('.db') || f.endsWith('.sqlite'))
      .map(file => {
        const filePath = path.join(prismaDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          isCurrent: file === 'dev.db' || file === 'database.sqlite'
        };
      })
      .sort((a, b) => b.lastModified.localeCompare(a.lastModified));

    res.json({ databases: files });
  } catch (error: any) {
    console.error('[Prisma] Failed to list databases:', error);
    res.status(500).json({ error: error.message });
  }
});

// Switch database - requires password confirmation
app.post('/api/databases/switch', async (req, res) => {
  try {
    const { databaseName, password } = req.body;
    
    // Verify password
    if (password !== 'startagain') {
      return res.status(401).json({ error: 'INVALID PASSWORD • ACCESS DENIED' });
    }

    if (!databaseName) {
      return res.status(400).json({ error: 'DATABASE NAME REQUIRED' });
    }

    const prismaDir = path.join(process.cwd(), 'prisma');
    const dbPath = path.join(prismaDir, databaseName);
    
    // Verify file exists and is a valid SQLite database
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: `DATABASE FILE NOT FOUND: ${databaseName}` });
    }

    if (!databaseName.endsWith('.db') && !databaseName.endsWith('.sqlite')) {
      return res.status(400).json({ error: 'INVALID DATABASE FILE EXTENSION' });
    }

    // Backup current database before switching
    const currentDb = path.join(prismaDir, 'dev.db');
    if (fs.existsSync(currentDb)) {
      const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const backupFilename = `database-ISO-9001-${backupTimestamp}.bck`;
      const backupPath = path.join(prismaDir, backupFilename);
      fs.copyFileSync(currentDb, backupPath);
      console.log(`[DB Switch] Current database backed up to: ${backupFilename}`);
    }

    // Copy target database to dev.db (Prisma expects this filename)
    fs.copyFileSync(dbPath, currentDb);
    
    // Enable WAL mode on new database
    const sqlite3 = require('sqlite3');
    const db = new sqlite3.Database(currentDb);
    db.run('PRAGMA journal_mode=WAL', [], () => {
      db.close();
    });

    console.log(`[DB Switch] Switched to database: ${databaseName}`);
    res.json({ 
      success: true, 
      message: `Switched to ${databaseName}`,
      database: databaseName
    });
  } catch (error: any) {
    console.error('[Prisma] Failed to switch database:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fresh Install with Backup - requires password confirmation
app.post('/api/fresh-install', async (req, res) => {
  try {
    const { password } = req.body;
    
    // Verify password
    if (password !== 'startagain') {
      return res.status(401).json({ error: 'INVALID PASSWORD • ACCESS DENIED' });
    }

    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupFilename = `database-ISO-9001-${backupTimestamp}.bck`;
    const backupPath = path.join(process.cwd(), 'prisma', backupFilename);

    // Create backup of current database
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`[Fresh Install] Database backed up to: ${backupFilename}`);
    }

    // Delete all tables (order matters for foreign keys)
    await prisma.inventoryLog.deleteMany({});
    await prisma.item.deleteMany({});
    await prisma.material.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.station.deleteMany({});
    await prisma.user.deleteMany({});
    
    // Re-seed default admin and manager users so login is possible after reset
    console.log('[Fresh Install] Seeding default admin users...');
    await prisma.user.createMany({
      data: [
        { id: 'usr-1', name: 'Robert Vance', role: 'Admin', avatar: 'RV' },
        { id: 'usr-2', name: 'Amelia Sterling', role: 'Production Manager', avatar: 'AS' },
        { id: 'usr-3', name: 'Jack Thompson', role: 'Worker', avatar: 'JT' },
        { id: 'usr-4', name: 'Marcus Brody', role: 'Worker', avatar: 'MB' },
        { id: 'usr-5', name: 'Liam Rodriguez', role: 'Worker', avatar: 'LR' },
        { id: 'usr-6', name: 'Chloe Chen', role: 'Worker', avatar: 'CC' },
        { id: 'usr-7', name: 'Siddharth Nair', role: 'Worker', avatar: 'SN' },
      ]
    });

    // Seed default work stations
    console.log('[Fresh Install] Seeding default work stations...');
    await prisma.station.createMany({
      data: [
        { id: 'stn-1', name: 'Lathe' },
        { id: 'stn-2', name: 'Milling' },
        { id: 'stn-3', name: 'Pressbrake' },
        { id: 'stn-4', name: 'Bandsaw' },
        { id: 'stn-5', name: 'Finishing/Polishing' },
        { id: 'stn-6', name: 'Welding/Fabrication' },
        { id: 'stn-7', name: 'Powder coating' },
        { id: 'stn-8', name: 'Assembly' },
      ]
    });
    
    // Reset setting to defaults (ncrSeverities will be set via Settings Manager UI)
    await prisma.setting.upsert({
      where: { id: 'global' },
      update: {
        companyName: 'Apex Heavy Engineering HQ',
        accreditationBody: 'Lloyds Register Quality Assurance (LRQA)',
        stampCode: 'STAMP-9001-2026',
        facilityLocation: 'Melbourne Fabrication Hub Bay 4',
        saasTier: 'Enterprise',
        concurrentSeats: 25,
        autoSaves: true,
        syncFreq: 'Real-time Transaction Lock',
        publicUrl: ''
      },
      create: {
        id: 'global',
        companyName: 'Apex Heavy Engineering HQ',
        accreditationBody: 'Lloyds Register Quality Assurance (LRQA)',
        stampCode: 'STAMP-9001-2026',
        facilityLocation: 'Melbourne Fabrication Hub Bay 4',
        saasTier: 'Enterprise',
        concurrentSeats: 25,
        autoSaves: true,
        syncFreq: 'Real-time Transaction Lock',
        ncrSeverities: undefined as any,
        publicUrl: ''
      }
    });

    console.log('[Fresh Install] Database reset to factory defaults with admin users');
    res.json({ 
      success: true, 
      message: `Fresh install complete. Database backed up as ${backupFilename}`,
      backupFile: backupFilename
    });
  } catch (error: any) {
    console.error('[Prisma] Fresh install failed:', error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Web application running on http://localhost:${PORT}`);
  });
}

startServer();
