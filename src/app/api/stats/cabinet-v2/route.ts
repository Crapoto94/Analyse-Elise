import { NextResponse } from 'next/server';
import { prismaEntities, prismaSystem } from '@/lib/prisma';

/**
 * Cabinet Analytics V2 (Corrected Version)
 * - ALL data for the year
 * - Muni = Documents assigned to Cabinet or Elected officials (Path starting with 1|134)
 * - Courant = Documents assigned to Administration (DGS) (Path starting with 1|269)
 */
import { fetchCabinetStats } from '@/lib/odata-direct';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const yearVal = parseInt(searchParams.get('year') || '0');
  const type = searchParams.get('type') || 'all';
  const monthVal = searchParams.get('month') || 'all';
  const statusVal = searchParams.get('status') || 'all';
  const pole = searchParams.get('pole');
  const dga = searchParams.get('dga');
  const dir = searchParams.get('dir');
  const service = searchParams.get('service');
  const source = searchParams.get('source');
  
  if (source === 'odata') {
    try {
      const stats = await fetchCabinetStats(yearVal || new Date().getFullYear(), monthVal);
      return NextResponse.json({ ...stats, type });
    } catch (err: any) {
      return NextResponse.json({ error: 'OData Direct Error: ' + err.message }, { status: 500 });
    }
  }

  try {
    const isPostgres = process.env.DATABASE_URL_ENTITIES?.startsWith('postgresql');
    
    const yearSql = isPostgres 
      ? `EXTRACT(YEAR FROM CreatedDate::TIMESTAMP)::TEXT`
      : `strftime('%Y', CreatedDate)`;

    const yearsRaw = await prismaEntities.$queryRawUnsafe(`
      SELECT DISTINCT ${yearSql} as yr FROM sync_FactDocument WHERE CreatedDate IS NOT NULL AND CreatedDate NOT LIKE '2019%'
    `) as any[];
    const availableYears = yearsRaw.map(y => parseInt(y.yr)).filter(y => !isNaN(y));

    // Support ALL years if yearVal is 0 or NaN
    let startDate = yearVal > 0 ? `${yearVal}-01-01` : '1900-01-01';
    let endDate = yearVal > 0 ? `${yearVal + 1}-01-01` : '2100-01-01';

    if (monthVal !== 'all' && yearVal > 0) {
      const m = parseInt(monthVal);
      startDate = `${yearVal}-${m.toString().padStart(2, '0')}-01`;
      const nextMonth = m === 12 ? 1 : m + 1;
      const nextYear = m === 12 ? yearVal + 1 : yearVal;
      endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
    }

    const p1 = isPostgres ? '$1' : '?';
    const p2 = isPostgres ? '$2' : '?';

    const dateFilter = `AND CreatedDate >= ${p1} AND CreatedDate < ${p2}`;
    const dateFilterFd = `AND fd."CreatedDate" >= ${p1} AND fd."CreatedDate" < ${p2}`;
    const dateFilterD = `AND d."CreatedDate" >= ${p1} AND d."CreatedDate" < ${p2}`;
    
    let statusFilterD = '';
    let statusFilterFd = '';
    const queryParams: any[] = [startDate, endDate];
    
    if (statusVal !== 'all') {
      const pN = isPostgres ? `$${queryParams.length + 1}` : '?';
      statusFilterD = ` AND d."StateId" = ${pN}`;
      statusFilterFd = ` AND fd."StateId" = ${pN}`;
      queryParams.push(Number(statusVal));
    }

    let hierarchyFilter = '';
    if (pole && pole !== 'all') { 
      const pN = isPostgres ? `$${queryParams.length + 1}` : '?';
      hierarchyFilter += ` AND p."Level2" = ${pN}`; 
      queryParams.push(pole); 
    }
    if (dga && dga !== 'all') { 
      const pN = isPostgres ? `$${queryParams.length + 1}` : '?';
      hierarchyFilter += ` AND p."Level3" = ${pN}`; 
      queryParams.push(dga); 
    }
    if (dir && dir !== 'all') { 
      const pN = isPostgres ? `$${queryParams.length + 1}` : '?';
      hierarchyFilter += ` AND p."Level4" = ${pN}`; 
      queryParams.push(dir); 
    }
    if (service && service !== 'all') { 
      const pN = isPostgres ? `$${queryParams.length + 1}` : '?';
      hierarchyFilter += ` AND p."Level5" = ${pN}`; 
      queryParams.push(service); 
    }

    console.log('Cabinet V2 API: Fetching for year', yearVal || 'ALL');
    
    // 0b. Get last sync date (FROM SYSTEM DB)
    const lastSync = await prismaSystem.$queryRawUnsafe(`
      SELECT endTime FROM SyncLog WHERE status = 'SUCCESS' ORDER BY endTime DESC LIMIT 1
    `) as any[];
    const lastSyncDate = lastSync[0]?.endTime 
      ? new Date(lastSync[0].endTime).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) 
      : 'Indisponible';

    // 0c. Identify Target IDs based on hierarchy (FROM ENTITIES DB)
    const muniEntities = await prismaEntities.$queryRawUnsafe(`
      SELECT Id FROM sync_DimStructureElementPath WHERE Path LIKE '1|134%'
    `) as any[];
    const muniIds = muniEntities.map(e => Number(e.Id));

    const courantEntities = await prismaEntities.$queryRawUnsafe(`
      SELECT Id FROM sync_DimStructureElementPath WHERE Path LIKE '1|269%'
    `) as any[];
    const courantIds = courantEntities.map(e => Number(e.Id));

    // 1. Total Data 
    const allDocsRaw = await prismaEntities.$queryRawUnsafe(`
      SELECT 
        DISTINCT d."Id", d."DocumentIdentifier", d."Reference", d."CreatedDate", d."MediumId", d."TypeId", d."DueDate", d."StateId", d."ClosureReasonId",
        m."Label" as MediumLabel,
        t."Label" as TypeLabel
      FROM sync_FactDocument d
      JOIN sync_FactTask ft_h ON d."Id" = ft_h."DocumentId"
      LEFT JOIN sync_DimStructureElementPath p ON ft_h."AssignedToStructureElementId" = p."Id"
      LEFT JOIN sync_DimDocumentMedium m ON d."MediumId" = m."Id"
      LEFT JOIN sync_DimDocumentType t ON d."TypeId" = t."Id"
      WHERE 1=1 AND ${yearSql} != '2019' ${dateFilterD} ${statusFilterD} ${hierarchyFilter}
    `, ...queryParams);
    const allDocs = allDocsRaw as any[];

    // 2. Classify by Assignment
    const muniDocIdsRaw = await prismaEntities.$queryRawUnsafe(`
      SELECT DISTINCT DocumentId FROM sync_FactTask 
      WHERE AssignedToStructureElementId IN (${muniIds.length ? muniIds.join(',') : '-1'})
    `) as any[];
    const muniDocSet = new Set(muniDocIdsRaw.map(r => r.DocumentId));

    const courantDocIdsRaw = await prismaEntities.$queryRawUnsafe(`
      SELECT DISTINCT DocumentId FROM sync_FactTask 
      WHERE AssignedToStructureElementId IN (${courantIds.length ? courantIds.join(',') : '-1'})
    `) as any[];
    const courantDocSet = new Set(courantDocIdsRaw.map(r => r.DocumentId));

    // 3. Process Metrics
    const stats = {
      total: 0,
      byMonth: Array(12).fill(0),
      bySupport: {} as Record<string, number>,
      byNature: {} as Record<string, number>,
      bySupportEvolution: {} as Record<string, { papier: number, mail: number }>,
      muniCount: 0,
      courantCount: 0,
      sharedCount: 0,
      paperCount: 0,
      mailCount: 0,
      noResponseCount: 0,
      deadlines: {
        within30: 0,
        within60: 0,
        exceeded: 0
      }
    };

    allDocs.forEach(doc => {
      const isMuni = muniDocSet.has(doc.Id);
      const isCourant = courantDocSet.has(doc.Id);
      
      // RULE: Muni Priority for single attribution
      const finalCategory = isMuni ? 'muni' : (isCourant ? 'courant' : 'other');
      
      // Filtering based on selected type
      if (type === 'muni' && finalCategory !== 'muni') return;
      if (type === 'courant' && finalCategory !== 'courant') return;
      // Note: "all" shows everything regardless of category
      
      stats.total++;
      const date = new Date(doc.CreatedDate);
      const month = date.getMonth();
      
      if (monthVal !== 'all' && (month + 1) !== parseInt(monthVal)) return;

      const yr = date.getFullYear();
      const monthKey = yearVal === 0 ? `${yr}-${(month + 1).toString().padStart(2, '0')}` : `${(month + 1).toString().padStart(2, '0')}`;
      
      if (month >= 0 && month < 12) stats.byMonth[month]++;
      
      if (finalCategory === 'muni') stats.muniCount++;
      else if (finalCategory === 'courant') stats.courantCount++;
      if (isMuni && isCourant) stats.sharedCount++; // Keep tracking shared count for info
      
      const stateId = doc.StateId || -1;
      const closureId = doc.ClosureReasonId || -1;
      const isClosed = stateId === 45 || stateId === 46;
      const isNNPDR = closureId === 240;
      
      if (!isClosed && !isNNPDR) {
        stats.noResponseCount++;
      }
      
      const medium = doc.MediumLabel || 'Inconnu';
      stats.bySupport[medium] = (stats.bySupport[medium] || 0) + 1;
      
      // Evolution tracking
      if (!stats.bySupportEvolution[monthKey]) stats.bySupportEvolution[monthKey] = { papier: 0, mail: 0 };
      const isPapier = medium.toLowerCase().includes('papier');
      const isMail = medium.toLowerCase().includes('mail') || medium.toLowerCase().includes('courriel');
      
      if (isPapier) {
        stats.paperCount++;
        stats.bySupportEvolution[monthKey].papier++;
      }
      if (isMail) {
        stats.mailCount++;
        stats.bySupportEvolution[monthKey].mail++;
      }
      
      const nature = doc.TypeLabel || 'Autre';
      stats.byNature[nature] = (stats.byNature[nature] || 0) + 1;
      
      if (doc.CreatedDate) {
        const created = new Date(doc.CreatedDate);
        const now = doc.DueDate ? new Date(doc.DueDate) : new Date();
        const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) stats.deadlines.within30++;
        else if (diffDays <= 60) stats.deadlines.within60++;
        else stats.deadlines.exceeded++;
      }
    });

    // Convert evolution to sorted array
    const evolutionArray = Object.entries(stats.bySupportEvolution)
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // 4. Assignments (Filtered by DGS Pôle)
    const assignments = await prismaEntities.$queryRawUnsafe(`
      SELECT 
        COUNT(DISTINCT ft."DocumentId") as count,
        p."Level3" as dga, p."Level4" as direction, p."Level5" as service
      FROM sync_FactTask ft
      JOIN sync_FactDocument fd ON ft."DocumentId" = fd."Id"
      JOIN sync_DimStructureElementPath p ON ft."AssignedToStructureElementId" = p."Id"
      WHERE p."Path" LIKE '1|269%' AND ${yearSql} != '2019'
      AND p."Level5" IS NOT NULL
      ${dateFilterFd} ${statusFilterFd} ${hierarchyFilter}
      GROUP BY p."Level3", p."Level4", p."Level5"
      ORDER BY dga, direction, count DESC
    `, ...queryParams);

    // 5. Avg Delay
    let delayTypeFilter = '';
    if (type === 'muni') {
       delayTypeFilter = `AND ft.DocumentId IN (SELECT DocumentId FROM sync_FactTask WHERE AssignedToStructureElementId IN (${muniIds.length ? muniIds.join(',') : '-1'}))`;
    } else if (type === 'courant') {
       delayTypeFilter = `AND ft.DocumentId IN (SELECT DocumentId FROM sync_FactTask WHERE AssignedToStructureElementId IN (${courantIds.length ? courantIds.join(',') : '-1'}))`;
    }

    const delaySql = isPostgres
      ? `AVG(EXTRACT(EPOCH FROM (ft."ResponseDate"::TIMESTAMP - fd."CreatedDate"::TIMESTAMP)) / 86400)`
      : `AVG(julianday(ft.ResponseDate) - julianday(fd.CreatedDate))`;

    const delays = await prismaEntities.$queryRawUnsafe(`
      SELECT ${delaySql} as avgDelayDays
      FROM sync_FactTask ft
      JOIN sync_FactDocument fd ON ft."DocumentId" = fd."Id"
      JOIN sync_FactTask ft_h ON fd."Id" = ft_h."DocumentId"
      LEFT JOIN sync_DimStructureElementPath p ON ft_h."AssignedToStructureElementId" = p."Id"
      WHERE ft."ResponseDate" IS NOT NULL AND ${yearSql} != '2019'
      ${dateFilterFd} ${statusFilterFd} ${hierarchyFilter}
      ${delayTypeFilter}
    `, ...queryParams) as any[];

    return NextResponse.json(JSON.parse(JSON.stringify({
      year: yearVal,
      availableYears,
      lastSyncDate,
      type,
      entrants: stats,
      bySupportEvolution: evolutionArray,
      assignments: assignments as any[],
      averageDelay: delays[0]?.avgDelayDays || 0
    }, (k, v) => typeof v === 'bigint' ? Number(v) : v)));

  } catch (error: any) {
    console.error('Cabinet V2 API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
