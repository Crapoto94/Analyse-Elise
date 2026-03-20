import { NextResponse } from 'next/server';
import { prismaSystem } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const logs = await prismaSystem.$queryRawUnsafe('SELECT * FROM "SyncLog" ORDER BY startTime DESC LIMIT 50') as any[];
    return NextResponse.json(logs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
