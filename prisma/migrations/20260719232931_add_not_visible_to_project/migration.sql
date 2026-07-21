-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isoComplianceNotes" TEXT NOT NULL,
    "relationType" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dimensions" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "totalStock" REAL NOT NULL,
    "allocatedStock" REAL NOT NULL,
    "availableStock" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "materialCertUrl" TEXT,
    "poNumber" TEXT,
    "receivedByUserId" TEXT NOT NULL,
    "receiptDate" TEXT NOT NULL,
    "price" REAL,
    "quantityPurchased" REAL
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "materials" TEXT NOT NULL,
    "cutList" TEXT NOT NULL,
    "processes" TEXT NOT NULL,
    "drawings" TEXT NOT NULL,
    "subItems" TEXT NOT NULL,
    "dateCreated" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "jobCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "dateCreated" TEXT NOT NULL,
    "deadline" TEXT NOT NULL,
    "subProjects" TEXT NOT NULL,
    "includeStockItems" TEXT NOT NULL,
    "qualityCertGenerated" BOOLEAN NOT NULL DEFAULT false,
    "qualityPassedDate" TEXT,
    "qualityPassedByUserId" TEXT,
    "notVisible" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "InventoryLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "batchNo" TEXT NOT NULL,
    "invoiceNo" TEXT,
    "poNumber" TEXT,
    "projectCode" TEXT,
    "clientName" TEXT,
    "userId" TEXT NOT NULL,
    "notes" TEXT,
    "externalPoNo" TEXT,
    "externalCertUrl" TEXT
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "companyName" TEXT NOT NULL DEFAULT 'Apex Heavy Engineering HQ',
    "accreditationBody" TEXT NOT NULL DEFAULT 'Lloyds Register Quality Assurance (LRQA)',
    "stampCode" TEXT NOT NULL DEFAULT 'STAMP-9001-2026',
    "facilityLocation" TEXT NOT NULL DEFAULT 'Melbourne Fabrication Hub Bay 4',
    "saasTier" TEXT NOT NULL DEFAULT 'Enterprise',
    "concurrentSeats" INTEGER NOT NULL DEFAULT 25,
    "autoSaves" BOOLEAN NOT NULL DEFAULT true,
    "syncFreq" TEXT NOT NULL DEFAULT 'Real-time Transaction Lock'
);
