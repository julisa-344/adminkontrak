/**
 * Sistema de Auditoría Simplificado para AutoRent Admin
 * Funciones helper para registrar cambios manualmente
 */

import { PrismaClient, AuditAction } from '@prisma/client'
import { prisma } from './prisma'

export interface AuditContext {
  userId?: number
  userEmail?: string
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  comment?: string
}

// Variable global para el contexto de auditoría
let currentAuditContext: AuditContext = {}

export function setAuditContext(context: AuditContext) {
  currentAuditContext = { ...context }
}

export function clearAuditContext() {
  currentAuditContext = {}
}

export function getCurrentAuditContext(): AuditContext {
  return { ...currentAuditContext }
}

// Campos que no queremos registrar en los logs (por seguridad/privacidad)
const EXCLUDED_FIELDS = [
  'password',
  'updated_at'
]

function cleanDataForAudit(data: any): any {
  if (!data || typeof data !== 'object') return data
  
  const cleaned = { ...data }
  EXCLUDED_FIELDS.forEach(field => {
    if (field in cleaned) {
      cleaned[field] = '[PROTECTED]'
    }
  })
  
  // Convertir fechas a strings para JSON
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] instanceof Date) {
      cleaned[key] = cleaned[key].toISOString()
    }
  })
  
  return cleaned
}

/**
 * Registra una acción de CREATE en el log de auditoría
 */
export async function auditCreate(
  tableName: string,
  recordId: string | number,
  newData: any,
  comment?: string
) {
  try {
    const context = getCurrentAuditContext()
    
    await prisma.audit_log.create({
      data: {
        tabla: tableName,
        registro_id: String(recordId),
        operacion: AuditAction.CREATE,
        datos_nuevos: cleanDataForAudit(newData),
        usuario_id: context.userId,
        usuario_email: context.userEmail,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        sesion_id: context.sessionId,
        comentario: comment || context.comment
      }
    })
  } catch (error) {
    console.error('Error al registrar auditoría CREATE:', error)
  }
}

/**
 * Registra una acción de UPDATE en el log de auditoría
 */
export async function auditUpdate(
  tableName: string,
  recordId: string | number,
  oldData: any,
  newData: any,
  comment?: string
) {
  try {
    const context = getCurrentAuditContext()
    
    await prisma.audit_log.create({
      data: {
        tabla: tableName,
        registro_id: String(recordId),
        operacion: AuditAction.UPDATE,
        datos_anteriores: cleanDataForAudit(oldData),
        datos_nuevos: cleanDataForAudit(newData),
        usuario_id: context.userId,
        usuario_email: context.userEmail,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        sesion_id: context.sessionId,
        comentario: comment || context.comment
      }
    })
  } catch (error) {
    console.error('Error al registrar auditoría UPDATE:', error)
  }
}

/**
 * Registra una acción de DELETE en el log de auditoría
 */
export async function auditDelete(
  tableName: string,
  recordId: string | number,
  oldData: any,
  comment?: string
) {
  try {
    const context = getCurrentAuditContext()
    
    await prisma.audit_log.create({
      data: {
        tabla: tableName,
        registro_id: String(recordId),
        operacion: AuditAction.DELETE,
        datos_anteriores: cleanDataForAudit(oldData),
        usuario_id: context.userId,
        usuario_email: context.userEmail,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        sesion_id: context.sessionId,
        comentario: comment || context.comment
      }
    })
  } catch (error) {
    console.error('Error al registrar auditoría DELETE:', error)
  }
}

/**
 * Registra un intento de login (exitoso o fallido)
 */
export async function auditLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await prisma.audit_log.create({
      data: {
        tabla: 'usuario',
        registro_id: email,
        operacion: success ? AuditAction.LOGIN : AuditAction.FAILED_LOGIN,
        datos_nuevos: { email, success, timestamp: new Date().toISOString() },
        usuario_email: email,
        ip_address: ipAddress,
        user_agent: userAgent,
        comentario: success ? 'Login exitoso' : 'Intento de login fallido'
      }
    })
  } catch (error) {
    console.error('Error al auditar intento de login:', error)
  }
}

/**
 * Registra un logout
 */
export async function auditLogout(
  userId: number,
  userEmail: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await prisma.audit_log.create({
      data: {
        tabla: 'usuario',
        registro_id: String(userId),
        operacion: AuditAction.LOGOUT,
        datos_nuevos: { userId, email: userEmail, timestamp: new Date().toISOString() },
        usuario_id: userId,
        usuario_email: userEmail,
        ip_address: ipAddress,
        user_agent: userAgent,
        comentario: 'Usuario cerró sesión'
      }
    })
  } catch (error) {
    console.error('Error al auditar logout:', error)
  }
}

/**
 * Función helper para obtener registros de auditoría
 */
export async function getAuditLogs(options?: {
  tabla?: string
  registro_id?: string
  usuario_id?: number
  operacion?: AuditAction
  desde?: Date
  hasta?: Date
  limit?: number
  offset?: number
}) {
  try {
    const where: any = {}
    
    if (options?.tabla) where.tabla = options.tabla
    if (options?.registro_id) where.registro_id = options.registro_id
    if (options?.usuario_id) where.usuario_id = options.usuario_id
    if (options?.operacion) where.operacion = options.operacion
    
    if (options?.desde || options?.hasta) {
      where.fecha_cambio = {}
      if (options.desde) where.fecha_cambio.gte = options.desde
      if (options.hasta) where.fecha_cambio.lte = options.hasta
    }

    return await prisma.audit_log.findMany({
      where,
      include: {
        usuario: {
          select: {
            idprop: true,
            nomprop: true,
            apeprop: true,
            emailprop: true,
            rol: true
          }
        }
      },
      orderBy: { fecha_cambio: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0
    })
  } catch (error) {
    console.error('Error al obtener logs de auditoría:', error)
    return []
  }
}

/**
 * Función helper para obtener estadísticas de auditoría
 */
export async function getAuditStats(tabla?: string) {
  try {
    const where = tabla ? { tabla } : {}
    
    const [total, porOperacion, porUsuario] = await Promise.all([
      prisma.audit_log.count({ where }),
      prisma.audit_log.groupBy({
        by: ['operacion'],
        where,
        _count: { operacion: true }
      }),
      prisma.audit_log.groupBy({
        by: ['usuario_id'],
        where: { ...where, usuario_id: { not: null } },
        _count: { usuario_id: true },
        orderBy: { _count: { usuario_id: 'desc' } },
        take: 10
      })
    ])

    return {
      total,
      porOperacion,
      porUsuario
    }
  } catch (error) {
    console.error('Error al obtener estadísticas de auditoría:', error)
    return {
      total: 0,
      porOperacion: [],
      porUsuario: []
    }
  }
}