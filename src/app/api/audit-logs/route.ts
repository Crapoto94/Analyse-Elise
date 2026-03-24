import { NextResponse } from 'next/server';
import { prismaSystem } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    // Use raw query to bypass missing model in Prisma client (due to lock)
    const logs = await prismaSystem.$queryRawUnsafe(
      'SELECT * FROM ApiRequestLog ORDER BY timestamp DESC LIMIT 100'
    );
    return NextResponse.json(logs);
  } catch (error) {
    console.error('[API-AUDIT] Raw query failed:', error);
    return NextResponse.json([], { status: 500 }); // Return empty array on error to prevent crash
  }
}
