const http = require('http');

const getHierarchy = () => new Promise(resolve => {
  http.get('http://localhost:5002/api/hierarchy?year=2026', (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => { try { resolve(JSON.parse(raw)); } catch(e) { resolve({error: raw}); }});
  });
});

async function run() {
  console.log('--- Verification APIs Live ---');
  const data = await getHierarchy();
  if (data.error) {
    console.error('API Error:', data.error);
    return;
  }

  console.log('Hierarchy Levels returned:', data.levels?.length);
  const poles = data.levels?.find(l => l.level === 2);
  if (poles) {
    console.log('Poles counts:');
    let sum = 0;
    poles.items.forEach(i => {
      console.log(`  ${i.name}: ${i.count}`);
      sum += i.count;
    });
    console.log('Total across poles:', sum);
  }
}
run();
