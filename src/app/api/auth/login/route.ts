import { NextResponse } from 'next/server';
import { hashPassword, createSession, verifyUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const hashedPassword = hashPassword(password);

    // DEBUG LOGS (Safe: no passwords printed)
    const isAdminEmail = email === (process.env.ADMIN_EMAIL || 'admin@elise.local').trim().replace(/^["']|["']$/g, '');
    const expectedHash = process.env.ADMIN_PASSWORD_HASH ? process.env.ADMIN_PASSWORD_HASH.trim().replace(/^["']|["']$/g, '') : hashPassword('admin123');
    const isHashMatch = hashedPassword === expectedHash;

    console.log(`[LOGIN DEBUG] Email: ${email} | IsAdminEmail: ${isAdminEmail} | IsHashMatch: ${isHashMatch} | EnvHashPresent: ${!!process.env.ADMIN_PASSWORD_HASH}`);

    const isValid = await verifyUser(email, hashedPassword);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    await createSession({ email: email, role: 'ADMIN' });

    return NextResponse.json({ success: true, user: { email: email, role: 'ADMIN' } });

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message
    }, { status: 500 });
  }
}
