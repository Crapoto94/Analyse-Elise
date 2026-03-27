const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const configs = await prisma.appConfig.findMany();
    console.log('AppConfig:', JSON.stringify(configs, null, 2));
    
    const odata = await prisma.appConfig.findUnique({ where: { key: 'odata_config' } });
    console.log('OData Config found:', !!odata);

    console.log('Attempting to create a test record...');
    const test = await prisma.appConfig.upsert({
      where: { key: 'test_key' },
      update: { value: 'test_value_' + Date.now() },
      create: { key: 'test_key', value: 'test_value' }
    });
    console.log('Test record created/updated:', test);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
