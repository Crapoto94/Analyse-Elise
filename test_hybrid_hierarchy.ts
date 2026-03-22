import { fetchDirectHierarchy } from './src/lib/odata-direct';

async function test() {
  console.log('--- Hybrid Hierarchy Test (Direction DU CCAS) ---');
  try {
    // On simule la sélection de la direction du CCAS
    const data: any = await fetchDirectHierarchy(2026, { 
      pole: 'DGS - Direction Générale des Services',
      dga: 'DGA DCOM-DCCAS-DDS-DSANTE',
      dir: 'DIRECTION DU CCAS'
    });

    console.log('\nPoles count:', data.poles?.length);
    console.log('DGAs count:', data.dgas?.length);
    console.log('Directions count:', data.directions?.length);
    console.log('Services (Hybrid) count:', data.services?.length);
    
    if (data.services) {
      console.log('\nItems in Services/Agents:');
      data.services.forEach((i: any) => {
        console.log(`  - ${i.name}: ${i.count}`);
      });
    }

  } catch (e) {
    console.error('Error during test:', e);
  }
}

test();
