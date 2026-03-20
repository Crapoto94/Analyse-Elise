const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

// Simple hash function for "local" management
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('--- Initializing User Table ---');
  
  // Create User table manually if prisma generate/migrate fails
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'USER',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`);
    console.log('Success: User table created/verified.');
  } catch (e) {
    console.error('Error creating User table:', e.message);
  }

  // Seed Admin
  const adminEmail = 'admin@elise.local';
  const adminPass = hashPassword('admin123'); // Default password
  
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "User" (email, password, role)
      SELECT '${adminEmail}', '${adminPass}', 'ADMIN'
      WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = '${adminEmail}');
    `);
    console.log(`Success: Admin created (${adminEmail} / admin123)`);
  } catch (e) {
    console.error('Error seeding admin:', e.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
