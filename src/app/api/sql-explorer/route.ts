import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');

  try {
    if (!table) {
      // List tables (Using a raw query for SQLite meta)
      const tables: any = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_prisma%'`;
      return NextResponse.json({ tables: tables.map((t: any) => t.name) });
    }

    // List data for a specific table
    // WARNING: For a real app, we should be careful with raw queries and table names. 
    // Here we use it for an administrator/developer tool.
    const data = await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].findMany({
        take: 100
    });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
