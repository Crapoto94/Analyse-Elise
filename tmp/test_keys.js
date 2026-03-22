const https = require('https');
const auth = Buffer.from('User_StatBI:2V.}dyRB,8P9h6]8=Fte').toString('base64');
const getOData = (url) => new Promise(resolve => {
  https.get(url, { headers: { 'Authorization': `Basic ${auth}` } }, (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => resolve(JSON.parse(raw)));
  });
});

async function run() {
  const doc = await getOData('https://ville-ivry94.illico.city/AppBI/odata/FactDocument?$top=1&$select=Id,CreatedByStructureElementId');
  console.log('FactDoc CreatedByStructureElementId:', doc.value[0].CreatedByStructureElementId);

  const paths = await getOData('https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$top=3&$select=Id,Key,Level2');
  console.log('Path 1 Id:', paths.value[0].Id, 'Key:', paths.value[0].Key, 'Level2:', paths.value[0].Level2);
  console.log('Path 2 Id:', paths.value[1].Id, 'Key:', paths.value[1].Key, 'Level2:', paths.value[1].Level2);
}
run();
