import { PrismaClient as SystemClient } from '../../node_modules/@prisma/client/system'
import { PrismaClient as EntitiesClient } from '../../node_modules/@prisma/client/entities'

const prismaSystem = new SystemClient()
const prismaEntities = new EntitiesClient()

export { prismaSystem, prismaEntities }
export default prismaSystem // Default to system for convenience in some parts
