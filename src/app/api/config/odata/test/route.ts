import { NextResponse } from 'next/server';
import { ODataClient } from '@/lib/odata';
import { getODataConfig } from '@/lib/odata-direct';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const body = await req.json();
    const config = await getODataConfig();
    
    // Combine stored config with provided overrides (e.g. temporary password for testing)
    const testConfig = {
      baseUrl: body.baseUrl || config.baseUrl,
      username: body.username || config.username,
      password: body.password || config.password
    };

    if (!testConfig.baseUrl) {
      return NextResponse.json({ error: 'Base URL is required' }, { status: 400 });
    }

    const client = new ODataClient(testConfig);
    await client.getMetadata();

    return NextResponse.json({ success: true, message: 'Connexion OData réussie' });
  } catch (err: any) {
    console.error('[API OData Test] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
