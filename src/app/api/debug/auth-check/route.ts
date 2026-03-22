import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prismaSystem } from '@/lib/prisma';

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('elise_session');
  
  function cleanEnv(val: string | undefined): string | undefined {
    if (!val) return val;
    return val.trim().replace(/^["']|["']$/g, '');
  }

  // DB Write Test
  let dbWriteResult = "pending";
  try {
    const testKey = `test_${Date.now()}`;
    await (prismaSystem as any).appConfig.create({
      data: { key: testKey, value: "test" }
    });
    await (prismaSystem as any).appConfig.delete({
      where: { key: testKey }
    });
    dbWriteResult = "success";
  } catch (err: any) {
    dbWriteResult = `failed: ${err.message}`;
  }

  const isSecureEnv = process.env.SESSION_SECURE;
  const isSecureFinal = cleanEnv(isSecureEnv) === 'true';

  return NextResponse.json({
    diagnostics: {
      currentTime: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      sessionSecureEnv: isSecureEnv,
      sessionSecureFinal: isSecureFinal,
      dbWriteTest: dbWriteResult,
      dbUrlSystem: process.env.DATABASE_URL_SYSTEM?.replace(/:[^:]*@/, ':***@'), // Mask password if any
      hasAuthSecret: !!process.env.AUTH_SECRET,
      cookiePresent: !!sessionCookie,
    }
  });
}
