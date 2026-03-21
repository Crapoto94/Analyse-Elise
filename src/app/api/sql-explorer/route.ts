import { NextResponse } from 'next/server';
import { prismaEntities, prismaSystem } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  // 1. Security Check (ADMIN ONLY)
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');
  const query = searchParams.get('query');
  const dbParam = searchParams.get('db') || 'entities';
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam) : 100;

  const isPostgres = dbParam === 'entities' && process.env.DATABASE_URL_ENTITIES?.startsWith('postgresql');
  const prisma = dbParam === 'system' ? prismaSystem : prismaEntities;

  try {
    if (!table) {
      // List all tables
      const tables: any[] = isPostgres 
        ? await prisma.$queryRawUnsafe(`SELECT tablename as name FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename`)
        : await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_prisma%' ORDER BY name`);
      
      return NextResponse.json({ tables: tables.map((t: any) => t.name) });
    }

    const safeName = table.replace(/[^a-zA-Z0-9_]/g, '');
    if (safeName !== table) return NextResponse.json({ error: 'Invalid name' }, { status: 400 });

    if (query) {
      const upperQuery = query.trim().toUpperCase();
      if (!upperQuery.startsWith('SELECT')) return NextResponse.json({ error: 'SELECT only' }, { status: 400 });
      const rows: any[] = await prisma.$queryRawUnsafe(query);
      return NextResponse.json({ data: rows, count: rows.length });
    }

    // Column info
    const columns: any[] = isPostgres 
      ? await prisma.$queryRawUnsafe(`SELECT column_name as name, data_type as type FROM information_schema.columns WHERE table_name = '${safeName}'`)
      : await prisma.$queryRawUnsafe(`PRAGMA table_info("${safeName}")`);

    // Count
    const countResult: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM "${safeName}"`);
    const totalCount = Number(countResult[0]?.cnt ?? countResult[0]?.count ?? 0);

    // Rows
    const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "${safeName}" LIMIT ${limit}`);

    // Indexes
    const indexes: any[] = isPostgres
      ? await prisma.$queryRawUnsafe(`SELECT indexname as name, indexdef as sql FROM pg_indexes WHERE tablename = '${safeName}'`)
      : await prisma.$queryRawUnsafe(`SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='${safeName}'`);

    return NextResponse.json({
      columns: columns.map((c: any) => ({ name: c.name, type: isPostgres ? c.type : (c.type || 'TEXT') })),
      data: rows,
      count: totalCount,
      indexes: indexes.map((idx: any) => ({ name: idx.name, sql: idx.sql || idx.indexdef }))
    });

  } catch (err: any) {
    console.error('SQL Explorer Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
