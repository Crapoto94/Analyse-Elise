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
  const startDate = `2026-01-01T00:00:00Z`;
  const endDate = `2027-01-01T00:00:00Z`;
  const filter = `CreatedDate ge ${startDate} and CreatedDate lt ${endDate}`;
  
  const docs = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/FactDocument?$filter=${encodeURIComponent(filter)}&$select=DirectionId`);
  console.log('Docs Count:', docs.value.length);
  
  let totalValidDocs = 0;
  const countsByElementId = {};
  docs.value.forEach(d => {
      const id = d.DirectionId;
      if (id) {
          countsByElementId[id] = (countsByElementId[id] || 0) + 1;
          totalValidDocs++;
      }
  });
  console.log('Total Docs mapped to a DirectionId:', totalValidDocs);

  const paths = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$select=Id,Level2`);
  console.log('Paths count:', paths.value.length);
  
  let poleCount = 0;
  const dgsPaths = paths.value.filter(p => p.Level2 && p.Level2.includes('DGS'));
  console.log('DGS Paths count:', dgsPaths.length);
  
  let dgsCouriers = 0;
  dgsPaths.forEach(p => {
      const c = countsByElementId[p.Id] || 0;
      dgsCouriers += c;
  });
  console.log('Courriers for DGS according to logic:', dgsCouriers);
}
run();
