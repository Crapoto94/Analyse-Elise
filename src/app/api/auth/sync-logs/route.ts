import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

async function checkAdmin() {
  const session = await getSession();
  return session && session.role === 'ADMIN';
}

export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const logs = await prisma.$queryRawUnsafe(`
    SELECT id, startTime, endTime, durationMs, docsCount, tasksCount, status, message 
    FROM SyncLog 
    ORDER BY startTime DESC 
    LIMIT 100
  `) as any[];
  return NextResponse.json(logs);
}
