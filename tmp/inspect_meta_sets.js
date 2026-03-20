const fs = require('fs');
const xml = fs.readFileSync('c:/dev/Stat_Elise_New/metadata_v2.xml', 'utf8');
const containerMatch = xml.match(/<EntityContainer Name="Container">([\s\S]*?)<\/EntityContainer>/);
if (containerMatch) {
  const sets = [...containerMatch[1].matchAll(/<EntitySet Name="(.*?)"/g)].map(m => m[1]);
  console.log('--- ALL ENTITY SETS ---');
  console.log(sets.sort().join(', '));
} else {
  console.log('EntityContainer not found');
}
