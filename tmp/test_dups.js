const { ODataClient } = require('./src/lib/odata');
require('dotenv').config();

async function testDuplicates() {
  const config = {
    baseUrl: process.env.ODATA_BASE_URL,
    username: process.env.ODATA_USERNAME,
    password: process.env.ODATA_PASSWORD
  };
  const client = new ODataClient(config);

  const paths = await client.requestAll("DimStructureElementPath?$select=Id,Level2,Level3,StructureElementTypeKey");
  console.log('Total paths loaded:', paths.length);
  
  const idCounts = {};
  let totalDups = 0;
  paths.forEach(p => {
      idCounts[p.Id] = (idCounts[p.Id] || 0) + 1;
  });
  
  const dupIds = Object.keys(idCounts).filter(id => idCounts[id] > 1);
  console.log(`Unique Ids: ${Object.keys(idCounts).length}. Ids with multiple paths: ${dupIds.length}`);

  if (dupIds.length > 0) {
      console.log(`Example Id ${dupIds[0]} appears ${idCounts[dupIds[0]]} times. Paths:`);
      const dups = paths.filter(p => p.Id == dupIds[0]);
      console.log(dups.slice(0, 3));
  }
}

testDuplicates();
