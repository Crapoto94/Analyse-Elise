
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "file:C:/dev/Stat_Elise_New/entities.db" } }
});

async function findContacts() {
  try {
    const results = await prisma.$queryRawUnsafe(`
      SELECT Id, CompanyName FROM sync_FactContactCompany 
      WHERE CompanyName LIKE '%Mirabeau%' OR CompanyName LIKE '%Louis Bertrand%'
    `);
    
    console.log('--- sync_FactContactCompany Results ---');
    console.log(results);

    if (results.length > 0) {
      const ids = results.map(r => r.Id);
      // Now search if these IDs are used in FactDocument (Sender or Recipient)
      const linkedDocs = await prisma.$queryRawUnsafe(`
        SELECT Id, DocumentIdentifier, SenderContactCompanyId, RecipientContactCompanyId 
        FROM sync_FactDocument 
        WHERE SenderContactCompanyId IN (${ids.join(',')}) 
           OR RecipientContactCompanyId IN (${ids.join(',')})
      `);
      console.log('--- Linked Documents ---');
      console.log(linkedDocs);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

findContacts();
