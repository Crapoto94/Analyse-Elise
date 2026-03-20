import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const authHeader = request.headers.get('Authorization');
  console.log(`[PROXY] Fetching: ${targetUrl} (Auth: ${!!authHeader})`);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        ...(authHeader ? { 'Authorization': authHeader } : {}),
        'Accept': request.headers.get('Accept') || 'application/json',
      },
    });

    const contentType = response.headers.get('Content-Type');
    const data = contentType?.includes('application/json') 
      ? await response.json() 
      : await response.text();

    return new NextResponse(
      typeof data === 'string' ? data : JSON.stringify(data),
      {
        status: response.status,
        headers: {
          'Content-Type': contentType || 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Proxy request failed', details: error.message }, { status: 500 });
  }
}
