const sqlite3 = require('sqlite3').verbose();
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

const db = new sqlite3.Database('./dev.db', (err) => {
  if (err) throw err;
  db.get("SELECT baseUrl, username, password FROM ODataConfig WHERE isDefault = 1", (err, row) => {
    if (err) throw err;
    if (!row) return console.log("No config");
    
    const creds = Buffer.from(row.username + ":" + row.password).toString('base64');
    const tokenUrl = row.baseUrl.replace(/\/$/, '') + '/auth/token';
    
    // Auth request
    const req = https.request(tokenUrl, {
      method: 'POST',
      agent,
      headers: {
        'Authorization': 'Basic ' + creds,
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const token = JSON.parse(data).token || JSON.parse(data).access_token;
        
        // Data request
        const url = new URL(row.baseUrl.replace(/\/$/, '') + '/v1.0/DimTaskProcessingType?$select=Id,LabelFrFr&$top=5000');
        const req2 = https.request(url, {
          method: 'GET',
          agent,
          headers: {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/json'
          }
        }, (res2) => {
          let data2 = '';
          res2.on('data', d => data2 += d);
          res2.on('end', () => {
             const types = JSON.parse(data2).value || [];
             types.forEach(t => {
                if (t.LabelFrFr && (t.LabelFrFr.toLowerCase().includes('charge') || t.LabelFrFr.toLowerCase().includes('affect') || t.LabelFrFr.toLowerCase().includes('trait'))) {
                   console.log(`[ID] ${t.Id} : ${t.LabelFrFr}`);
                }
             });
          });
        });
        req2.end();
      });
    });
    req.end();
  });
});
