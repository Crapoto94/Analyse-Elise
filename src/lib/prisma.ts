import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prismaSystem: PrismaClient };

export const prismaSystem = globalForPrisma.prismaSystem || new PrismaClient({
  log: ['error'],
});

// Database initialization check
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaSystem = prismaSystem;
}

async function initDb() {
  try {
    const tables = await prismaSystem.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name='User'`);
    if (Array.isArray(tables) && tables.length === 0) {
      console.warn('[DB INIT] WARNING: "User" table is missing in system.db. Management features will fail.');
    } else {
      console.log('[DB INIT] system.db connected and "User" table found.');
    }
  } catch (e: any) {
    console.error('[DB INIT] Error checking database:', e.message);
  }
}

initDb();
