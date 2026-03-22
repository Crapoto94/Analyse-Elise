const { fetchDirectStats, fetchDirectHierarchy } = require('./src/lib/odata-direct');
require('dotenv').config();

// Mocker prismaSystem pour éviter les erreurs de type dans odata-direct.ts
jest = require('jest-mock');
const mockPrismaSystem = {
  AppConfig: {
    findUnique: async () => null
  }
};
require.cache[require.resolve('./src/lib/prisma')] = {
  exports: { prismaSystem: mockPrismaSystem }
};

async function runValidation() {
  console.log('--- STARTING VALIDATION 2024 (25k+ docs) ---');
  try {
    console.log('1. Fetching Hierarchy...');
    const startH = Date.now();
    const hierarchy = await fetchDirectHierarchy(2024);
    const timeH = Date.now() - startH;
    console.log(`Hierarchy fetched in ${timeH}ms`);
    console.log(`- Poles Count: ${hierarchy.poles.length}`);

    console.log('\n2. Fetching Stats...');
    const startS = Date.now();
    const stats = await fetchDirectStats(2024, 'all', { status: 'all', pole: 'all', dga: 'all', dir: 'all', service: 'all' });
    const timeS = Date.now() - startS;
    console.log(`Stats fetched in ${timeS}ms`);
    console.log(`- Total Documents: ${stats.totalDocs}`);
    console.log(`- Total Tasks: ${stats.totalTasks}`);
    
  } catch (err) {
    console.error('Validation failed with error:', err.message);
  }
}

runValidation();
