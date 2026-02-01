import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { 
  prisma: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ 
    log: process.env.NODE_ENV === "development" 
      ? ["error", "warn"] 
      : ["error"] 
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
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
