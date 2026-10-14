import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { touchActivity } from '@/lib/activity';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  // Signale la présence de l'utilisateur (appelé régulièrement par l'interface)
  await touchActivity(session.email, session.source === 'ad' ? 'ad' : 'local', session.role);
  return NextResponse.json({ authenticated: true, user: session });
}
