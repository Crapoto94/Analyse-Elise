const https = require('https');

const username = 'User_StatBI';
const password = '2V.}dyRB,8P9h6]8=Fte';
const odataUrl = 'https://ville-ivry94.illico.city/AppBI/odata/$metadata';

const auth = Buffer.from(`${username}:${password}`).toString('base64');

const options = {
  headers: {
    'Authorization': `Basic ${auth}`,
  }
};

https.get(odataUrl, options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    require('fs').writeFileSync('metadata_v2.xml', data);
    console.log('Metadata saved to metadata_v2.xml');
  });
}).on('error', (err) => {
  console.error('Error fetching metadata:', err.message);
});
