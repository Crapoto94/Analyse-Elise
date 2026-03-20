import { NextResponse } from 'next/server';
import { prismaSystem, prismaEntities } from '@/lib/prisma';

export async function GET() {
  try {
    await prismaSystem.$queryRaw`SELECT 1`;
    await prismaEntities.$queryRaw`SELECT 1`;
    return NextResponse.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    return NextResponse.json({ 
      status: 'error', 
      database: 'disconnected',
      message: error.message,
      timestamp: new Date().toISOString() 
    }, { status: 500 });
  }
}
