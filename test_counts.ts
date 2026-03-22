
import { fetchStatsByFilters, fetchDirectHierarchy } from './src/lib/odata-direct';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const year = 2024;
  console.log("--- TEST COMPTAGE LOCAL ---");
  
  try {
    const startStats = Date.now();
    const stats = await fetchStatsByFilters(year, 'all', { pole: 'all', dga: 'all', dir: 'all', service: 'all', status: 'all' });
    console.log(`fetchStatsByFilters TotalDocs: ${stats.totalDocs} (Took ${Date.now() - startStats}ms)`);
    
    const startHier = Date.now();
    const hierarchy = await fetchDirectHierarchy(year, { pole: 'all', dga: 'all', dir: 'all', month: 'all', status: 'all' });
    console.log(`fetchDirectHierarchy finished in ${Date.now() - startHier}ms`);
    
    console.log("Poles hierarchy detail:");
    let sum = 0;
    hierarchy.poles.forEach((p: any) => {
      console.log(` - ${p.name}: ${p.count}`);
      sum += p.count;
    });
    console.log(`Sum of poles: ${sum}`);
    
    if (sum !== stats.totalDocs) {
      console.error(`!!! ÉCART DÉTECTÉ: Sum (${sum}) vs Stats (${stats.totalDocs})`);
    } else {
      console.log("SUCCESS: Les comptes sont alignés!");
    }
  } catch (e) {
    console.error(e);
  }
}

test();
