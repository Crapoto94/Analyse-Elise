const http = require('http');

async function probeMetadata() {
  const credentials = Buffer.from('User_StatBI:2V.}dyRB,8P9h6]8=Fte').toString('base64');
  // Use the local proxy to avoid ETIMEDOUT on internal IP
  const targetUrl = encodeURIComponent('http://172.16.12.98:8080/AppBI/odata/FactDocument?$top=1&$expand=Direction,Type,State,Medium');
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

  console.log(`Querying: http://localhost:3001${path}`);

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('--- FactDocument Probing ---');
        const doc = Array.isArray(json) ? json[0] : (json.value ? json.value[0] : json);
        console.log(JSON.stringify(doc, null, 2));
        
        const keys = Object.keys(doc);
        console.log('\n--- Field Analysis ---');
        const interests = ['IsArchived', 'IsDeleted', 'IsClosed', 'ClosureReason', 'Deadline', 'DueDate', 'ResponseDate', 'ProcessedDate', 'Quartier', 'Secteur'];
        interests.forEach(k => {
          console.log(`${k} exists?`, keys.some(key => key.toLowerCase().includes(k.toLowerCase())) ? 'YES' : 'No');
        });
      } catch (e) {
        console.log('Error parsing JSON:', e.message);
        console.log('Raw:', data.slice(0, 500));
      }
    });
  });

  req.on('error', (e) => { console.error(`Error: ${e.message}`); });
  req.end();
}

probeMetadata();
