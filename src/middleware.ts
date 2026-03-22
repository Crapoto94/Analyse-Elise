import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('elise_session');
  const { pathname } = request.nextUrl;

  // Allow login page, auth APIs, health check and debug diagnostics
  if (
    pathname.startsWith('/login') || 
    pathname.startsWith('/api/auth') || 
    pathname.startsWith('/api/users') || 
    pathname === '/api/health' || 
    pathname.startsWith('/api/debug')
  ) {
    return NextResponse.next();
  }

  // Redirect to login if no session
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo.jpg (public assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.jpg).*)',
  ],
};
