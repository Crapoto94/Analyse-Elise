import { NextResponse } from 'next/server';
import { prismaSystem, prismaEntities } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_SYSTEM: process.env.DATABASE_URL_SYSTEM?.replace(/:[^:@]+@/, ':***@'),
      DATABASE_URL_ENTITIES: process.env.DATABASE_URL_ENTITIES?.replace(/:[^:@]+@/, ':***@'),
    },
    files: {},
    connections: {}
  };

  // Check files
  const dbFiles = [
    { name: 'system.db', env: process.env.DATABASE_URL_SYSTEM },
    { name: 'entities.db', env: process.env.DATABASE_URL_ENTITIES }
  ];

  for (const db of dbFiles) {
    if (db.env?.startsWith('file:')) {
      const filePath = db.env.replace('file:', '');
      const dirPath = path.dirname(filePath);
      
      try {
        if (fs.existsSync(dirPath)) {
          diagnostics.files[`dir_${path.basename(dirPath)}`] = fs.readdirSync(dirPath);
        }
      } catch (e) {}

      try {
        const stats = fs.statSync(filePath);
        diagnostics.files[db.name] = {
          exists: true,
          size: stats.size,
          mode: stats.mode,
          uid: stats.uid,
          gid: stats.gid,
          path: filePath
        };
      } catch (e: any) {
        diagnostics.files[db.name] = { exists: false, error: e.message, path: filePath };
      }
    }
  }

  // Check Prisma connections
  try {
    await prismaSystem.$queryRaw`SELECT 1`;
    diagnostics.connections.system = 'OK';
  } catch (e: any) {
    diagnostics.connections.system = { error: e.message, code: e.code };
  }

  try {
    await prismaEntities.$queryRaw`SELECT 1`;
    diagnostics.connections.entities = 'OK';
  } catch (e: any) {
    diagnostics.connections.entities = { error: e.message, code: e.code };
  }

  return NextResponse.json(diagnostics);
}
