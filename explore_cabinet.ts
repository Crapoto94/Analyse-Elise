import { ODataClient } from './src/lib/odata';
import { getODataConfig } from './src/lib/odata-direct';
import dotenv from 'dotenv';
dotenv.config();

async function exploreCabinetLogic() {
  const config = await getODataConfig();
  const client = new ODataClient(config);
  
  console.log('--- EXPLORATION LOGIQUE CABINET ---');
  
  // 1. Check Document Types
  const types = await client.requestAll<any>("DimDocumentType?$select=Id,LabelFrFr");
  console.log('Types de documents (échantillon):');
  types.slice(0, 20).forEach((t: any) => console.log(`- [${t.Id}] ${t.LabelFrFr}`));

  // 2. Check Structure for Cabinet/DGS keywords
  const paths = await client.requestAll<any>("DimStructureElementPath?$filter=contains(Level2, 'Maire') or contains(Level2, 'Cabinet') or contains(Level3, 'DGS') or contains(Level4, 'DSI')&$select=Id,Level2,Level3,Level4,Level5");
  console.log('\nStructure Cabinet/DGS/Maire (échantillon):');
  paths.slice(0, 20).forEach((p: any) => {
    console.log(`- [${p.Id}] ${p.Level2} > ${p.Level3} > ${p.Level4} > ${p.Level5}`);
  });

  // 3. Check sample docs from 2024 to see common fields
  const sampleDocs = await client.requestAll<any>("FactDocument?$top=50&$filter=CreatedDate ge 2024-01-01T00:00:00Z&$select=Id,TypeId,DirectionId");
  console.log('\nÉchantillon FactDocument (TypeId, DirectionId):');
  sampleDocs.forEach((d: any) => console.log(`- Doc ${d.Id}: Type=${d.TypeId}, DirectionId=${d.DirectionId}`));
}

exploreCabinetLogic().catch(console.error);
