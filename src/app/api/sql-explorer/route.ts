import { NextResponse } from "next/server";
import { prismaSystem } from "@/lib/prisma";
import { logApiRequest } from "@/lib/audit";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  
  const start = Date.now();
  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table");

  try {
    if (!table) {
      // List tables
      const tablesRaw = (await prismaSystem.$queryRawUnsafe(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_prisma%'`,
      )) as any[];
      const tables = tablesRaw.map((t) => t.name);
      await logApiRequest(`/api/sql-explorer`, "GET", 200, Date.now() - start);
      return NextResponse.json({ tables });
    }

    // Get table data
    const data = (await prismaSystem.$queryRawUnsafe(
      `SELECT * FROM "${table}" LIMIT 200`,
    )) as any[];
    // Get table info (columns)
    const columnsRaw = (await prismaSystem.$queryRawUnsafe(
      `PRAGMA table_info("${table}")`,
    )) as any[];
    const columns = columnsRaw.map((c) => ({ name: c.name, type: c.type }));

    // Get indexes
    const indexesRaw = (await prismaSystem.$queryRawUnsafe(
      `SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name = "${table}"`,
    )) as any[];

    await logApiRequest(
      `/api/sql-explorer?table=${table}`,
      "GET",
      200,
      Date.now() - start,
    );

    return NextResponse.json({
      data,
      columns,
      indexes: indexesRaw,
      count: data.length,
    });
  } catch (err: any) {
    console.error("SQL Explorer API Error:", err);
    await logApiRequest(
      `/api/sql-explorer${table ? "?table=" + table : ""}`,
      "GET",
      500,
      Date.now() - start,
    );
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
