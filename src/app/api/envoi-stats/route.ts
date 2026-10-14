import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { buildTree, defaultPeriod, loadMonthStats, loadRecipients, resolveSuggestions, Suggestion } from '@/lib/stats-mail';

// Arbre direction -> services avec compteurs du mois, destinataires saisis et propositions du Hub DSI
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const def = defaultPeriod();
  const year = parseInt(sp.get('year') || String(def.year));
  const month = parseInt(sp.get('month') || String(def.month));
  try {
    const stats = await loadMonthStats(year, month);
    const tree = buildTree(stats);
    const recipients = await loadRecipients();
    let suggestions: Record<string, Suggestion> = {};
    let hubError: string | undefined;
    try { suggestions = await resolveSuggestions(tree); } catch (e: any) { hubError = e.message; }
    return NextResponse.json({ year, month, tree, recipients, suggestions, hubError });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
