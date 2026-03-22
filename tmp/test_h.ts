import { fetchDirectHierarchy } from './src/lib/odata-direct';

async function run() {
  console.log('--- TEST HIERARCHY 2024 ---');
  try {
    const res = await fetchDirectHierarchy(2024);
    console.log('SUCCESS! Poles:', res.poles.length, 'Statuses:', res.statuses.length);
  } catch (err: any) {
    console.error('ERROR CATCHED:', err.message);
    if (err.stack) console.error(err.stack);
  }
}

run();
