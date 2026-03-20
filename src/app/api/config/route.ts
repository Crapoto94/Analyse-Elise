import { NextResponse } from 'next/server';
import { prismaSystem } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

async function checkAdmin() {
  const session = await getSession();
  return session?.role === 'ADMIN';
}

export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const config = await prismaSystem.$queryRawUnsafe('SELECT * FROM "AppConfig"') as any[];
    // Convert to object
    const configObj = config.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    return NextResponse.json(configObj);
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to retrieve config' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await req.json();
  const entries = Object.entries(body);

  try {
    for (const [key, value] of entries) {
      await prismaSystem.$executeRawUnsafe(`
        INSERT INTO "AppConfig" (key, value) VALUES ('${key}', '${value}')
        ON CONFLICT(key) DO UPDATE SET value = '${value}'
      `);
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
