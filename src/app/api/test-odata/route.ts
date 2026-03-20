import { NextResponse } from 'next/server';
import { prismaSystem } from '@/lib/prisma';
import { getODataClient } from '@/lib/odata';

export async function GET() {
  try {
    const configRes = await prismaSystem.appConfig.findUnique({ where: { key: 'odata_config' } });
    if (!configRes) return NextResponse.json({ error: 'No config' });
    const config = JSON.parse(configRes.value);
    const client = getODataClient(config);
    
    const root = await (client as any).request('');
    const all = (root.value || []).map((e: any) => e.name);
    
    const targets = ['DimDocumentMedium', 'DocumentMedium', 'DimStructureElementPath', 'StructureElementPath', 'DimDocumentType', 'DimDocumentState'];
    const results = targets.map(t => ({ name: t, exists: all.includes(t) }));
    
    return NextResponse.json({ all, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
