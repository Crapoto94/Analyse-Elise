import { PrismaClient as SystemClient } from '../../node_modules/@prisma/client/system'
import { PrismaClient as EntitiesClient } from '../../node_modules/@prisma/client/entities'

const prismaSystem = new SystemClient()
const prismaEntities = new EntitiesClient()

// Auto-initialization logic to ensure at least one ADMIN exists
if (process.env.NODE_ENV === 'production' || true) {
  (async () => {
    try {
      // We use raw query because we can't be sure the table exists yet if db push wasn't run
      await prismaSystem.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE,
          password TEXT,
          role TEXT DEFAULT 'USER',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await prismaSystem.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AppConfig" (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `);

      const users = await prismaSystem.$queryRawUnsafe(`SELECT count(*) as count FROM "User"`) as any[];
      if (users[0].count === 0) {
        console.log('--- INITIALIZING DEFAULT ADMIN ---');
        // email: admin@ivry.fr, password: admin (hashed with simple logic to avoid complex imports here)
        // Note: Simple SHA-256 or similar should be used in auth.ts
        const hashedPassword = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'; // 'admin' 
        await prismaSystem.$executeRawUnsafe(`
           INSERT INTO "User" (email, password, role) 
           VALUES ('admin@ivry.fr', '${hashedPassword}', 'ADMIN')
        `);
      }
    } catch (e) {
       console.error('Prisma System initialization error:', e);
    }
  })();
}

export { prismaSystem, prismaEntities }
export default prismaSystem
