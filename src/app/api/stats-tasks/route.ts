import { NextResponse } from 'next/server';
import { prismaSystem } from '@/lib/prisma';
import { ODataClient } from '@/lib/odata';

// Simple summary count by entity
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || '2026');

  try {
    // In Live mode, we don't calculate everything for the dropdowns yet
    // as it's too expensive to do on-demand for all units via OData without sync.
    // We return an empty counts map for now, which the UI handles.
    return NextResponse.json({ counts: {} });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
