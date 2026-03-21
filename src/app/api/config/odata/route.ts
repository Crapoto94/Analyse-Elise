import { NextResponse } from 'next/server';
import { prismaSystem } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const CONFIG_KEY = 'odata_config';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const config = await prismaSystem.appConfig.findUnique({
      where: { key: CONFIG_KEY }
    });
    
    if (!config) return NextResponse.json({});
    
    return NextResponse.json(JSON.parse(config.value));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    
    await prismaSystem.appConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: JSON.stringify(data) },
      create: { key: CONFIG_KEY, value: JSON.stringify(data) }
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
