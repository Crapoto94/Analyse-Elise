import { NextResponse } from 'next/server';
import { prismaEntities, prismaSystem } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');
  const query = searchParams.get('query');
  const dbParam = searchParams.get('db') || 'entities';
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam) : 100;

  const prisma = dbParam === 'system' ? prismaSystem : prismaEntities;

  try {
    if (!table) {
      // List all tables from selected DB
      const tables: any[] = await prisma.$queryRawUnsafe(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE '_prisma%'
        ORDER BY name
      `);
      return NextResponse.json({ tables: tables.map((t: any) => t.name) });
    }

    // Validate table name (only alphanumeric + underscore for security)
    const safeName = table.replace(/[^a-zA-Z0-9_]/g, '');
    if (safeName !== table) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    if (query) {
      // Execute a custom SQL query (must not start with anything dangerous)
      const upperQuery = query.trim().toUpperCase();
      if (!upperQuery.startsWith('SELECT')) {
        return NextResponse.json({ error: 'Only SELECT queries are allowed' }, { status: 400 });
      }
      const rows: any[] = await prisma.$queryRawUnsafe(query);
      return NextResponse.json({ data: rows, count: rows.length });
    }

    // Get column info for this table
    const columns: any[] = await prisma.$queryRawUnsafe(
      `PRAGMA table_info("${safeName}")`
    );

    // Get count
    const countResult: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM "${safeName}"`
    );
    const totalCount = Number(countResult[0]?.cnt ?? 0);

    // Get rows
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "${safeName}" LIMIT ${limit}`
    );

    // Get indexes
    const indexes: any[] = await prisma.$queryRawUnsafe(
      `SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='${safeName}'`
    );

    return NextResponse.json({
      columns: columns.map((c: any) => ({ name: c.name, type: c.type })),
      data: rows,
      count: totalCount,
      indexes: indexes.map((idx: any) => ({ name: idx.name, sql: idx.sql }))
    });

  } catch (err: any) {
    console.error('SQL Explorer Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
