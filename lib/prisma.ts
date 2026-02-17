import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { 
  prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  return new PrismaClient({ 
    log: process.env.NODE_ENV === "development" 
      ? ["error", "warn"] 
      : ["error"],
    // Configuración para manejar mejor las conexiones
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

// Manejar cierre graceful de la conexión
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

// Re-exportar funciones de auditoría
export {
  setAuditContext,
  clearAuditContext,
  getCurrentAuditContext,
  auditCreate,
  auditUpdate,
  auditDelete,
  auditLoginAttempt,
  auditLogout,
  getAuditLogs,
  getAuditStats
} from "./audit-helpers"
