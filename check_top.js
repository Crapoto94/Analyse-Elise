const { getODataClient } = require('./lib/odata-node');

async function main() {
    const client = getODataClient();
    console.log('Fetching top documents for 2025...');
    // We fetch a thousand documents to see who created them
    const docs = await client.request('FactDocument?$select=CreatedByStructureElementId&$filter=CreatedDateNavigation/TheYear eq 2025&$top=1000');
    const counts = {};
    docs.value.forEach(d => {
        const id = d.CreatedByStructureElementId;
        counts[id] = (counts[id] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    console.log('Top IDs (ID: Count):', sorted.slice(0, 10));

    console.log('Fetching hierarchy pages...');
    let allPaths = [];
    let url = 'DimStructureElementPath';
    while (url && allPaths.length < 30000) {
        const res = await client.request(url);
        allPaths.push(...res.value);
        url = res['@odata.nextLink'];
    }

    console.log('Mapping results:');
    sorted.slice(0, 20).forEach(([id, count]) => {
        const p = allPaths.find(x => x.Id == id);
        if (p) {
            console.log(`ID ${id} (${count} docs) => ${p.Level2} / ${p.Level3} / ${p.Level4} / ${p.Level5} ($type: ${p.StructureElementTypeKey})`);
        } else {
            console.log(`ID ${id} (${count} docs) => NOT FOUND IN PATH`);
        }
    });

    const cabinet = allPaths.filter(p => p.Level2 === 'CABINET DU MAIRE - ADJOINTS');
    const cabinetIds = cabinet.map(c => c.Id);
    console.log('Total entries under CABINET Pôle:', cabinet.length);
    const cabinetDocs = sorted.filter(([id]) => cabinetIds.includes(Number(id)));
    console.log('Found documents in top 1000 for these IDs under Cabinet:', cabinetDocs);
}

main().catch(console.error);
