import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { searchAgents } from '@/lib/stats-mail';

export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ data: [] });
  try {
    const agents = await searchAgents(q);
    return NextResponse.json({ data: agents.map(a => ({ nom: `${a.prenom} ${a.nom}`, email: a.email, fonction: a.fonction, direction: a.direction })) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
