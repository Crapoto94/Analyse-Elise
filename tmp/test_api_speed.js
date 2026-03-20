const http = require('http');

const start = Date.now();
http.get('http://localhost:5002/api/stats/cabinet-v2?year=2026', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const duration = Date.now() - start;
    console.log(`API Status: ${res.statusCode}`);
    console.log(`Duration: ${duration}ms`);
    try {
      const json = JSON.parse(data);
      console.log('Total:', json.entrants.total);
      console.log('Muni:', json.entrants.muniCount);
      console.log('Courant:', json.entrants.courantCount);
      console.log('Assignments (Top 3):', json.assignments.slice(0, 3));
    } catch (e) {
      console.error('Failed to parse JSON:', data.substring(0, 100));
    }
  });
}).on('error', (err) => {
  console.error('Request failed:', err.message);
});
