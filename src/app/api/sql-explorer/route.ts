import { NextResponse } from 'next/server';
import { prismaSystem } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dbType = searchParams.get('db') || 'system'; // ignored, forced to system since entities is deleted
  const table = searchParams.get('table');

  try {
    if (!table) {
      // List tables
      const tables = await prismaSystem.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_prisma%'`) as any[];
      return NextResponse.json({ tables: tables.map(t => t.name) });
    }

    // Get table data
    const data = await prismaSystem.$queryRawUnsafe(`SELECT * FROM "${table}" LIMIT 200`) as any[];
    // Get table info (columns)
    const columnsRaw = await prismaSystem.$queryRawUnsafe(`PRAGMA table_info("${table}")`) as any[];
    const columns = columnsRaw.map(c => ({ name: c.name, type: c.type }));
    
    // Get indexes
    const indexesRaw = await prismaSystem.$queryRawUnsafe(`SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name = "${table}"`) as any[];
    
    return NextResponse.json({
      data,
      columns,
      indexes: indexesRaw,
      count: data.length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
