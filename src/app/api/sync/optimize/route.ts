import { NextResponse } from 'next/server';
import { prismaEntities } from '@/lib/prisma';

export async function POST() {
  const encoder = new TextEncoder();
  const start = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
      };

      try {
        // 1. Create indices for Facts
        send({ step: 'indices_start', message: 'Création des index de performance...' });
        
        const indexTasks = [
          { name: 'idx_FactDoc_Direction', table: 'sync_FactDocument', col: 'DirectionId' },
          { name: 'idx_FactDoc_Type', table: 'sync_FactDocument', col: 'TypeId' },
          { name: 'idx_FactDoc_Date', table: 'sync_FactDocument', col: 'DocumentDateId' },
          { name: 'idx_FactDoc_State', table: 'sync_FactDocument', col: 'StateId' },
          { name: 'idx_FactTask_Doc', table: 'sync_FactTask', col: 'DocumentId' },
          { name: 'idx_FactTask_Assigned', table: 'sync_FactTask', col: 'AssignedToStructureElementId' },
          { name: 'idx_FactTask_State', table: 'sync_FactTask', col: 'TaskCalculatedStateId' }
        ];

        for (const task of indexTasks) {
          send({ step: 'index_item', message: `Indexation de ${task.table} (${task.col})...` });
          await prismaEntities.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "${task.name}" ON "${task.table}" ("${task.col}")`);
        }

        // 2. Performance Tuning (PRAGMAs)
        send({ step: 'tuning_start', message: 'Optimisation des paramètres SQLite (Boost)...' });
        await prismaEntities.$queryRawUnsafe(`PRAGMA journal_mode = WAL`);
        await prismaEntities.$queryRawUnsafe(`PRAGMA synchronous = NORMAL`);
        await prismaEntities.$queryRawUnsafe(`PRAGMA cache_size = -64000`); // 64MB Cache
        await prismaEntities.$queryRawUnsafe(`PRAGMA temp_store = MEMORY`);

        // 3. Statistics
        send({ step: 'analyze_start', message: 'Analyse des statistiques de la base...' });
        await prismaEntities.$executeRawUnsafe(`ANALYZE`);

        // 3. Cleanup
        send({ step: 'vacuum_start', message: 'Nettoyage et compaction (VACUUM)...' });
        try {
          await prismaEntities.$executeRawUnsafe(`VACUUM`);
        } catch (e) {
          console.warn('[Optimize] VACUUM skipped:', e);
          send({ step: 'vacuum_skipped', message: 'VACUUM ignoré (base en cours d\'utilisation)' });
        }

        const duration = Date.now() - start;
        send({ step: 'done', message: `Optimisation terminée en ${duration}ms`, duration });
        controller.close();
      } catch (err: any) {
        console.error('Optimization Error:', err);
        send({ step: 'error', message: err.message });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
