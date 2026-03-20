import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // @ts-ignore
    const logs = await prisma.syncLog.findMany({
      orderBy: { startTime: 'desc' },
      take: 20
    });
    return NextResponse.json(logs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
