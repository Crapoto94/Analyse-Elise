async function verify() {
  const year = 2026;
  const baseUrl = 'http://localhost:5002/api';
  
  // 1. DSI Direction
  const dir = "DIRECTION DES SYSTEMES D'INFORMATION";
  
  console.log(`Testing Direction: ${dir}`);
  
  // 2. Fetch hierarchy for DSI
  const hRes = await fetch(`${baseUrl}/hierarchy?year=${year}&dir=${encodeURIComponent(dir)}`);
  const hierarchy = await hRes.json();
  const directService = hierarchy.services.find(s => s.name === '(Affectations directes)');
  console.log(`Hierarchy count for (Affectations directes): ${directService?.count}`);

  // 3. Fetch KPI for DSI + Direct
  const kRes = await fetch(`${baseUrl}/stats?year=${year}&dir=${encodeURIComponent(dir)}&service=${encodeURIComponent('(Affectations directes)')}`);
  const stats = await kRes.json();
  console.log(`KPI count for (Affectations directes): ${stats.totalDocs}`);

  if (directService?.count === stats.totalDocs) {
    console.log('SUCCESS: Counts match!');
  } else {
    console.log('FAILURE: Counts still differ!');
  }
}
verify();
