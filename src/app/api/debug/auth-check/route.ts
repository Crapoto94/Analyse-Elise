import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('elise_session');
  
  function cleanEnv(val: string | undefined): string | undefined {
    if (!val) return val;
    return val.trim().replace(/^["']|["']$/g, '');
  }

  const isSecureEnv = process.env.SESSION_SECURE;
  const isSecureFinal = isSecureEnv !== undefined 
    ? cleanEnv(isSecureEnv) === 'true'
    : process.env.NODE_ENV === 'production';

  return NextResponse.json({
    diagnostics: {
      currentTime: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      sessionSecureEnv: isSecureEnv,
      sessionSecureFinal: isSecureFinal,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      cookiePresent: !!sessionCookie,
      cookieValuePreview: sessionCookie ? sessionCookie.value.substring(0, 10) + '...' : null,
      headers: {
        host: process.env.HOSTNAME || 'unknown',
      }
    }
  });
}
