import { prismaSystem } from './prisma';
import { ODataClient } from './odata';

export async function getODataConfig() {
  const config = await prismaSystem.appConfig.findUnique({
    where: { key: 'odata_config' }
  });
  return config ? JSON.parse(config.value) : null;
}

export async function fetchDirectStats(year: number, month?: string) {
  const config = await getODataConfig();
  if (!config) throw new Error('OData config missing');

  const client = new ODataClient(config);

  let filter = `CreatedDate ge ${year}-01-01T00:00:00Z and CreatedDate lt ${year + 1}-01-01T00:00:00Z`;
  if (month && month !== 'all') {
    const m = parseInt(month);
    const start = `${year}-${m.toString().padStart(2, '0')}-01T00:00:00Z`;
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? year + 1 : year;
    const end = `${nextY}-${nextM.toString().padStart(2, '0')}-01T00:00:00Z`;
    filter = `CreatedDate ge ${start} and CreatedDate lt ${end}`;
  }

  try {
    const query = `FactDocument?$filter=${encodeURIComponent(filter)}&$select=Id,DocumentIdentifier,CreatedDate,MediumId,TypeId,StateId`;
    const data = await client.request<any>(query);
    const docs = data.value || [];

    // Aggregation
    const stats = {
      totalDocs: docs.length,
      totalTasks: docs.length,
      monthlyEvolution: Array(12).fill(0).map((_, i) => ({ name: '', value: 0, month: i + 1 }))
    };

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  stats.monthlyEvolution.forEach((m, i) => m.name = monthNames[i]);

  docs.forEach((doc: any) => {
    const date = new Date(doc.CreatedDate);
    const m = date.getMonth();
    if (m >= 0 && m < 12) stats.monthlyEvolution[m].value++;
  });

    return stats;
  } catch (err: any) {
    console.error(`[OData-Direct] Error in fetchDirectStats:`, err.message);
    throw err;
  }
}

export async function fetchCabinetStats(year: number, month?: string) {
  const config = await getODataConfig();
  if (!config) throw new Error('OData config missing');

  const client = new ODataClient(config);

  let filter = `CreatedDate ge ${year}-01-01T00:00:00Z and CreatedDate lt ${year + 1}-01-01T00:00:00Z`;
  if (month && month !== 'all') {
    const m = parseInt(month);
    const start = `${year}-${m.toString().padStart(2, '0')}-01T00:00:00Z`;
    filter = `CreatedDate ge ${start} and CreatedDate lt ${year}-12-31T23:59:59Z`; 
  }

  try {
    const query = `FactDocument?$filter=${encodeURIComponent(filter)}&$top=5000&$select=Id,DocumentIdentifier,CreatedDate,StateId,MediumId`;
    const data = await client.request<any>(query);
    const docs = data.value || [];

    const stats = {
      total: docs.length,
      byMonth: Array(12).fill(0),
      muniCount: 0,
      courantCount: docs.length,
      sharedCount: 0,
      bySupport: {} as Record<string, number>,
      noResponseCount: 0,
      deadlines: { within30: 0, within60: 0, exceeded: 0 }
    };

    docs.forEach((doc: any) => {
      const date = new Date(doc.CreatedDate);
      const m = date.getMonth();
      if (m >= 0 && m < 12) stats.byMonth[m]++;
      
      const stateId = doc.StateId || -1;
      if (stateId !== 45 && stateId !== 46) stats.noResponseCount++;
    });

    return {
      year,
      lastSyncDate: 'DIREC ODATA (LIVE)',
      entrants: stats,
      bySupportEvolution: [],
      assignments: [],
      averageDelay: 0
    };
  } catch (err: any) {
    console.error(`[OData-Direct] Error in fetchCabinetStats:`, err.message);
    throw err;
  }
}
