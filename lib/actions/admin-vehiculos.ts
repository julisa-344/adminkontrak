"use server"

import { EstadoVehiculo } from "@prisma/client"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { softDeleteVehiculo, notDeleted } from "@/lib/soft-delete"
import { uploadImage, deleteImage, extractPublicId, validateImageFile } from '@/lib/cloudinary'
import { revalidatePath } from "next/cache"

export type ResultOk = { ok: true }
export type ResultErr = { ok: false; error: string }
export type Result = ResultOk | ResultErr

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { ok: false as const, error: "No autenticado", userId: null }
  const rol = session.user.rol?.toUpperCase()
  if (rol !== "ADMINISTRADOR") return { ok: false as const, error: "Solo administradores", userId: null }
  const userId = session.user.id ? parseInt(session.user.id, 10) : null
  return { ok: true as const, userId }
}

export async function getVehiculosAdmin() {
  const check = await requireAdmin()
  if (!check.ok) return []
  return prisma.vehiculo.findMany({
    where: notDeleted,
    orderBy: { idveh: "desc" },
    include: { usuario: { select: { nomprop: true, apeprop: true, emailprop: true } } },
  })
}

export async function crearVehiculo(formData: FormData): Promise<Result> {
  const check = await requireAdmin()
  if (!check.ok) return { ok: false, error: check.error }
  const userId = check.userId

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

  if (!plaveh?.trim() || !marveh?.trim() || !modveh?.trim()) {
    return { ok: false, error: "Placa, marca y modelo son obligatorios" }
  }
  const precioalquilo = precioStr ? parseFloat(precioStr) : 0
  if (isNaN(precioalquilo) || precioalquilo < 0) {
    return { ok: false, error: "Precio de alquiler inválido" }
  }

  const anioveh = anioStr ? parseInt(anioStr, 10) : null
  const peso = pesoStr ? parseFloat(pesoStr) : null
  const potencia = potenciaStr ? parseFloat(potenciaStr) : null
  const horas_uso = horasUsoStr ? parseFloat(horasUsoStr) : null

  const existente = await prisma.vehiculo.findFirst({
    where: { OR: [{ plaveh: plaveh.trim() }, { modveh: modveh.trim() }] },
  })
  if (existente) {
    return { ok: false, error: "Ya existe un vehículo con esa placa o modelo" }
  }

  // Subir imagen a Cloudinary si se proporciona
  let imagenUrl: string | null = null
  if (imageFile && imageFile.size > 0) {
    const validation = validateImageFile(imageFile)
    if (!validation.valid) {
      return { ok: false, error: validation.error || 'Archivo de imagen inválido' }
    }

    const uploadResult = await uploadImage(imageFile, 'autorent/vehiculos')
    if (!uploadResult.success) {
      return { ok: false, error: uploadResult.error || 'Error al subir imagen' }
    }

    imagenUrl = uploadResult.url!
  }

  await prisma.vehiculo.create({
    data: {
      plaveh: plaveh.trim(),
      marveh: marveh.trim(),
      modveh: modveh.trim(),
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
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/vehiculos")
  return { ok: true }
}

export async function actualizarVehiculo(idveh: number, formData: FormData): Promise<Result> {
  const check = await requireAdmin()
  if (!check.ok) return { ok: false, error: check.error }

  const vehiculo = await prisma.vehiculo.findUnique({ where: { idveh } })
  if (!vehiculo) return { ok: false, error: "Vehículo no encontrado" }

  const plaveh = (formData.get("plaveh") as string)?.trim() ?? vehiculo.plaveh
  const marveh = (formData.get("marveh") as string)?.trim() ?? vehiculo.marveh
  const modveh = (formData.get("modveh") as string)?.trim() ?? vehiculo.modveh
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

  const precioalquilo = precioStr ? parseFloat(precioStr) : vehiculo.precioalquilo ?? 0
  if (isNaN(precioalquilo) || precioalquilo < 0) {
    return { ok: false, error: "Precio de alquiler inválido" }
  }

  const estveh =
    estvehStr && ["DISPONIBLE", "OCUPADO", "EN_MANTENIMIENTO", "FUERA_SERVICIO"].includes(estvehStr)
      ? (estvehStr as EstadoVehiculo)
      : vehiculo.estveh

  const anioveh = anioStr ? parseInt(anioStr, 10) : null
  const peso = pesoStr ? parseFloat(pesoStr) : null
  const potencia = potenciaStr ? parseFloat(potenciaStr) : null
  const horas_uso = horasUsoStr ? parseFloat(horasUsoStr) : null

  // Manejar actualización de imagen
  let imagenUrl = vehiculo.imagenUrl

  if (imageFile && imageFile.size > 0) {
    const validation = validateImageFile(imageFile)
    if (!validation.valid) {
      return { ok: false, error: validation.error || 'Archivo de imagen inválido' }
    }

    // Eliminar imagen anterior si existe
    if (vehiculo.imagenUrl) {
      const publicId = extractPublicId(vehiculo.imagenUrl)
      if (publicId) {
        await deleteImage(publicId)
      }
    }

    // Subir nueva imagen
    const uploadResult = await uploadImage(imageFile, 'autorent/vehiculos')
    if (!uploadResult.success) {
      return { ok: false, error: uploadResult.error || 'Error al subir imagen' }
    }

    imagenUrl = uploadResult.url!
  }

  await prisma.vehiculo.update({
    where: { idveh },
    data: {
      plaveh,
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
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/vehiculos")
  revalidatePath(`/dashboard/vehiculos/${idveh}/editar`)
  return { ok: true }
}

export async function eliminarVehiculo(idveh: number, reason?: string): Promise<Result> {
  const check = await requireAdmin()
  if (!check.ok) return { ok: false, error: check.error }

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

  // Verificar reservas activas
  const reservasActivas = vehiculo.reserva.filter(r => 
    r.estado === 'PENDIENTE' || r.estado === 'CONFIRMADA' || r.estado === 'EN_USO'
  )
  
  if (reservasActivas.length > 0) {
    return { 
      ok: false, 
      error: `No se puede eliminar: tiene ${reservasActivas.length} reserva(s) activa(s)` 
    }
  }

  // Realizar soft delete
  const result = await softDeleteVehiculo(idveh, reason || "Eliminado desde panel administrativo")
  
  if (!result.success) {
    return { ok: false, error: result.error || "Error al eliminar vehículo" }
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/vehiculos")
  return { ok: true }
}
