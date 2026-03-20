const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const queries = [
    // FactDocument: Speed up year filter and joins
    `CREATE INDEX IF NOT EXISTS idx_sync_FactDocument_CreatedDate ON sync_FactDocument(CreatedDate)`,
    `CREATE INDEX IF NOT EXISTS idx_sync_FactDocument_Id ON sync_FactDocument(Id)`,
    `CREATE INDEX IF NOT EXISTS idx_sync_FactDocument_TypeId ON sync_FactDocument(TypeId)`,
    `CREATE INDEX IF NOT EXISTS idx_sync_FactDocument_MediumId ON sync_FactDocument(MediumId)`,
    
    // FactTask: Speed up joins and assignment lookups
    `CREATE INDEX IF NOT EXISTS idx_sync_FactTask_DocumentId ON sync_FactTask(DocumentId)`,
    `CREATE INDEX IF NOT EXISTS idx_sync_FactTask_AssignedToId ON sync_FactTask(AssignedToStructureElementId)`,
    `CREATE INDEX IF NOT EXISTS idx_sync_FactTask_ResponseDate ON sync_FactTask(ResponseDate)`,
    
    // Path: Speed up hierarchy filtering (LIKE '1|134%')
    `CREATE INDEX IF NOT EXISTS idx_sync_DimStructureElementPath_Path ON sync_DimStructureElementPath(Path)`,
    `CREATE INDEX IF NOT EXISTS idx_sync_DimStructureElementPath_Id ON sync_DimStructureElementPath(Id)`
  ];

  console.log('--- Applying Performance Indexes ---');
  for (const query of queries) {
    try {
      await prisma.$executeRawUnsafe(query);
      console.log(`Success: ${query.substring(0, 50)}...`);
    } catch (e) {
      console.warn(`Skipped/Failed: ${query.substring(0, 50)}... Error: ${e.message}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
