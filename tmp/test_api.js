// Test de la route API Next.js directement
const http = require('http');

http.get('http://localhost:5002/api/hierarchy?year=2024', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    if (res.statusCode === 307) {
        console.log('Redirecting to login... Test using direct OData calls instead.');
    } else {
        console.log('RESPONSE:', data.substring(0, 500));
    }
  });
}).on('error', err => console.error('HTTP ERR:', err));
