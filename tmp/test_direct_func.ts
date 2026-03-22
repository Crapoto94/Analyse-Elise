import { fetchDirectHierarchy } from './src/lib/odata-direct';

async function test() {
  console.log('--- Direct Function Test (2026) ---');
  try {
    const data = await fetchDirectHierarchy(2026);
    const poles = data.levels?.find((l: any) => l.level === 2);
    if (poles) {
      console.log('Poles distribution:');
      let sum = 0;
      poles.items.forEach((i: any) => {
        console.log(`  ${i.name}: ${i.count}`);
        sum += i.count;
      });
      console.log('Total distributed:', sum);
    } else {
      console.log('No poles found in hierarchy.');
    }
  } catch (e) {
    console.error('Error during test:', e);
  }
}

test();
