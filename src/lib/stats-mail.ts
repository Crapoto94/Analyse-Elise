import PDFDocument from 'pdfkit';
import fs from 'fs';
import http from 'http';
import https from 'https';
import tls from 'tls';
import { prismaSystem } from './prisma';
import { fetchDirectHierarchy } from './odata-direct';

/* ------------------------------------------------------------------ */
/* Destinataires (stockés en base locale, table AppConfig)             */
/* ------------------------------------------------------------------ */

export type Recipient = {
  key: string;                 // "D|<direction>" ou "S|<direction>|<service>"
  hubName?: string;            // libellé de rattachement dans le Hub DSI
  name?: string;               // directeur / responsable
  email?: string;
  assistantName?: string;      // assistant(e) de direction (directions uniquement)
  assistantEmail?: string;
};

const RECIPIENTS_KEY = 'stats_mail_recipients';

export const dirKey = (dir: string) => `D|${dir}`;
export const svcKey = (dir: string, svc: string) => `S|${dir}|${svc}`;

/** Saisie manuelle prioritaire, sinon proposition issue du Hub DSI. */
export function effectiveRecipient(manual: Recipient | undefined, sug: Suggestion | undefined) {
  return {
    name: manual?.name || sug?.name,
    email: manual?.email || sug?.email,
    assistantName: manual?.assistantName || sug?.assistantName,
    assistantEmail: manual?.assistantEmail || sug?.assistantEmail,
  };
}

export async function loadRecipients(): Promise<Record<string, Recipient>> {
  const row = await prismaSystem.appConfig.findUnique({ where: { key: RECIPIENTS_KEY } });
  if (!row) return {};
  try { return JSON.parse(row.value); } catch { return {}; }
}

export async function saveRecipients(map: Record<string, Recipient>) {
  const value = JSON.stringify(map);
  await prismaSystem.appConfig.upsert({
    where: { key: RECIPIENTS_KEY },
    update: { value },
    create: { key: RECIPIENTS_KEY, value },
  });
}

/* ------------------------------------------------------------------ */
/* APIs de la Ville (Hub DSI, StudioRH, APM) — clés côté serveur       */
/* ------------------------------------------------------------------ */

export function env(name: string): string {
  return (process.env[name] || '').trim().replace(/^["']|["']$/g, '');
}

async function hubGet(path: string): Promise<any> {
  const res = await fetch(`${env('HUBDSI_API_URL')}${path}`, {
    headers: { 'X-API-Key': env('HUBDSI_API_KEY') },
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error(`Hub DSI ${path}: réponse non JSON (${res.status})`); }
  if (json?.error) throw new Error(`Hub DSI ${path}: ${json.error}`);
  return json;
}

/** Organisation du Hub DSI : directions, services et rattachement. */
export async function fetchHubOrganisation(): Promise<{ directions: string[]; services: string[]; dirServicesMap: Record<string, string[]> }> {
  const j = await hubGet('/api/directions-services');
  return { directions: j.directions || [], services: j.services || [], dirServicesMap: j.dirServicesMap || {} };
}

export type Encadrant = {
  nom: string; prenom: string; email: string; poste: string;
  role: 'dg' | 'directeur' | 'responsable_service';
  direction_code: string; direction_label: string; service_code: string; service_label: string;
};
export type Assistant = { displayName: string; email: string; direction: string };

/** Encadrants du Hub DSI (directeurs, DG, responsables de service) — GET /api/admin/rh/encadrants. */
export async function fetchHubEncadrants(): Promise<Encadrant[]> {
  const j = await hubGet('/api/admin/rh/encadrants');
  return Array.isArray(j) ? j : [];
}

/**
 * Assistants de direction : « groupe particulier » du Hub (liste ad hoc basée sur une liste AD),
 * « Secrétaires des Directions ». Le rattachement se fait par le champ department (libellé de direction).
 */
export async function fetchHubAssistants(): Promise<Assistant[]> {
  const g = await hubGet('/api/admin/rh/encadrants/custom-groups');
  const group = (g.groups || []).find((x: any) => /secr[ée]taires des directions/i.test(x.name));
  if (!group) return [];
  const m = await hubGet(`/api/admin/rh/encadrants/custom-groups/${group.id}/members`);
  return (m.members || [])
    .filter((x: any) => x.email)
    .map((x: any) => ({ displayName: String(x.displayName || '').replace(/\s+/g, ' ').trim(), email: String(x.email).toLowerCase(), direction: x.department || '' }));
}

/* Rapprochement de libellés (Elise ↔ Hub) : insensible aux accents/casse, tolère les abréviations tronquées */
const STOP = new Set(['DE', 'DES', 'DU', 'LA', 'LE', 'LES', 'ET', 'D', 'L', 'A', 'AU', 'AUX', 'EN']);
const tokens = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ').split(' ').filter(t => t && !STOP.has(t));

export function labelScore(a: string, b: string): number {
  const ta = tokens(a), tb = tokens(b);
  if (!ta.length || !tb.length) return 0;
  const hit = (x: string, list: string[]) => list.some(y => x === y || (x.length >= 3 && y.length >= 3 && (x.startsWith(y) || y.startsWith(x))));
  const common = ta.filter(t => hit(t, tb)).length;
  return common / Math.max(ta.length, tb.length);
}

const MIN_SCORE = 0.7;
const bestBy = <T,>(list: T[], label: (x: T) => string, target: string): T | undefined => {
  let best: T | undefined; let bs = 0;
  for (const x of list) { const s = labelScore(label(x), target); if (s > bs) { bs = s; best = x; } }
  return bs >= MIN_SCORE ? best : undefined;
};

export type Suggestion = {
  name?: string; email?: string; assistantName?: string; assistantEmail?: string;
  hubLabel?: string;   // libellé Hub retenu (pour contrôle visuel)
};

/**
 * Propose directeur / responsable / assistants pour chaque direction et service d'Elise.
 * Les saisies manuelles (Recipient) restent prioritaires côté appelant.
 */
export async function resolveSuggestions(tree: { name: string; services: { name: string }[] }[]): Promise<Record<string, Suggestion>> {
  const [enc, ass, mapping] = await Promise.all([fetchHubEncadrants(), fetchHubAssistants().catch(() => [] as Assistant[]), loadDirMapping()]);
  const out: Record<string, Suggestion> = {};
  const hubDirs = Array.from(new Map(enc.map(e => [e.direction_code, e.direction_label])).entries()).map(([code, label]) => ({ code, label }));
  const person = (e: Encadrant) => `${e.prenom} ${e.nom}`.trim();

  for (const d of tree) {
    // Rattachement manuel prioritaire ("" = volontairement non rattachée), sinon rapprochement automatique
    const hd = Object.prototype.hasOwnProperty.call(mapping, d.name)
      ? hubDirs.find(x => x.code === mapping[d.name])
      : bestBy(hubDirs, x => x.label, d.name);
    const sug: Suggestion = {};
    if (hd) {
      const heads = enc.filter(e => e.direction_code === hd.code && (e.role === 'directeur' || e.role === 'dg'));
      const head = heads.find(e => e.role === 'directeur') || heads.find(e => /SERVICES$/i.test(e.poste.replace(/\s+/g, ' ').trim())) || heads[0];
      if (head) { sug.name = person(head); sug.email = head.email; sug.hubLabel = hd.label; }
      const mine = ass.filter(a => labelScore(a.direction, hd.label) >= MIN_SCORE || labelScore(a.direction, d.name) >= MIN_SCORE);
      if (mine.length) { sug.assistantName = mine.map(a => a.displayName).join(', '); sug.assistantEmail = mine.map(a => a.email).join(', '); }
      out[dirKey(d.name)] = sug;

      const svcs = enc.filter(e => e.direction_code === hd.code && e.role === 'responsable_service');
      for (const s of d.services) {
        const isDirSelf = labelScore(s.name, d.name) >= MIN_SCORE;
        if (isDirSelf) { out[svcKey(d.name, s.name)] = { name: sug.name, email: sug.email, hubLabel: hd.label }; continue; }
        const hs = bestBy(svcs, e => e.service_label, s.name);
        if (hs) out[svcKey(d.name, s.name)] = { name: person(hs), email: hs.email, hubLabel: hs.service_label };
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Rattachement manuel direction Elise -> direction du Hub DSI          */
/* ------------------------------------------------------------------ */

const MAPPING_KEY = 'stats_mail_dir_mapping';

/** { nom de la direction dans Elise : code direction du Hub } ; "" = volontairement non rattachée */
export async function loadDirMapping(): Promise<Record<string, string>> {
  const row = await prismaSystem.appConfig.findUnique({ where: { key: MAPPING_KEY } });
  if (!row) return {};
  try { return JSON.parse(row.value); } catch { return {}; }
}

export async function saveDirMapping(map: Record<string, string>) {
  const value = JSON.stringify(map);
  await prismaSystem.appConfig.upsert({ where: { key: MAPPING_KEY }, update: { value }, create: { key: MAPPING_KEY, value } });
}

/** Directions du Hub (avec leur directeur) + état de rattachement de chaque direction Elise. */
export async function getMappingOverview(year: number) {
  const [enc, mapping, h] = await Promise.all([
    fetchHubEncadrants(), loadDirMapping(),
    fetchDirectHierarchy(year, { taskTypeId: '114' }),
  ]);
  const hubDirections = Array.from(new Map(enc.map(e => [e.direction_code, e.direction_label])).entries())
    .map(([code, label]) => {
      const heads = enc.filter(e => e.direction_code === code && (e.role === 'directeur' || e.role === 'dg'));
      const head = heads.find(e => e.role === 'directeur') || heads[0];
      return { code, label, head: head ? `${head.prenom} ${head.nom}`.trim() : '' };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  const directions = (h.directions as any[]).filter(isDirection).map(d => {
    const auto = bestBy(hubDirections, x => x.label, d.name);
    const manual = Object.prototype.hasOwnProperty.call(mapping, d.name) ? mapping[d.name] : undefined;
    return { name: d.name as string, countEnt: d.countEnt as number, autoCode: auto?.code || null, manualCode: manual ?? null };
  });
  return { hubDirections, directions };
}

/** Recherche d'agent (autocomplétion) dans StudioRH. */
export async function searchAgents(q: string): Promise<any[]> {
  const res = await fetch(`${env('STUDIORH_API_URL')}/api/agents/search?q=${encodeURIComponent(q)}`, {
    headers: { 'x-api-key': env('STUDIORH_API_KEY') },
    signal: AbortSignal.timeout(15000),
  });
  const j = await res.json();
  return j.data || [];
}

export type MailAttachment = { filename: string; content: string };

/* Pied de page du mail (paramétrable en administration) */
export type MailFooter = { footer1: string; footer2: string; footer3: string; footerColor: string };

export const DEFAULT_FOOTER: MailFooter = {
  footer1: 'Ville d’Ivry-sur-Seine',
  footer2: 'Cabinet du Maire — Service courrier',
  footer3: 'Statistiques Elise',
  footerColor: '#0055A4',
};

const FOOTER_KEY = 'stats_mail_footer';

export async function loadFooter(): Promise<MailFooter> {
  const row = await prismaSystem.appConfig.findUnique({ where: { key: FOOTER_KEY } });
  if (!row) return DEFAULT_FOOTER;
  try { return { ...DEFAULT_FOOTER, ...JSON.parse(row.value) }; } catch { return DEFAULT_FOOTER; }
}

export async function saveFooter(f: MailFooter) {
  const value = JSON.stringify(f);
  await prismaSystem.appConfig.upsert({ where: { key: FOOTER_KEY }, update: { value }, create: { key: FOOTER_KEY, value } });
}

/** Lignes vides non envoyées : l'APM applique alors son pied de page par défaut pour ce champ. */
const footerPayload = (f: MailFooter) => Object.fromEntries(Object.entries(f).filter(([, v]) => String(v).trim() !== ''));

/**
 * POST JSON via le module https de Node (et non fetch) : le fetch patché par Next échoue
 * sur cet appel (« fetch failed ») alors que Node natif passe. Gère VILLE_CA_FILE / auto-signé.
 */
/**
 * Autorités de confiance : celles de Node + celles du magasin système (Windows/Linux).
 * Le certificat de l'APM est émis par l'autorité interne de la Ville, déjà installée sur le poste/serveur,
 * mais que Node ignore par défaut. VILLE_CA_FILE permet d'ajouter un .pem explicite.
 */
function caList(caFile: string): (string | Buffer)[] {
  const list: (string | Buffer)[] = [...tls.rootCertificates];
  try { list.push(...((tls as any).getCACertificates?.('system') || [])); } catch { /* Node trop ancien */ }
  if (caFile) list.push(fs.readFileSync(caFile));
  return list;
}

export function postJson(url: string, headers: Record<string, string>, payload: unknown, timeoutMs = 60000): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const isHttps = u.protocol === 'https:';
    const body = Buffer.from(JSON.stringify(payload), 'utf-8');
    const caFile = env('VILLE_CA_FILE');
    const opts: https.RequestOptions = {
      method: 'POST', hostname: u.hostname, port: u.port || (isHttps ? 443 : 80), path: u.pathname + u.search,
      headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': body.length },
      ...(isHttps ? { ca: caList(caFile) } : {}),
      ...(isHttps && env('VILLE_ALLOW_SELF_SIGNED_CERTS') === 'true' ? { rejectUnauthorized: false } : {}),
    };
    const req = (isHttps ? https : http).request(opts, res => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode || 0, text: Buffer.concat(chunks).toString('utf-8') }));
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`délai dépassé (${timeoutMs / 1000} s)`)));
    req.on('error', e => reject(new Error(`APM injoignable : ${e.message}${(e as any).code ? ` [${(e as any).code}]` : ''}`)));
    req.end(body);
  });
}

export async function sendMailViaApm(to: string, subject: string, content: string, attachments: MailAttachment[], cc?: string) {
  const { status, text } = await postJson(`${env('APM_API_URL')}/api/v1/mail/send`, { 'X-API-KEY': env('APM_API_KEY') }, {
    to,
    ...(cc ? { cc } : {}),
    subject,
    content,
    ...footerPayload(await loadFooter()),
    attachments,
  });
  let json: any = {};
  try { json = JSON.parse(text); } catch { /* corps non JSON */ }
  if (status < 200 || status >= 300 || (json.status && json.status !== 'success')) {
    throw new Error(`APM mail (${status}) : ${json.error || json.message || text.slice(0, 200)}`);
  }
  return json;
}

/* ------------------------------------------------------------------ */
/* PDF du tableau « Direction / Services »                             */
/* ------------------------------------------------------------------ */

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const periodLabel = (year: number, month: number) => `${MONTHS[month - 1]} ${year}`;

export type StatRow = {
  name: string; type?: string;
  countEnt: number; entMuniTotal: number; entMuniMail: number; entMuniPapier: number;
  entOtherTotal: number; entOtherMail: number; entOtherPapier: number; countSor: number;
  closureReasons?: Record<string, { count: number }>;
};

const ZERO: StatRow = { name: '', countEnt: 0, entMuniTotal: 0, entMuniMail: 0, entMuniPapier: 0, entOtherTotal: 0, entOtherMail: 0, entOtherPapier: 0, countSor: 0 };
export const rowOrZero = (r: StatRow | undefined, name: string): StatRow => ({ ...ZERO, ...(r || {}), name });

function reasonsText(r: StatRow): string {
  const list = Object.entries(r.closureReasons || {}).filter(([, d]) => d.count > 0).sort((a, b) => b[1].count - a[1].count);
  return list.map(([l, d]) => `${l.split(' ')[0]} : ${d.count}`).join('  ·  ');
}

/**
 * Génère le PDF (A4 paysage) : ligne de total (en bleu) puis une ligne par service.
 * `total` = ligne de l'entité destinataire ; `rows` = services (vide pour un service seul).
 */
export function buildStatsPdf(opts: { title: string; levelLabel: string; year: number; month: number; total: StatRow; rows: StatRow[] }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30, info: { Title: opts.title } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const BLUE = '#2563eb';
    const left = 30;
    const width = doc.page.width - 60;
    const cols = [
      { h: 'TOTAL ENT', f: 'countEnt', w: 62 }, { h: 'MUNI (TOT)', f: 'entMuniTotal', w: 62 },
      { h: 'MUNI (MAIL)', f: 'entMuniMail', w: 62 }, { h: 'MUNI (PAP)', f: 'entMuniPapier', w: 62 },
      { h: 'AUTRES (TOT)', f: 'entOtherTotal', w: 66 }, { h: 'AUTRES (MAIL)', f: 'entOtherMail', w: 66 },
      { h: 'AUTRES (PAP)', f: 'entOtherPapier', w: 66 }, { h: 'SORTANTS', f: 'countSor', w: 62 },
    ] as const;
    const numW = cols.reduce((s, c) => s + c.w, 0);
    const nameW = width - numW;

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(16).text(opts.title, left, 30);
    doc.font('Helvetica').fontSize(10).fillColor('#475569')
      .text(`Statistiques courrier — ${periodLabel(opts.year, opts.month)} (du 1er au dernier jour du mois)`, left, 52);
    doc.moveDown(0.5);

    let y = 80;
    const header = () => {
      doc.rect(left, y, width, 22).fill('#f1f5f9');
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text(opts.levelLabel.toUpperCase(), left + 8, y + 7, { width: nameW - 10 });
      let x = left + nameW;
      cols.forEach(c => { doc.text(c.h, x, y + 7, { width: c.w, align: 'center' }); x += c.w; });
      y += 22;
    };
    header();

    const line = (r: StatRow, isTotal: boolean) => {
      const reasons = isTotal ? reasonsText(r) : '';
      const h = isTotal ? (reasons ? 38 : 28) : 24;
      if (y + h > doc.page.height - 40) { doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 }); y = 30; header(); }
      if (isTotal) doc.rect(left, y, width, h).fill(BLUE);
      else doc.moveTo(left, y + h).lineTo(left + width, y + h).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      doc.fillColor(isTotal ? '#ffffff' : '#0f172a').font('Helvetica-Bold').fontSize(isTotal ? 11 : 9)
        .text(r.name, left + 8, y + (isTotal ? 8 : 7), { width: nameW - 12, height: 14, ellipsis: true });
      if (reasons) doc.font('Helvetica').fontSize(7).fillColor('#dbeafe').text(`Total entrants : ${reasons}`, left + 8, y + 26, { width: width - 16 });
      let x = left + nameW;
      cols.forEach(c => {
        const v = (r as any)[c.f] || 0;
        doc.font(isTotal || c.f === 'countEnt' || c.f === 'countSor' ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isTotal ? 13 : 10).fillColor(isTotal ? '#ffffff' : '#334155')
          .text(String(v), x, y + (isTotal ? 7 : 6), { width: c.w, align: 'center' });
        x += c.w;
      });
      y += h;
    };

    line(opts.total, true);
    opts.rows.forEach(r => line(r, false));

    // marge basse à 0 : sinon le pied de page déclenche un saut de page automatique
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
      .text(`Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} — Ville d'Ivry-sur-Seine`, left, doc.page.height - 30, { width });
    doc.end();
  });
}

/* ------------------------------------------------------------------ */
/* Assemblage données + PDF par destinataire                           */
/* ------------------------------------------------------------------ */

export type Unit = {
  kind: 'direction' | 'service';
  dir: string;
  service?: string;
};

export async function loadMonthStats(year: number, month: number) {
  const h = await fetchDirectHierarchy(year, { month: String(month), taskTypeId: '114', withServicesByDir: true });
  const servicesByDir: Record<string, StatRow[]> = (h as any).servicesByDir || {};
  const directions = (h.directions as any[]).filter(d => d.type !== 'Personne');
  return { directions, servicesByDir };
}

/** Directions uniquement : on écarte élus/adjoints, cabinet, DGA, chargés de mission, courrier... */
export const isDirection = (d: any) => /^(DIRECTION|DGS)\b/i.test(String(d.name).trim());

export function buildTree(stats: Awaited<ReturnType<typeof loadMonthStats>>) {
  // Directions uniquement : on écarte élus/adjoints, cabinet, DGA, chargés de mission, courrier...
  return stats.directions.filter(isDirection).map((d: any) => ({
    name: d.name as string, dga: d.dga as string | undefined, countEnt: d.countEnt as number, countSor: d.countSor as number,
    services: (stats.servicesByDir[d.name] || [])
      .filter((s: any) => s.type !== 'Personne')
      .map((s: any) => ({ name: s.name as string, countEnt: s.countEnt as number, countSor: s.countSor as number })),
  }));
}

export const slug =(s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');

export async function pdfForUnit(stats: Awaited<ReturnType<typeof loadMonthStats>>, u: Unit, year: number, month: number) {
  const dirRow = rowOrZero(stats.directions.find((d: any) => d.name === u.dir), u.dir);
  const svcs = (stats.servicesByDir[u.dir] || []).filter((s: any) => s.type !== 'Personne');
  const suffix = `${year}-${String(month).padStart(2, '0')}`;
  if (u.kind === 'direction') {
    const buf = await buildStatsPdf({ title: u.dir, levelLabel: 'Direction / Services', year, month, total: dirRow, rows: svcs });
    return { buf, filename: `Stats_${slug(u.dir)}_${suffix}.pdf`, label: u.dir };
  }
  const svc = rowOrZero(svcs.find((s: any) => s.name === u.service), u.service || '');
  const buf = await buildStatsPdf({ title: `${u.service} (${u.dir})`, levelLabel: 'Service', year, month, total: svc, rows: [] });
  return { buf, filename: `Stats_${slug(u.service || '')}_${suffix}.pdf`, label: u.service || '' };
}

/** Période par défaut : le mois précédent. */
export function defaultPeriod(now = new Date()) {
  const m = now.getMonth(); // 0-11 => mois précédent = m (1-12) sauf janvier
  return m === 0 ? { year: now.getFullYear() - 1, month: 12 } : { year: now.getFullYear(), month: m };
}
