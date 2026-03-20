const fs = require('fs');

function extractEntity(meta, name) {
    const startTag = `<EntityType Name="${name}"`;
    const start = meta.indexOf(startTag);
    if (start === -1) return `Entity ${name} not found`;
    const end = meta.indexOf('</EntityType>', start) + 13;
    return meta.slice(start, end).replace(/></g, '>\n<');
}

try {
    const meta = fs.readFileSync('metadata_dump.xml', 'utf8');
    console.log('--- FactDocument ---');
    console.log(extractEntity(meta, 'FactDocument'));
    console.log('\n--- FactTask ---');
    console.log(extractEntity(meta, 'FactTask'));
    console.log('\n--- DimStructureElementPath ---');
    console.log(extractEntity(meta, 'DimStructureElementPath'));
} catch (e) {
    console.error(e);
}
