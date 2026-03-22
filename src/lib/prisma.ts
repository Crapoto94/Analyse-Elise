import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prismaSystem: PrismaClient };

export const prismaSystem = globalForPrisma.prismaSystem || new PrismaClient({
  log: ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaSystem = prismaSystem;
