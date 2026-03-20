const fs = require('fs');
const xml = fs.readFileSync('c:/dev/Stat_Elise_New/metadata_v2.xml', 'utf8');

function extractEntity(name) {
  const regex = new RegExp(`<EntityType Name="${name}">([\\s\\S]*?)<\/EntityType>`, 'i');
  const match = xml.match(regex);
  if (!match) return null;
  const content = match[1];
  const props = [...content.matchAll(/<Property Name="(.*?)" Type="(.*?)"/g)].map(m => ({ name: m[1], type: m[2] }));
  const navs = [...content.matchAll(/<NavigationProperty Name="(.*?)" Type="(.*?)"/g)].map(m => ({ name: m[1], type: m[2] }));
  return { name, props, navs };
}

const entities = ['FactDocument', 'FactTask', 'DimDocumentMedium', 'DimDocumentType', 'DimDocumentState', 'DimDocumentClosureReason', 'DimStructureElementPath', 'DimCustomLink'];
const audit = {};
entities.forEach(e => {
  audit[e] = extractEntity(e);
});

fs.writeFileSync('tmp/meta_audit.json', JSON.stringify(audit, null, 2));
console.log('Metadata audit saved to tmp/meta_audit.json');

// Also list all EntitySet names from the Container
const containerMatch = xml.match(/<EntityContainer Name="Container">([\s\S]*?)<\/EntityContainer>/);
if (containerMatch) {
  const sets = [...containerMatch[1].matchAll(/<EntitySet Name="(.*?)"/g)].map(m => m[1]);
  console.log('Available EntitySets:', sets.join(', '));
}
