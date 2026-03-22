import { prismaSystem } from './prisma';

export async function logApiRequest(endpoint: string, method: string, status: number, duration: number, userEmail?: string) {
  try {
    // Use raw SQL to bypass Prisma client lock
    await prismaSystem.$executeRawUnsafe(
      'INSERT INTO ApiRequestLog (endpoint, method, status, duration, userEmail, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      endpoint, method, status, duration, userEmail || null, new Date().toISOString()
    );
  } catch (error) {
    console.error('[AUDIT] Failed to log API request (Raw):', error);
  }
}
