const { getODataClient } = require('./lib/odata-node');
const fs = require('fs');

async function main() {
    const client = getODataClient();
    const meta = await client.request('$metadata');
    fs.writeFileSync('metadata_dump.xml', meta);
    
    const factDocStart = meta.indexOf('<EntityType Name="FactDocument"');
    const factDocEnd = meta.indexOf('</EntityType>', factDocStart) + 13;
    console.log('FactDocument Entity:');
    console.log(meta.slice(factDocStart, factDocEnd));

    const structPathStart = meta.indexOf('<EntityType Name="DimStructureElementPath"');
    const structPathEnd = meta.indexOf('</EntityType>', structPathStart) + 13;
    console.log('\nDimStructureElementPath Entity:');
    console.log(meta.slice(structPathStart, structPathEnd));
}

main().catch(console.error);
