import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logApiRequest } from '@/lib/audit';
import { buildTree, dirKey, svcKey, effectiveRecipient, loadMonthStats, loadRecipients, pdfForUnit, periodLabel, resolveSuggestions, sendMailViaApm, Suggestion } from '@/lib/stats-mail';

type Item = { kind: 'direction' | 'service'; dir: string; service?: string; includeAssistant?: boolean };

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s: string) => s.replace(/[&<>"]/g, c => ESC[c]);

export async function POST(req: Request) {
  const start = Date.now();
  const session = await getSession();
  if (session?.role !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });

  const { year, month, items, testTo, cc: ccAll } = (await req.json()) as { year: number; month: number; items: Item[]; testTo?: string; cc?: string };
  if (!year || !month || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Période et sélection requises' }, { status: 400 });
  }

  // Copie systématique de chaque mail (une ou plusieurs adresses, séparées par , ou ;)
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ccList = (ccAll || '').split(/[,;]/).map(x => x.trim()).filter(Boolean);
  if (ccList.some(x => !EMAIL.test(x))) return NextResponse.json({ error: 'Adresse de copie invalide' }, { status: 400 });

  const stats = await loadMonthStats(year, month);
  const recipients = await loadRecipients();
  let suggestions: Record<string, Suggestion> = {};
  try { suggestions = await resolveSuggestions(buildTree(stats)); } catch { /* Hub indisponible : saisies manuelles seules */ }
  const period = periodLabel(year, month);
  const results: { label: string; to?: string; status: 'envoyé' | 'ignoré' | 'erreur'; detail?: string }[] = [];

  for (const it of items) {
    const label = it.kind === 'direction' ? it.dir : `${it.service} (${it.dir})`;
    const key = it.kind === 'direction' ? dirKey(it.dir) : svcKey(it.dir, it.service || '');
    const r = effectiveRecipient(recipients[key], suggestions[key]);
    // Mode test : tout part vers l'adresse de test, rien vers les vrais destinataires
    const to = testTo || r?.email;
    // Mode test : aucune copie (ni assistante, ni adresse de copie), tout part vers testTo uniquement
    const ccParts = testTo ? [] : [
      ...(it.kind === 'direction' && it.includeAssistant && r?.assistantEmail ? [r.assistantEmail] : []),
      ...ccList,
    ];
    const cc = ccParts.length ? ccParts.join(', ') : undefined;
    if (!to) { results.push({ label, status: 'ignoré', detail: 'Aucun e-mail renseigné' }); continue; }
    try {
      const pdf = await pdfForUnit(stats, it, year, month);
      const body = `<p>Bonjour${r?.name ? ' ' + esc(r.name) : ''},</p>
<p>Veuillez trouver ci-joint les statistiques du courrier (entrants / sortants) de <strong>${esc(label)}</strong> pour <strong>${esc(period)}</strong>.</p>
<p>Cordialement,</p>`;
      await sendMailViaApm(to, `${testTo ? '[TEST] ' : ''}Statistiques courrier ${period} — ${label}`, body,
        [{ filename: pdf.filename, content: pdf.buf.toString('base64') }], cc);
      results.push({ label, to: cc ? `${to} (cc ${cc})` : to, status: 'envoyé' });
    } catch (e: any) {
      results.push({ label, to, status: 'erreur', detail: e.message });
    }
  }
  await logApiRequest('/api/envoi-stats/send', 'POST', 200, Date.now() - start, session.email);
  return NextResponse.json({ results });
}
