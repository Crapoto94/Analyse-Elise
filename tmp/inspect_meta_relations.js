const fs = require('fs');
const xml = fs.readFileSync('c:/dev/Stat_Elise_New/metadata_v2.xml', 'utf8');

const entityTypes = xml.match(/<EntityType Name="(.*?)">/g).map(e => e.match(/Name="(.*?)"/)[1]);
console.log('--- ALL ENTITIES ---');
console.log(entityTypes.join(', '));

const relations = entityTypes.filter(e => e.includes('Relation') || e.includes('Link'));
console.log('\n--- POTENTIAL RELATION ENTITIES ---');
console.log(relations.join(', '));

const factDoc = xml.match(/<EntityType Name="FactDocument">([\s\S]*?)<\/EntityType>/)[1];
const parentLike = factDoc.match(/Name=".*?(Parent|Response|Origin|Source|Linked).*?"/gi);
console.log('\n--- PARENT/LINK FIELDS IN FactDocument ---');
console.log(parentLike ? parentLike.join(', ') : 'None found');
