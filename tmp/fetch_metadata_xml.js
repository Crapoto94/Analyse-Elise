
async function fetchMetadata() {
  const url = 'https://ville-ivry94.illico.city/AppBI/odata/$metadata';
  const username = 'User_StatBI';
  const password = '2V.}dyRB,8P9h6]8=Fte';
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  try {
    console.log('Fetching $metadata...');
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/xml'
      }
    });

    if (!response.ok) {
       console.error('Failed to fetch metadata:', response.status);
       return;
    }

    const xml = await response.text();
    require('fs').writeFileSync('tmp/metadata.xml', xml);
    console.log('Metadata saved to tmp/metadata.xml');

    if (xml.toLowerCase().includes('muni')) {
       console.log('FOUND "muni" in metadata!');
       // Find context
       const index = xml.toLowerCase().indexOf('muni');
       console.log('Context:', xml.slice(index - 100, index + 100));
    }
    
    if (xml.toLowerCase().includes('quartier')) {
       console.log('FOUND "quartier" in metadata!');
       const index = xml.toLowerCase().indexOf('quartier');
       console.log('Context:', xml.slice(index - 100, index + 100));
    }

  } catch (err) {
    console.error(err);
  }
}

fetchMetadata();
