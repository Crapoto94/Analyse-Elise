import { NextResponse } from 'next/server';
import { prismaSystem } from '@/lib/prisma';
import { hashPassword, createSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const hashedPassword = hashPassword(password);

    const user = await prismaSystem.user.findFirst({
      where: {
        email: email,
        password: hashedPassword
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    await createSession({ email: user.email, role: user.role });

    return NextResponse.json({ success: true, user: { email: user.email, role: user.role } });

  } catch (error: any) {
    console.error('Login Error Deep Diagnostic:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      metaData: error.meta,
      dbUrlSystem: process.env.DATABASE_URL_SYSTEM?.replace(/:[^:@]+@/, ':***@')
    });
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message, 
      code: error.code 
    }, { status: 500 });
  }
}
