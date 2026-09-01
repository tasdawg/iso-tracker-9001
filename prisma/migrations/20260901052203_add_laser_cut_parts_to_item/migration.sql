-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "materials" TEXT NOT NULL,
    "cutList" TEXT NOT NULL,
    "processes" TEXT NOT NULL,
    "drawings" TEXT NOT NULL,
    "laserCutParts" TEXT NOT NULL DEFAULT '[]',
    "subItems" TEXT NOT NULL,
    "dateCreated" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL
);
INSERT INTO "new_Item" ("createdBy", "cutList", "dateCreated", "description", "drawings", "id", "itemCode", "materials", "name", "processes", "subItems") SELECT "createdBy", "cutList", "dateCreated", "description", "drawings", "id", "itemCode", "materials", "name", "processes", "subItems" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
