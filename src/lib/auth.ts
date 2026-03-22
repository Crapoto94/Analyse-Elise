import { cookies } from 'next/headers';
import crypto from 'crypto';
import { prismaSystem } from './prisma';

const AUTH_SECRET = process.env.AUTH_SECRET || 'elise-secret-key-12345';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@elise.local';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

export function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function verifyUser(email: string, passwordHash: string) {
  // Check in DB
  try {
    const user = await prismaSystem.user.findUnique({
      where: { email }
    });
    if (user && user.password === passwordHash) return user;
  } catch (e) {
    console.warn('[AUTH] DB check failed (table might be missing), falling back to env');
  }

  // Fallback to Env-based Admin
  if (!ADMIN_PASSWORD_HASH) {
    const defaultHash = hashPassword('admin123');
    if (email === 'admin@elise.local' && passwordHash === defaultHash) return { email, role: 'ADMIN' };
  } else if (email === ADMIN_EMAIL && passwordHash === ADMIN_PASSWORD_HASH) {
    return { email, role: 'ADMIN' };
  }
  
  return null;
}

export async function createSession(user: { email: string, role: string }) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const sessionData = JSON.stringify({ ...user, expires });
  
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(sessionData).digest('hex');
  const sessionToken = Buffer.from(JSON.stringify({ data: sessionData, sig: signature })).toString('base64');

  const isSecure = process.env.SESSION_SECURE !== undefined 
    ? process.env.SESSION_SECURE === 'true'
    : process.env.NODE_ENV === 'production';

  const cookieStore = await cookies();
  cookieStore.set('elise_session', sessionToken, {
    expires,
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('elise_session')?.value;
  if (!session) return null;

  try {
    const { data, sig } = JSON.parse(Buffer.from(session, 'base64').toString());
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('hex');
    
    if (sig !== expectedSig) return null;
    
    const parsed = JSON.parse(data);
    if (new Date(parsed.expires) < new Date()) return null;
    
    return parsed;
  } catch (e) {
    return null;
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('elise_session');
}
