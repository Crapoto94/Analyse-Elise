import { NextResponse } from 'next/server';
import { prismaSystem } from '@/lib/prisma';

export async function GET() {
  try {
    const logs = await prismaSystem.syncLog.findMany({
      orderBy: { startTime: 'desc' },
      take: 50
    });
    return NextResponse.json(logs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
