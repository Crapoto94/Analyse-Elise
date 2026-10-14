import { prismaSystem } from './prisma';

/**
 * Suivi des connexions : dernière connexion et dernière activité par utilisateur,
 * pour les comptes locaux comme pour ceux de l'AD (identifiants Windows).
 * Table UserActivity (aussi déclarée dans schema.prisma pour que `prisma db push` la conserve).
 */

export type Source = 'local' | 'ad';

export type ActivityRow = {
  identifier: string;
  source: Source;
  role: string;
  lastLogin: string | null;
  lastSeen: string | null;
  loginCount: number;
};

// Un utilisateur est « en ligne » s'il a été actif dans les 3 dernières minutes
// (l'interface signale sa présence toutes les 60 s).
export const ONLINE_WINDOW_MS = 3 * 60 * 1000;

let ready = false;
async function ensureTable() {
  if (ready) return;
  await prismaSystem.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS UserActivity (
       identifier TEXT NOT NULL PRIMARY KEY,
       source TEXT NOT NULL,
       role TEXT NOT NULL,
       lastLogin TEXT,
       lastSeen TEXT,
       loginCount INTEGER NOT NULL DEFAULT 0
     )`
  );
  ready = true;
}

/** Appelé à chaque connexion réussie (compte local ou AD). Ne doit jamais bloquer la connexion. */
export async function recordLogin(identifier: string, source: Source, role: string) {
  try {
    await ensureTable();
    const now = new Date().toISOString();
    await prismaSystem.$executeRawUnsafe(
      `INSERT INTO UserActivity (identifier, source, role, lastLogin, lastSeen, loginCount) VALUES (?, ?, ?, ?, ?, 1)
       ON CONFLICT(identifier) DO UPDATE SET source = excluded.source, role = excluded.role,
         lastLogin = excluded.lastLogin, lastSeen = excluded.lastSeen, loginCount = loginCount + 1`,
      identifier.toLowerCase(), source, role, now, now
    );
  } catch (e: any) {
    console.error('[ACTIVITY] recordLogin:', e.message);
  }
}

const lastTouch = new Map<string, number>();

/** Signale que l'utilisateur est actif (au plus une écriture toutes les 30 s par utilisateur). */
export async function touchActivity(identifier: string, source: Source, role: string) {
  const id = identifier.toLowerCase();
  const now = Date.now();
  if (now - (lastTouch.get(id) || 0) < 30_000) return;
  lastTouch.set(id, now);
  try {
    await ensureTable();
    const iso = new Date(now).toISOString();
    // Session encore valide mais jamais enregistrée (ex. ouverte avant cette fonction) : on la crée
    await prismaSystem.$executeRawUnsafe(
      `INSERT INTO UserActivity (identifier, source, role, lastLogin, lastSeen, loginCount) VALUES (?, ?, ?, NULL, ?, 0)
       ON CONFLICT(identifier) DO UPDATE SET lastSeen = excluded.lastSeen, role = excluded.role`,
      id, source, role, iso
    );
  } catch (e: any) {
    console.error('[ACTIVITY] touch:', e.message);
  }
}

export async function listActivity(): Promise<(ActivityRow & { online: boolean })[]> {
  await ensureTable();
  const rows = (await prismaSystem.$queryRawUnsafe(
    `SELECT identifier, source, role, lastLogin, lastSeen, loginCount FROM UserActivity ORDER BY COALESCE(lastSeen, lastLogin) DESC`
  )) as any[];
  const now = Date.now();
  return rows.map(r => ({
    identifier: r.identifier,
    source: r.source as Source,
    role: r.role,
    lastLogin: r.lastLogin,
    lastSeen: r.lastSeen,
    loginCount: Number(r.loginCount),
    online: !!r.lastSeen && now - new Date(r.lastSeen).getTime() < ONLINE_WINDOW_MS,
  }));
}
