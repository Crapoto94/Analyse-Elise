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
function inferColumns(sample: Record<string, any>): { name: string; type: string }[] {
  return Object.entries(sample).map(([key, val]) => {
    if (val !== null && typeof val === 'object') return { name: key, type: 'TEXT' };
    if (typeof val === 'number') return { name: key, type: 'REAL' };
    if (typeof val === 'boolean') return { name: key, type: 'INTEGER' };
    return { name: key, type: 'TEXT' };
  });
}

/**
 * Create table if not exists, then add any missing columns (IN ENTITIES DB)
 */
async function ensureTable(tableName: string, cols: { name: string; type: string }[]): Promise<void> {
  const colDefs = cols.map(c => `"${c.name}" ${c.type}`).join(', ');
  await prismaEntities.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "${tableName}" (_id INTEGER PRIMARY KEY AUTOINCREMENT, _sync_date TEXT, ${colDefs})`
  );

  // Upgrade the old non-unique index to a UNIQUE INDEX for INSERT OR REPLACE
  await prismaEntities.$executeRawUnsafe(`DROP INDEX IF EXISTS "idx_${tableName}_external_id"`);
  await prismaEntities.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "idx_${tableName}_external_id_unique" ON "${tableName}" ("_external_id")`
  );

  const existingCols = (await prismaEntities.$queryRawUnsafe(
    `PRAGMA table_info("${tableName}")`
  )) as { name: string }[];
  const existingNames = new Set(existingCols.map((c) => c.name));

  for (const col of cols) {
    if (!existingNames.has(col.name)) {
      await prismaEntities.$executeRawUnsafe(
        `ALTER TABLE "${tableName}" ADD COLUMN "${col.name}" ${col.type}`
      );
    }
  }
}

/**
 * Bulk upsert items (IN ENTITIES DB)
 */
async function bulkUpsert(tableName: string, items: any[], allCols: { name: string; type: string }[]): Promise<void> {
  const BATCH_SIZE = 500;
  const colNamesStr = ['"_sync_date"', ...allCols.map(c => `"${c.name}"`)].join(', ');
  const numParamsPerRow = allCols.length + 1;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const placeholders: string[] = [];
    const values: any[] = [];
    const nowStr = new Date().toISOString();

    for (const item of chunk) {
      placeholders.push(`(${new Array(numParamsPerRow).fill('?').join(', ')})`);
      values.push(nowStr);

      for (const col of allCols) {
        if (col.name === '_external_id') {
          values.push(item._external_id);
        } else {
          const val = item[col.name];
          values.push(val !== null && typeof val === 'object' ? JSON.stringify(val) : (val ?? null));
        }
      }
    }

    const query = `INSERT OR REPLACE INTO "${tableName}" (${colNamesStr}) VALUES ${placeholders.join(', ')}`;
    await prismaEntities.$executeRawUnsafe(query, ...values);
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
  const { config, entities: selectedEntities } = await req.json();

  if (!config) {
    return NextResponse.json({ error: 'Config missing' }, { status: 400 });
  }

  const client = getODataClient(config);
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

              const cols = inferColumns(sampleMerged);
              const allCols = [{ name: '_external_id', type: 'TEXT' }, ...cols];
              await ensureTable(tableName, allCols);

              for (let k = 0; k < items.length; k++) {
                const item = items[k];
                item._external_id = item.Id !== undefined ? String(item.Id)
                  : item.Key !== undefined ? String(item.Key)
                  : `row_${count + k}_${Math.random().toString(36).substr(2, 6)}`;
              }

              await bulkUpsert(tableName, items, allCols);
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
          console.error(`[Sync] Error syncing ${entity}:`, err.message);
          entityStats[entity] = -1;
          send({ type: 'entity_error', entity, error: err.message });
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
