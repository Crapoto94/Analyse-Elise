import { env, postJson } from './stats-mail';

/**
 * Authentification par l'Active Directory de la Ville, via l'APM
 * (POST /api/v1/ad/authenticate, permission ad_auth sur la clé).
 *
 * Autorisation : un compte AD valide ne suffit pas (tous les agents en ont un).
 * Seuls les identifiants listés dans AD_ADMIN_USERS (rôle ADMIN) ou AD_ALLOWED_USERS
 * (rôle USER), séparés par des virgules, peuvent entrer.
 */

const list = (name: string) => env(name).split(/[,;\s]+/).map(x => normalizeUsername(x)).filter(Boolean);

/** "IVRY\jdupont", "jdupont@ivry94.fr" ou "JDupont" -> "jdupont" */
export function normalizeUsername(raw: string): string {
  let u = (raw || '').trim();
  if (u.includes('\\')) u = u.split('\\').pop() || '';
  if (u.includes('@')) u = u.split('@')[0];
  return u.toLowerCase();
}

export function adRoleFor(username: string): 'ADMIN' | 'USER' | null {
  if (list('AD_ADMIN_USERS').includes(username)) return 'ADMIN';
  if (list('AD_ALLOWED_USERS').includes(username)) return 'USER';
  return null;
}

// Limitation des tentatives (en mémoire) : 5 échecs / 10 min par identifiant
const failures = new Map<string, number[]>();
const WINDOW = 10 * 60 * 1000;
const MAX_FAILS = 5;

function recent(u: string) {
  const now = Date.now();
  const l = (failures.get(u) || []).filter(t => now - t < WINDOW);
  failures.set(u, l);
  return l;
}

export type AdResult =
  | { ok: true; username: string; role: 'ADMIN' | 'USER' }
  | { ok: false; status: number; error: string };

export async function authenticateAd(rawUsername: string, password: string): Promise<AdResult> {
  const username = normalizeUsername(rawUsername);
  if (!username || !password) return { ok: false, status: 400, error: 'Identifiant et mot de passe requis' };
  if (!env('APM_API_URL') || !env('APM_API_KEY')) return { ok: false, status: 503, error: 'Authentification AD non configurée' };
  if (recent(username).length >= MAX_FAILS) return { ok: false, status: 429, error: 'Trop de tentatives, réessayez dans quelques minutes' };

  // Compte non autorisé : on ne sollicite même pas l'AD (évite de verrouiller des comptes pour rien)
  if (!adRoleFor(username)) {
    return { ok: false, status: 403, error: "Compte AD non autorisé sur cette application" };
  }

  try {
    const { status, text } = await postJson(`${env('APM_API_URL')}/api/v1/ad/authenticate`,
      { 'X-API-KEY': env('APM_API_KEY') }, { username, password }, 20000);
    let json: any = {};
    try { json = JSON.parse(text); } catch { /* non JSON */ }
    if (status === 200 && json.success !== false) {
      failures.delete(username);
      return { ok: true, username, role: adRoleFor(username)! };
    }
    if (status === 401 || status === 403 || json.success === false) {
      failures.set(username, [...recent(username), Date.now()]);
      return { ok: false, status: 401, error: 'Identifiants invalides' };
    }
    return { ok: false, status: 502, error: `Service d'authentification indisponible (${status})` };
  } catch (e: any) {
    return { ok: false, status: 502, error: `Service d'authentification indisponible : ${e.message}` };
  }
}
