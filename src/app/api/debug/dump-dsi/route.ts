import { NextResponse } from 'next/server';
import { getODataConfig } from '@/lib/odata-direct';
import { ODataClient } from '@/lib/odata';

export async function GET() {
  const config = await getODataConfig();
  const client = new ODataClient(config);

  try {
    const allPaths = await client.requestAll<any>(`DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5,Level6,StructureElementTypeKey`);
    
    const dsiElements = allPaths.filter((p: any) => p.Level4?.trim() === "Direction des Systèmes d'Information");
    
    return NextResponse.json({
      count: dsiElements.length,
      elements: dsiElements
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
