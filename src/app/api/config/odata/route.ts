import { NextResponse } from 'next/server';
import { prismaSystem } from '@/lib/prisma';

export async function GET() {
  try {
    const config = await prismaSystem.appConfig.findUnique({
      where: { key: 'odata_config' }
    });
    if (config) return NextResponse.json(JSON.parse(config.value));
    
    // Fallback to env
    return NextResponse.json({
      baseUrl: process.env.ODATA_BASE_URL || '',
      username: process.env.ODATA_USERNAME || '',
      password: process.env.ODATA_PASSWORD || ''
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    await prismaSystem.appConfig.upsert({
      where: { key: 'odata_config' },
      update: { value: JSON.stringify(data) },
      create: { key: 'odata_config', value: JSON.stringify(data) }
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
