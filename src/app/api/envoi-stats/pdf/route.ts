import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { defaultPeriod, loadMonthStats, pdfForUnit } from '@/lib/stats-mail';

// Aperçu du PDF qui serait envoyé
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const def = defaultPeriod();
  const year = parseInt(sp.get('year') || String(def.year));
  const month = parseInt(sp.get('month') || String(def.month));
  const dir = sp.get('dir') || '';
  const service = sp.get('service') || undefined;
  if (!dir) return NextResponse.json({ error: 'dir requis' }, { status: 400 });
  try {
    const stats = await loadMonthStats(year, month);
    const { buf, filename } = await pdfForUnit(stats, { kind: service ? 'service' : 'direction', dir, service }, year, month);
    return new NextResponse(new Uint8Array(buf), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${filename}"` },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
