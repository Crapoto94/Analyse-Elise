import { NextResponse } from 'next/server';
import { fetchCabinetStats } from '@/lib/odata-direct';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const yearVal = parseInt(searchParams.get('year') || '0');
  const monthVal = searchParams.get('month') || 'all';
  const type = searchParams.get('type') || 'all';

  try {
    const stats = await fetchCabinetStats(yearVal || new Date().getFullYear(), monthVal);
    return NextResponse.json({ ...stats, type });
  } catch (err: any) {
    console.error('Cabinet V2 API (Direct) Error:', err);
    return NextResponse.json({ error: 'OData Direct Error: ' + err.message }, { status: 500 });
  }
}
