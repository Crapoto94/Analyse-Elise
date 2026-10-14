import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listActivity } from '@/lib/activity';

// Utilisateurs en ligne et dernières connexions (administrateurs)
export async function GET() {
  const s = await getSession();
  if (s?.role !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  try {
    return NextResponse.json({ users: await listActivity() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
