import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getMappingOverview, loadDirMapping, saveDirMapping } from '@/lib/stats-mail';

// Rattachement des directions Elise aux directions du Hub DSI (administrateurs)
export async function GET(req: Request) {
  const s = await getSession();
  if (s?.role !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  const year = parseInt(new URL(req.url).searchParams.get('year') || String(new Date().getFullYear()));
  try {
    return NextResponse.json(await getMappingOverview(year));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}

// Corps : { mapping: { "<direction Elise>": "<code Hub>" | "" | null } } ; null = retour au rapprochement automatique
export async function PUT(req: Request) {
  const s = await getSession();
  if (s?.role !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  const incoming = ((await req.json()).mapping || {}) as Record<string, string | null>;
  const map = await loadDirMapping();
  for (const [name, code] of Object.entries(incoming)) {
    if (code === null) delete map[name];
    else map[name] = String(code);
  }
  await saveDirMapping(map);
  return NextResponse.json({ success: true });
}
