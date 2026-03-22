import { ODataClient } from './src/lib/odata';
import { getODataConfig } from './src/lib/odata-direct';
import dotenv from 'dotenv';
dotenv.config();

async function checkDirectionPrecision() {
  const config = await getODataConfig();
  const client = new ODataClient(config);
  
  // 1. On récupère la structure
  const paths = await client.requestAll<any>("DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5,StructureElementTypeKey");
  const pathMap: Record<number, any> = {};
  paths.forEach((p: any) => pathMap[p.Id] = p);

  // 2. On regarde les 500 derniers docs
  const docs = await client.requestAll<any>("FactDocument?$top=500&$select=Id,DirectionId");
  
  const typesFound = new Set();
  let hasServices = false;
  let hasUsers = false;

  docs.forEach((d: any) => {
    const path = pathMap[d.DirectionId];
    if (path) {
      typesFound.add(path.StructureElementTypeKey);
      if (path.Level5) hasServices = true;
      if (path.StructureElementTypeKey === 'USER') hasUsers = true;
    }
  });

  console.log('Types de structures trouvés dans FactDocument.DirectionId:', Array.from(typesFound));
  console.log('Contient des services (Level5) ?', hasServices);
  console.log('Contient des agents (USER) ?', hasUsers);
}

checkDirectionPrecision().catch(console.error);
