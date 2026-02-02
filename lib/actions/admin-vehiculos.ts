"use server"

import { EstadoVehiculo } from "@prisma/client"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { softDeleteVehiculo, notDeleted } from "@/lib/soft-delete"
import { uploadImage, deleteImage, validateImageFile, isVercelBlobUrl } from '@/lib/blob-storage'
import { auditCreate, auditUpdate, auditDelete, setAuditContext } from '@/lib/audit-helpers'
import { revalidatePath } from "next/cache"

export type ResultOk = { ok: true }
export type ResultErr = { ok: false; error: string }
export type Result = ResultOk | ResultErr

// ============================================================
// VALIDACIONES
// ============================================================

const CURRENT_YEAR = new Date().getFullYear()
const MIN_YEAR = 1900
const MAX_YEAR = CURRENT_YEAR + 1

/**
 * Valida el formato de placa (permite varios formatos)
 * Ejemplos válidos: ABC-123, ABC123, AB-1234
 */
function validatePlaca(placa: string): { valid: boolean; error?: string } {
  const trimmed = placa.trim().toUpperCase()
  
  if (trimmed.length < 5 || trimmed.length > 10) {
    return { valid: false, error: "La placa debe tener entre 5 y 10 caracteres" }
  }
  
  // Permitir letras, números y guiones
  const regex = /^[A-Z0-9-]+$/
  if (!regex.test(trimmed)) {
    return { valid: false, error: "La placa solo puede contener letras, números y guiones" }
  }
  
  return { valid: true }
}

/**
 * Valida el año del vehículo
 */
function validateAnio(anio: number | null): { valid: boolean; error?: string } {
  if (anio === null) return { valid: true }
  
  if (!Number.isInteger(anio)) {
    return { valid: false, error: "El año debe ser un número entero" }
  }
  
  if (anio < MIN_YEAR || anio > MAX_YEAR) {
    return { valid: false, error: `El año debe estar entre ${MIN_YEAR} y ${MAX_YEAR}` }
  }
  
  return { valid: true }
}

/**
 * Valida el precio de alquiler
 */
function validatePrecio(precio: number): { valid: boolean; error?: string } {
  if (isNaN(precio)) {
    return { valid: false, error: "El precio debe ser un número válido" }
  }
  
  if (precio < 0) {
    return { valid: false, error: "El precio no puede ser negativo" }
  }
  
  if (precio > 1000000) {
    return { valid: false, error: "El precio parece demasiado alto. Máximo: 1,000,000" }
  }
  
  return { valid: true }
}

/**
 * Valida valores numéricos positivos (peso, potencia, horas de uso)
 */
function validatePositiveNumber(value: number | null, fieldName: string): { valid: boolean; error?: string } {
  if (value === null) return { valid: true }
  
  if (isNaN(value)) {
    return { valid: false, error: `${fieldName} debe ser un número válido` }
  }
  
  if (value < 0) {
    return { valid: false, error: `${fieldName} no puede ser negativo` }
  }
  
  return { valid: true }
}

/**
 * Valida texto requerido (no vacío)
 */
function validateRequired(value: string | null, fieldName: string): { valid: boolean; error?: string } {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} es obligatorio` }
  }
  return { valid: true }
}

/**
 * Valida longitud máxima de texto
 */
function validateMaxLength(value: string | null, maxLength: number, fieldName: string): { valid: boolean; error?: string } {
  if (value && value.length > maxLength) {
    return { valid: false, error: `${fieldName} no puede exceder ${maxLength} caracteres` }
  }
  return { valid: true }
}

// ============================================================
// FUNCIONES DE AYUDA
// ============================================================

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { ok: false as const, error: "No autenticado", userId: null, userEmail: null }
  const rol = session.user.rol?.toUpperCase()
  if (rol !== "ADMINISTRADOR") return { ok: false as const, error: "Solo administradores", userId: null, userEmail: null }
  const userId = session.user.id ? parseInt(session.user.id, 10) : null
  const userEmail = session.user.email || null
  return { ok: true as const, userId, userEmail }
}

// ============================================================
// ACCIONES DEL SERVIDOR
// ============================================================

/**
 * Obtiene todos los vehículos no eliminados
 */
export async function getVehiculosAdmin() {
  const check = await requireAdmin()
  if (!check.ok) return []
  return prisma.vehiculo.findMany({
    where: notDeleted,
    orderBy: { idveh: "desc" },
    include: { usuario: { select: { nomprop: true, apeprop: true, emailprop: true } } },
  })
}

/**
 * Crea un nuevo vehículo con validaciones completas y auditoría
 */
export async function crearVehiculo(formData: FormData): Promise<Result> {
  const check = await requireAdmin()
  if (!check.ok) return { ok: false, error: check.error }
  const { userId, userEmail } = check

  // Configurar contexto de auditoría
  if (userId) {
    setAuditContext({
      userId,
      userEmail: userEmail || undefined,
      comment: 'Creación de nuevo vehículo'
    })
  }

  // Extraer datos del formulario
  const plaveh = formData.get("plaveh") as string | null
  const marveh = formData.get("marveh") as string | null
  const modveh = formData.get("modveh") as string | null
  const categoria = (formData.get("categoria") as string) || null
  const precioStr = formData.get("precioalquilo") as string | null
  const imageFile = formData.get("image") as File | null
  const anioStr = formData.get("anioveh") as string | null
  const capacidad = (formData.get("capacidad") as string) || null
  const dimensiones = (formData.get("dimensiones") as string) || null
  const pesoStr = (formData.get("peso") as string) || null
  const potenciaStr = (formData.get("potencia") as string) || null
  const accesorios = (formData.get("accesorios") as string) || null
  const requiereCert = formData.get("requiere_certificacion") === "true"
  const horasUsoStr = (formData.get("horas_uso") as string) || null

  // ========== VALIDACIONES ==========
  
  // Campos requeridos
  let validation = validateRequired(plaveh, "Placa")
  if (!validation.valid) return { ok: false, error: validation.error! }
  
  validation = validateRequired(marveh, "Marca")
  if (!validation.valid) return { ok: false, error: validation.error! }
  
  validation = validateRequired(modveh, "Modelo")
  if (!validation.valid) return { ok: false, error: validation.error! }

  // Validar formato de placa
  validation = validatePlaca(plaveh!)
  if (!validation.valid) return { ok: false, error: validation.error! }

  // Validar longitudes máximas
  validation = validateMaxLength(marveh, 255, "Marca")
  if (!validation.valid) return { ok: false, error: validation.error! }
  
  validation = validateMaxLength(modveh, 255, "Modelo")
  if (!validation.valid) return { ok: false, error: validation.error! }
  
  validation = validateMaxLength(categoria, 255, "Categoría")
  if (!validation.valid) return { ok: false, error: validation.error! }
  
  validation = validateMaxLength(capacidad, 255, "Capacidad")
  if (!validation.valid) return { ok: false, error: validation.error! }
  
  validation = validateMaxLength(dimensiones, 255, "Dimensiones")
  if (!validation.valid) return { ok: false, error: validation.error! }
  
  validation = validateMaxLength(accesorios, 500, "Accesorios")
  if (!validation.valid) return { ok: false, error: validation.error! }

  // Parsear y validar valores numéricos
  const precioalquilo = precioStr ? parseFloat(precioStr) : 0
  validation = validatePrecio(precioalquilo)
  if (!validation.valid) return { ok: false, error: validation.error! }

  const anioveh = anioStr ? parseInt(anioStr, 10) : null
  validation = validateAnio(anioveh)
  if (!validation.valid) return { ok: false, error: validation.error! }

  const peso = pesoStr ? parseFloat(pesoStr) : null
  validation = validatePositiveNumber(peso, "Peso")
  if (!validation.valid) return { ok: false, error: validation.error! }

  const potencia = potenciaStr ? parseFloat(potenciaStr) : null
  validation = validatePositiveNumber(potencia, "Potencia")
  if (!validation.valid) return { ok: false, error: validation.error! }

  const horas_uso = horasUsoStr ? parseFloat(horasUsoStr) : null
  validation = validatePositiveNumber(horas_uso, "Horas de uso")
  if (!validation.valid) return { ok: false, error: validation.error! }

  // Verificar que no exista vehículo con misma placa o modelo
  const existente = await prisma.vehiculo.findFirst({
    where: { 
      OR: [
        { plaveh: plaveh!.trim().toUpperCase() }, 
        { modveh: modveh!.trim() }
      ],
      deleted_at: null // Solo verificar entre no eliminados
    },
  })
  if (existente) {
    if (existente.plaveh?.toUpperCase() === plaveh!.trim().toUpperCase()) {
      return { ok: false, error: "Ya existe un vehículo con esa placa" }
    }
    return { ok: false, error: "Ya existe un vehículo con ese modelo" }
  }

  // Subir imagen a Vercel Blob si se proporciona
  let imagenUrl: string | null = null
  if (imageFile && imageFile.size > 0) {
    const imgValidation = validateImageFile(imageFile)
    if (!imgValidation.valid) {
      return { ok: false, error: imgValidation.error || 'Archivo de imagen inválido' }
    }

    const uploadResult = await uploadImage(imageFile, 'vehiculos')
    if (!uploadResult.success) {
      return { ok: false, error: uploadResult.error || 'Error al subir imagen' }
    }

    imagenUrl = uploadResult.url!
  }

  // Crear vehículo con campos de auditoría
  const nuevoVehiculo = await prisma.vehiculo.create({
    data: {
      plaveh: plaveh!.trim().toUpperCase(),
      marveh: marveh!.trim(),
      modveh: modveh!.trim(),
      categoria: categoria?.trim() || null,
      precioalquilo,
      fotoveh: null,
      imagenUrl,
      anioveh: anioveh != null && !isNaN(anioveh) ? anioveh : null,
      capacidad: capacidad?.trim() || null,
      dimensiones: dimensiones?.trim() || null,
      peso: peso != null && !isNaN(peso) ? peso : null,
      potencia: potencia != null && !isNaN(potencia) ? potencia : null,
      accesorios: accesorios?.trim() || null,
      requiere_certificacion: requiereCert,
      horas_uso: horas_uso != null && !isNaN(horas_uso) ? horas_uso : null,
      estveh: EstadoVehiculo.DISPONIBLE,
      idprop: userId ?? undefined,
      // Campos de auditoría
      created_by: userId,
      updated_by: userId,
    },
  })

  // Registrar en audit_log
  await auditCreate('vehiculo', nuevoVehiculo.idveh, nuevoVehiculo, `Nuevo vehículo creado: ${nuevoVehiculo.marveh} ${nuevoVehiculo.modveh}`)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/vehiculos")
  return { ok: true }
}

/**
 * Actualiza un vehículo existente con validaciones y auditoría
 */
export async function actualizarVehiculo(idveh: number, formData: FormData): Promise<Result> {
  const check = await requireAdmin()
  if (!check.ok) return { ok: false, error: check.error }
  const { userId, userEmail } = check

  // Configurar contexto de auditoría
  if (userId) {
    setAuditContext({
      userId,
      userEmail: userEmail || undefined,
      comment: 'Actualización de vehículo'
    })
  }

  // Obtener vehículo actual para comparar cambios
  const vehiculoAnterior = await prisma.vehiculo.findUnique({ where: { idveh } })
  if (!vehiculoAnterior) return { ok: false, error: "Vehículo no encontrado" }
  if (vehiculoAnterior.deleted_at) return { ok: false, error: "No se puede editar un vehículo eliminado" }

  // Extraer datos del formulario
  const plaveh = (formData.get("plaveh") as string)?.trim() ?? vehiculoAnterior.plaveh
  const marveh = (formData.get("marveh") as string)?.trim() ?? vehiculoAnterior.marveh
  const modveh = (formData.get("modveh") as string)?.trim() ?? vehiculoAnterior.modveh
  const categoria = (formData.get("categoria") as string) || null
  const precioStr = formData.get("precioalquilo") as string
  const imageFile = formData.get("image") as File | null
  const anioStr = formData.get("anioveh") as string | null
  const capacidad = (formData.get("capacidad") as string) || null
  const dimensiones = (formData.get("dimensiones") as string) || null
  const pesoStr = (formData.get("peso") as string) || null
  const potenciaStr = (formData.get("potencia") as string) || null
  const accesorios = (formData.get("accesorios") as string) || null
  const requiereCert = formData.get("requiere_certificacion") === "true"
  const horasUsoStr = (formData.get("horas_uso") as string) || null
  const estvehStr = formData.get("estveh") as string | null

  // ========== VALIDACIONES ==========
  
  // Validar placa si cambió
  if (plaveh && plaveh !== vehiculoAnterior.plaveh) {
    const validation = validatePlaca(plaveh)
    if (!validation.valid) return { ok: false, error: validation.error! }
    
    // Verificar unicidad de placa
    const existePlaca = await prisma.vehiculo.findFirst({
      where: { 
        plaveh: plaveh.toUpperCase(),
        idveh: { not: idveh },
        deleted_at: null
      }
    })
    if (existePlaca) {
      return { ok: false, error: "Ya existe otro vehículo con esa placa" }
    }
  }

  // Validar modelo si cambió
  if (modveh && modveh !== vehiculoAnterior.modveh) {
    const existeModelo = await prisma.vehiculo.findFirst({
      where: { 
        modveh: modveh,
        idveh: { not: idveh },
        deleted_at: null
      }
    })
    if (existeModelo) {
      return { ok: false, error: "Ya existe otro vehículo con ese modelo" }
    }
  }

  // Validar precio
  const precioalquilo = precioStr ? parseFloat(precioStr) : vehiculoAnterior.precioalquilo ?? 0
  let validation = validatePrecio(precioalquilo)
  if (!validation.valid) return { ok: false, error: validation.error! }

  // Validar año
  const anioveh = anioStr ? parseInt(anioStr, 10) : null
  validation = validateAnio(anioveh)
  if (!validation.valid) return { ok: false, error: validation.error! }

  // Validar números positivos
  const peso = pesoStr ? parseFloat(pesoStr) : null
  validation = validatePositiveNumber(peso, "Peso")
  if (!validation.valid) return { ok: false, error: validation.error! }

  const potencia = potenciaStr ? parseFloat(potenciaStr) : null
  validation = validatePositiveNumber(potencia, "Potencia")
  if (!validation.valid) return { ok: false, error: validation.error! }

  const horas_uso = horasUsoStr ? parseFloat(horasUsoStr) : null
  validation = validatePositiveNumber(horas_uso, "Horas de uso")
  if (!validation.valid) return { ok: false, error: validation.error! }

  // Validar estado
  const estveh =
    estvehStr && ["DISPONIBLE", "OCUPADO", "EN_MANTENIMIENTO", "FUERA_SERVICIO"].includes(estvehStr)
      ? (estvehStr as EstadoVehiculo)
      : vehiculoAnterior.estveh

  // Manejar actualización de imagen
  let imagenUrl = vehiculoAnterior.imagenUrl

  if (imageFile && imageFile.size > 0) {
    const imgValidation = validateImageFile(imageFile)
    if (!imgValidation.valid) {
      return { ok: false, error: imgValidation.error || 'Archivo de imagen inválido' }
    }

    // Eliminar imagen anterior si existe y es de Vercel Blob
    if (vehiculoAnterior.imagenUrl && isVercelBlobUrl(vehiculoAnterior.imagenUrl)) {
      await deleteImage(vehiculoAnterior.imagenUrl)
    }

    // Subir nueva imagen a Vercel Blob
    const uploadResult = await uploadImage(imageFile, 'vehiculos')
    if (!uploadResult.success) {
      return { ok: false, error: uploadResult.error || 'Error al subir imagen' }
    }

    imagenUrl = uploadResult.url!
  }

  // Actualizar vehículo con campo de auditoría
  const vehiculoActualizado = await prisma.vehiculo.update({
    where: { idveh },
    data: {
      plaveh: plaveh?.toUpperCase() || vehiculoAnterior.plaveh,
      marveh,
      modveh,
      categoria: categoria?.trim() || null,
      precioalquilo,
      fotoveh: null,
      imagenUrl,
      anioveh: anioveh != null && !isNaN(anioveh) ? anioveh : null,
      capacidad: capacidad?.trim() || null,
      dimensiones: dimensiones?.trim() || null,
      peso: peso != null && !isNaN(peso) ? peso : null,
      potencia: potencia != null && !isNaN(potencia) ? potencia : null,
      accesorios: accesorios?.trim() || null,
      requiere_certificacion: requiereCert,
      horas_uso: horas_uso != null && !isNaN(horas_uso) ? horas_uso : null,
      estveh,
      // Campo de auditoría
      updated_by: userId,
    },
  })

  // Registrar en audit_log
  await auditUpdate('vehiculo', idveh, vehiculoAnterior, vehiculoActualizado, `Vehículo actualizado: ${vehiculoActualizado.marveh} ${vehiculoActualizado.modveh}`)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/vehiculos")
  revalidatePath(`/dashboard/vehiculos/${idveh}/editar`)
  return { ok: true }
}

/**
 * Elimina un vehículo (soft delete) con auditoría
 */
export async function eliminarVehiculo(idveh: number, reason?: string): Promise<Result> {
  const check = await requireAdmin()
  if (!check.ok) return { ok: false, error: check.error }
  const { userId, userEmail } = check

  // Configurar contexto de auditoría
  if (userId) {
    setAuditContext({
      userId,
      userEmail: userEmail || undefined,
      comment: reason || 'Eliminación de vehículo'
    })
  }

  // Verificar que el vehículo exista y no esté ya eliminado
  const vehiculo = await prisma.vehiculo.findUnique({
    where: { idveh },
    include: { 
      reserva: { where: { deleted_at: null } }, 
      mantenimiento: true 
    },
  })
  
  if (!vehiculo) {
    return { ok: false, error: "Vehículo no encontrado" }
  }
  
  if (vehiculo.deleted_at) {
    return { ok: false, error: "El vehículo ya está eliminado" }
  }

  // Verificar reservas activas (solo PENDIENTE y CONFIRMADA, no EN_USO porque ya no existe)
  const reservasActivas = vehiculo.reserva.filter(r => 
    r.estado === 'PENDIENTE' || r.estado === 'CONFIRMADA'
  )
  
  if (reservasActivas.length > 0) {
    return { 
      ok: false, 
      error: `No se puede eliminar: tiene ${reservasActivas.length} reserva(s) activa(s). Finalice o cancele las reservas primero.` 
    }
  }

  // Realizar soft delete
  const result = await softDeleteVehiculo(idveh, reason || "Eliminado desde panel administrativo")
  
  if (!result.success) {
    return { ok: false, error: result.error || "Error al eliminar vehículo" }
  }

  // Registrar en audit_log
  await auditDelete('vehiculo', idveh, vehiculo, reason || "Eliminado desde panel administrativo")

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/vehiculos")
  return { ok: true }
}
