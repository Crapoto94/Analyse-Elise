import { PrismaClient as SystemClient } from '../../node_modules/@prisma/client/system'
import { PrismaClient as EntitiesClient } from '../../node_modules/@prisma/client/entities'

const prismaSystem = new SystemClient({
  datasources: { db: { url: process.env.DATABASE_URL_SYSTEM } }
})
const prismaEntities = new EntitiesClient({
  datasources: { db: { url: process.env.DATABASE_URL_ENTITIES } }
})

export { prismaSystem, prismaEntities }
export default prismaSystem // Default to system for convenience in some parts
