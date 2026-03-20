import { NextResponse } from 'next/server';
import { prismaEntities } from '@/lib/prisma';
import { getODataClient } from '@/lib/odata';
import fs from 'fs';
import path from 'path';

const DEBUG_LOG = 'c:/dev/Stat_Elise_New/tmp/sync_debug_abs.log';

function logDebug(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  if (!fs.existsSync(path.dirname(DEBUG_LOG))) fs.mkdirSync(path.dirname(DEBUG_LOG), { recursive: true });
  fs.appendFileSync(DEBUG_LOG, line);
  console.log(msg);
}

async function ensureTable(tableName: string, cols: { name: string; type: string }[]): Promise<void> {
  const colDefs = cols.map(c => `"${c.name}" ${c.type}`).join(', ');
  await prismaEntities.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "${tableName}" (_id INTEGER PRIMARY KEY AUTOINCREMENT, _sync_date TEXT, _external_id TEXT, ${colDefs})`
  );
  await prismaEntities.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_${tableName}_external_id_unique" ON "${tableName}" ("_external_id")`);
  
  const existingCols = (await prismaEntities.$queryRawUnsafe(`PRAGMA table_info("${tableName}")`)) as any[];
  const existingNames = new Set(existingCols.map((c) => c.name));
  
  // Internal columns check
  if (!existingNames.has('_sync_date')) {
    await prismaEntities.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN _sync_date TEXT`);
  }
  if (!existingNames.has('_external_id')) {
    await prismaEntities.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN _external_id TEXT`);
  }

  for (const col of cols) {
    if (!existingNames.has(col.name)) {
      await prismaEntities.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN "${col.name}" ${col.type}`);
    }
  }
}

export async function POST(req: Request) {
  try {
    fs.writeFileSync(DEBUG_LOG, '--- NEW SYNC ATTEMPT ---\n');
    const { config: rawConfig } = await req.json();
    if (!rawConfig) return NextResponse.json({ error: 'Missing sync config' }, { status: 400 });

    const config = {
      baseUrl: rawConfig.ODATA_URL,
      username: rawConfig.ODATA_USER,
      password: rawConfig.ODATA_PASS
    };
    
    if (!config.baseUrl) return NextResponse.json({ error: 'Invalid config: ODATA_URL missing' }, { status: 400 });
    if (!config.username || !config.password) {
      logDebug('[Sync] Missing credentials');
      return NextResponse.json({ error: 'Identifiants OData manquants' }, { status: 400 });
    }

    const client = getODataClient(config);
    logDebug(`[Sync] Started for ${config.baseUrl}`);
    
    try {
      const root = await (client as any).request('');
      logDebug(`[Sync] OData OK. Entities: ${(root.value || []).length}`);
    } catch (connErr: any) {
      logDebug(`[Sync] Connection FAILED: ${connErr.message}`);
      return NextResponse.json({ error: 'Connexion OData échouée: ' + connErr.message }, { status: 500 });
    }

    const dimensions = ['DocumentMedium', 'DocumentType', 'DocumentState', 'StructureElementPath'];
    const stats: Record<string, number> = {};

    for (const baseName of dimensions) {
      try {
        logDebug(`[Sync] Probing ${baseName}...`);
        const namesToTry = [`Dim${baseName}`, baseName];
        let res: any = null;
        let finalEntityName = '';

        for (const name of namesToTry) {
          try {
            logDebug(`  - Trying ${name}...`);
            res = await (client as any).request(name + '?$top=1');
            if (res && res.value) {
              finalEntityName = name;
              logDebug(`  - Found ${name}`);
              break;
            }
          } catch (e: any) { 
            logDebug(`  - Error for ${name}: ${e.message}`);
          }
        }

        if (!res || !res.value) {
          logDebug(`  - FAILED to find ${baseName}`);
          stats[baseName] = -1;
          continue;
        }

        // Fetch ALL items now that we know the name
        logDebug(`  - Fetching all records for ${finalEntityName}...`);
        const items: any[] = [];
        let nextUrl: string | null = finalEntityName;

        while (nextUrl) {
          const pageRes: any = await (client as any).request(nextUrl);
          if (pageRes && pageRes.value) {
            items.push(...pageRes.value);
            nextUrl = pageRes['@odata.nextLink'] || null;
            if (nextUrl && !nextUrl.startsWith('http')) {
              // Handle relative nextLink if necessary (usually they are absolute or relative to baseUrl)
              // But ODataClient.request handles both.
            }
          } else {
            nextUrl = null;
          }
        }
        
        logDebug(`  - Syncing ${items.length} records into sync_Dim${baseName}`);
        const tableName = `sync_Dim${baseName}`;
        
        if (items.length > 0) {
          const sample = items[0];
          const cols = Object.entries(sample).map(([k,v]) => ({
            name: k,
            type: typeof v === 'number' ? 'REAL' : 'TEXT'
          }));
          await ensureTable(tableName, cols);

          for (const item of items) {
            const extId = String(item.Id || item.Key || Math.random());
            const keys = Object.keys(item);
            const placeholders = keys.map(() => '?').join(',');
            const vals = Object.values(item).map(v => v !== null && typeof v === 'object' ? JSON.stringify(v) : v);
            
            await prismaEntities.$executeRawUnsafe(
              `INSERT OR REPLACE INTO "${tableName}" (_external_id, _sync_date, ${keys.map(k => `"${k}"`).join(',')}) VALUES (?, ?, ${placeholders})`,
              extId, new Date().toISOString(), ...vals
            );
          }
        }
        stats[baseName] = items.length;
      } catch (e: any) {
        logDebug(`[Sync] Error for ${baseName}: ${e.message}`);
        stats[baseName] = -1;
      }
    }

    return NextResponse.json({ success: true, stats });
  } catch (err: any) {
    logDebug(`[Sync] FATAL: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
