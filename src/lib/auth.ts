import { cookies } from 'next/headers';
import crypto from 'crypto';

const AUTH_SECRET = process.env.AUTH_SECRET || 'elise-secret-key-12345';

export function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function createSession(user: { email: string, role: string }) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const sessionData = JSON.stringify({ ...user, expires });
  
  // Simple signature for the session to prevent tampering
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(sessionData).digest('hex');
  const sessionToken = Buffer.from(JSON.stringify({ data: sessionData, sig: signature })).toString('base64');

  const cookieStore = await cookies();
  cookieStore.set('elise_session', sessionToken, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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
