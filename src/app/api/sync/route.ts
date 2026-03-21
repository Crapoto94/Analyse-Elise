import { NextResponse } from 'next/server';
import { prismaEntities, prismaSystem } from '@/lib/prisma';
import { getODataClient } from '@/lib/odata';

/**
 * Sanitize an entity name to be a safe SQL table name
 */
function tableNameFor(entity: string): string {
  return `sync_${entity.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

/**
 * Introspect an object and return column definitions
 */
function inferColumns(sample: Record<string, any>, isPostgres: boolean): { name: string; type: string }[] {
  return Object.entries(sample).map(([key, val]) => {
    if (val !== null && typeof val === 'object') return { name: key, type: 'TEXT' };
    if (typeof val === 'number') return { name: key, type: isPostgres ? 'DOUBLE PRECISION' : 'REAL' };
    if (typeof val === 'boolean') return { name: key, type: isPostgres ? 'BOOLEAN' : 'INTEGER' };
    return { name: key, type: 'TEXT' };
  });
}

/**
 * Create table if not exists, then add any missing columns (IN ENTITIES DB)
 */
async function ensureTable(tableName: string, cols: { name: string; type: string }[], isPostgres: boolean): Promise<void> {
  const colDefs = cols.map(c => `"${c.name}" ${c.type}`).join(', ');
  
  if (isPostgres) {
    await prismaEntities.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "${tableName}" (_id SERIAL PRIMARY KEY, _sync_date TEXT, ${colDefs})`
    );
    try {
      await prismaEntities.$executeRawUnsafe(
        `ALTER TABLE "${tableName}" ADD CONSTRAINT "${tableName}_external_id_unique" UNIQUE ("_external_id")`
      );
    } catch (e) {}
  } else {
    await prismaEntities.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "${tableName}" (_id INTEGER PRIMARY KEY AUTOINCREMENT, _sync_date TEXT, ${colDefs})`
    );
    await prismaEntities.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_${tableName}_external_id_unique" ON "${tableName}" ("_external_id")`
    );
  }

  const existingCols = isPostgres 
    ? (await prismaEntities.$queryRawUnsafe(`SELECT column_name as name FROM information_schema.columns WHERE table_name = '${tableName}'`)) as { name: string }[]
    : (await prismaEntities.$queryRawUnsafe(`PRAGMA table_info("${tableName}")`)) as { name: string }[];
    
  const existingNames = new Set(existingCols.map((c) => c.name));

  for (const col of cols) {
    if (!existingNames.has(col.name)) {
      await prismaEntities.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN "${col.name}" ${col.type}`);
    }
  }
}

/**
 * Bulk upsert items (IN ENTITIES DB)
 */
async function bulkUpsert(tableName: string, items: any[], allCols: { name: string; type: string }[], isPostgres: boolean): Promise<void> {
  // Use a very small batch size for major tables to avoid any parameter or memory limits
  // 10 rows with 50 columns = 500 parameters (Very safe for all DBs)
  const BATCH_SIZE = 10; 
  const colNames = ['_sync_date', ...allCols.map(c => c.name)];
  const colNamesStr = colNames.map(n => `"${n}"`).join(', ');
  
  const updateSet = colNames
    .filter(n => n !== '_external_id')
    .map(n => isPostgres ? `"${n}" = EXCLUDED."${n}"` : `"${n}" = excluded."${n}"`)
    .join(', ');

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const placeholders: string[] = [];
    const values: any[] = [];
    const nowStr = new Date().toISOString();
    let paramCount = 1;

    for (const item of chunk) {
      const rowP: string[] = [];
      
      // _sync_date
      rowP.push(isPostgres ? `$${paramCount++}` : '?');
      values.push(nowStr);

      for (const col of allCols) {
        // We use explicit casting only if needed, otherwise let the driver handle nulls
        rowP.push(isPostgres ? `$${paramCount++}` : '?');
        
        if (col.name === '_external_id') {
          values.push(String(item._external_id)); 
        } else {
          let val = item[col.name];
          if (val === undefined) val = null;
          
          if (col.type === 'BOOLEAN' && val !== null) {
            values.push(val === true || val === 'true' || val === 1);
          } else if ((col.type === 'REAL' || col.type === 'DOUBLE PRECISION') && val !== null) {
            const num = Number(val);
            values.push(isNaN(num) ? null : num);
          } else {
            values.push(val !== null && typeof val === 'object' ? JSON.stringify(val) : (val ?? null));
          }
        }
      }
      placeholders.push(`(${rowP.join(', ')})`);
    }

    const query = `INSERT INTO "${tableName}" (${colNamesStr}) VALUES ${placeholders.join(', ')} ON CONFLICT ("_external_id") DO UPDATE SET ${updateSet}`;

    try {
      await prismaEntities.$executeRawUnsafe(query, ...values);
    } catch (err: any) {
      console.error(`[bulkUpsert] FATAL Error on ${tableName}:`, {
        message: err.message,
        isPostgres,
        itemCount: chunk.length,
        paramsCount: values.length,
        queryStart: query.substring(0, 500)
      });
      throw err;
    }
  }
}

/**
 * Ensure performance indexes exist (IN ENTITIES DB)
 */
async function ensureIndexes(tableName: string): Promise<void> {
  const indexes: Record<string, string[]> = {
    'sync_FactTask': ['DocumentId', 'AssignedToStructureElementId'],
    'sync_FactDocument': ['Id', 'CreatedDate'],
    'sync_DimStructureElementPath': ['Id']
  };

  const cols = indexes[tableName];
  if (!cols) return;

  for (const col of cols) {
    const indexName = `idx_${tableName}_${col.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    await prismaEntities.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" ("${col}")`
    );
  }
}

/**
 * SSE encoder helper
 */
function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
    let { baseUrl, username, password, entities: selectedEntities } = await req.json();

    // Fallback to server-side config if not provided in request
    if (!baseUrl || !username || !password) {
      const savedConfig = await prismaSystem.appConfig.findUnique({
        where: { key: 'odata_config' }
      });
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig.value);
        baseUrl = baseUrl || parsed.baseUrl;
        username = username || parsed.username;
        password = password || parsed.password;
      }
    }

    if (!baseUrl || !username || !password) {
      return NextResponse.json({ error: 'OData configuration missing' }, { status: 400 });
    }

  const client = getODataClient({ baseUrl, username, password });
  if (!client) {
    return NextResponse.json({ error: 'Client not initialized' }, { status: 400 });
  }

  const startTime = new Date();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(sseEvent(data)));
      };

      let allEntities: string[] = [];
      try {
        if (!selectedEntities || selectedEntities.length === 0) {
          const root = (await (client as any).request('')) as any;
          allEntities = (root.value || []).map((e: any) => e.name);
        } else {
          allEntities = selectedEntities;
        }
      } catch (e: any) {
        send({ type: 'error', message: 'Failed to access OData: ' + e.message });
        controller.close();
        return;
      }

      send({ type: 'start', total: allEntities.length, entities: allEntities });

      const entityStats: Record<string, number> = {};
      let totalCount = 0;

      const isPostgres = process.env.DATABASE_URL_ENTITIES?.startsWith('postgresql');

      for (let i = 0; i < allEntities.length; i++) {
        const entity = allEntities[i];
        const tableName = tableNameFor(entity);

        send({ type: 'entity_start', entity, index: i, total: allEntities.length });

        try {
          let count = 0;
          let nextUrl: string | null = entity;

          while (nextUrl) {
            const res = (await (client as any).request(nextUrl)) as any;
            const items: any[] = res.value || [];

            if (items.length > 0) {
              const sampleMerged: Record<string, any> = {};
              for (const item of items) {
                for (const [k, v] of Object.entries(item)) {
                  if (!(k in sampleMerged)) sampleMerged[k] = v;
                }
              }

              const cols = inferColumns(sampleMerged, !!isPostgres);
              const allCols = [{ name: '_external_id', type: 'TEXT' }, ...cols];
              await ensureTable(tableName, allCols, !!isPostgres);

              for (let k = 0; k < items.length; k++) {
                const item = items[k];
                item._external_id = item.Id !== undefined ? String(item.Id)
                  : item.Key !== undefined ? String(item.Key)
                  : `row_${count + k}_${Math.random().toString(36).substr(2, 6)}`;
              }

              await bulkUpsert(tableName, items, allCols, !!isPostgres);
              count += items.length;
            }

            nextUrl = (res['@odata.nextLink'] as string) || null;
            send({ type: 'entity_progress', entity, count });
          }

          send({ type: 'entity_fetched', entity, count });
          
          // Create indexes for performance
          await ensureIndexes(tableName);
          
          send({ type: 'entity_done', entity, count });
          entityStats[entity] = count;
          totalCount += count;

        } catch (err: any) {
          const is404 = err.message?.includes('404') || err.status === 404;
          console.error(`[Sync] Error syncing ${entity}:`, err.message);
          entityStats[entity] = -1;
          send({ 
            type: 'entity_error', 
            entity, 
            error: is404 ? 'Non exporté (404)' : err.message 
          });
        }
      }

      // Write sync log (IN SYSTEM DB)
      try {
        await prismaSystem.syncLog.create({
          data: {
            startTime,
            endTime: new Date(),
            durationMs: new Date().getTime() - startTime.getTime(),
            docsCount: totalCount,
            tasksCount: 0,
            status: 'SUCCESS',
            message: Object.entries(entityStats)
              .map(([k, v]) => `${k}:${v >= 0 ? v : 'ERR'}`)
              .join(' | ')
          }
        });
      } catch (logErr: any) {
        console.error('[Sync] Failed to write SyncLog:', logErr.message);
      }

      send({ type: 'done', totalCount, stats: entityStats });
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
