import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEFAULT_FOOTER, loadFooter, saveFooter } from '@/lib/stats-mail';

// Pied de page des mails d'envoi des statistiques (administrateurs)
export async function GET() {
  const s = await getSession();
  if (s?.role !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  return NextResponse.json({ footer: await loadFooter(), defaults: DEFAULT_FOOTER });
}

export async function PUT(req: Request) {
  const s = await getSession();
  if (s?.role !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  const f = (await req.json()).footer || {};
  const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const color = clean(f.footerColor, 7);
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return NextResponse.json({ error: 'Couleur invalide (format #RRGGBB)' }, { status: 400 });
  }
  await saveFooter({
    footer1: clean(f.footer1, 200),
    footer2: clean(f.footer2, 200),
    footer3: clean(f.footer3, 200),
    footerColor: color || DEFAULT_FOOTER.footerColor,
  });
  return NextResponse.json({ success: true });
}
