import { NextResponse } from 'next/server';
import { hashPassword, createSession, verifyUser } from '@/lib/auth';
import { authenticateAd } from '@/lib/ad-auth';

export async function POST(req: Request) {
  try {
    // "email" conservé pour compatibilité : c'est l'identifiant saisi (e-mail local ou identifiant AD)
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Identifiant et mot de passe requis' }, { status: 400 });
    }

    // 1) Comptes locaux (admin de secours, base system.db)
    const user = await verifyUser(email, hashPassword(password));
    if (user) {
      // Role casing normalization (ensure comparison works with Sidebar.tsx)
      const normalizedRole = user.role.toUpperCase();
      await createSession({ email: user.email, role: normalizedRole });
      return NextResponse.json({ success: true, user: { email: user.email, role: normalizedRole } });
    }

    // 2) Active Directory de la Ville, via l'APM
    const ad = await authenticateAd(email, password);
    if (ad.ok) {
      await createSession({ email: ad.username, role: ad.role });
      return NextResponse.json({ success: true, user: { email: ad.username, role: ad.role }, source: 'ad' });
    }
    return NextResponse.json({ error: ad.error }, { status: ad.status });

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
