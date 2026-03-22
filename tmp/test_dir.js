const https = require('https');
const auth = Buffer.from('User_StatBI:2V.}dyRB,8P9h6]8=Fte').toString('base64');
https.get('https://ville-ivry94.illico.city/AppBI/odata/FactDocument?$top=5&$select=Id,CreatedByStructureElementId,DistributedByStructureElementId,DirectionId', { headers: { 'Authorization': `Basic ${auth}` } }, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => console.log(JSON.stringify(JSON.parse(raw).value, null, 2)));
});
