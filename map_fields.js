const http = require('http');

async function mapCustomFields() {
  const credentials = Buffer.from('User_StatBI:2V.}dyRB,8P9h6]8=Fte').toString('base64');
  const targetUrl = encodeURIComponent('http://172.16.12.98:8080/AppBI/odata/ParamCustomDim');
  const path = `/api/proxy?url=${targetUrl}`;
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: path,
    method: 'GET',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('--- Custom Fields ---');
        console.log(JSON.stringify(Array.isArray(json) ? json : json.value, null, 2));
      } catch (e) {
        console.log('Error parsing Custom Fields JSON:', e.message);
      }
    });
  });
  req.on('error', (e) => { console.error(`Error: ${e.message}`); });
  req.end();
}

async function mapStates() {
  const credentials = Buffer.from('User_StatBI:2V.}dyRB,8P9h6]8=Fte').toString('base64');
  const targetUrl = encodeURIComponent('http://172.16.12.98:8080/AppBI/odata/DimDocumentState');
  const path = `/api/proxy?url=${targetUrl}`;
  
  const options = {
    hostname: 'localhost', port: 3001, path: path, method: 'GET',
    headers: { 'Authorization': `Basic ${credentials}`, 'Accept': 'application/json' }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('--- Document States ---');
        console.log(JSON.stringify(Array.isArray(json) ? json : json.value, null, 2));
      } catch (e) {
        console.log('Error parsing States JSON:', e.message);
      }
    });
  });
  req.on('error', (e) => { console.error(`Error: ${e.message}`); });
  req.end();
}

mapCustomFields();
setTimeout(mapStates, 2000); // Sequence them to avoid proxy noise
