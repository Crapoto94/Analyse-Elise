import { NextResponse } from 'next/server';
import { prismaSystem } from '@/lib/prisma';

export async function GET() {
  try {
    const config = await prismaSystem.appConfig.findMany();
    const result: Record<string, string> = {};
    config.forEach(c => { result[c.key] = c.value; });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    for (const [key, value] of Object.entries(data)) {
      await prismaSystem.appConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
