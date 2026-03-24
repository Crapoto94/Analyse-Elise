import { NextResponse } from 'next/server';
import { hashPassword, createSession, verifyUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const hashedPassword = hashPassword(password);

    const user = await verifyUser(email, hashedPassword);

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Role casing normalization (ensure comparison works with Sidebar.tsx)
    const normalizedRole = user.role.toUpperCase();

    await createSession({ email: user.email, role: normalizedRole });

    return NextResponse.json({ 
      success: true, 
      user: { email: user.email, role: normalizedRole } 
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message
    }, { status: 500 });
  }
}
