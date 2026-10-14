import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { loadRecipients, saveRecipients, Recipient } from '@/lib/stats-mail';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// plusieurs adresses possibles, séparées par une virgule ou un point-virgule
const validList = (v?: string) => !v || v.split(/[,;]/).map(x => x.trim()).filter(Boolean).every(x => EMAIL.test(x));

export async function PUT(req: Request) {
  const s = await getSession();
  if (s?.role !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  const incoming: Recipient[] = (await req.json()).recipients || [];
  const map = await loadRecipients();
  for (const r of incoming) {
    if (!validList(r.email) || !validList(r.assistantEmail)) {
      return NextResponse.json({ error: `E-mail invalide pour ${r.key}` }, { status: 400 });
    }
    map[r.key] = r;
  }
  await saveRecipients(map);
  return NextResponse.json({ success: true });
}
