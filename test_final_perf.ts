import { fetchDirectHierarchy } from './src/lib/odata-direct';
import dotenv from 'dotenv';
dotenv.config();

async function testFinalPerf() {
  console.log('--- TEST DE PERFORMANCE FINAL (Post-Simplification) : Pôle DGS 2024 ---');
  const start = Date.now();
  
  const data = await fetchDirectHierarchy(2024, { pole: 'DGS', dga: 'all', dir: 'all' });
  
  const duration = Date.now() - start;
  console.log(`\nTemps d'exécution total: ${duration}ms (${(duration/1000).toFixed(2)}s)`);
  console.log(`Nombre de pôles retournés: ${data.poles?.length || 0}`);
}

testFinalPerf().catch(console.error);
