"use server"

import { EstadoVehiculo } from "@prisma/client"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
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
  const fotoveh = (formData.get("fotoveh") as string) || null
  const imagenUrl = (formData.get("imagenUrl") as string) || null
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

  await prisma.vehiculo.create({
    data: {
      plaveh: plaveh.trim(),
      marveh: marveh.trim(),
      modveh: modveh.trim(),
      categoria: categoria?.trim() || null,
      precioalquilo,
      fotoveh: fotoveh?.trim() || null,
      imagenUrl: imagenUrl?.trim() || null,
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
  const fotoveh = (formData.get("fotoveh") as string) || null
  const imagenUrl = (formData.get("imagenUrl") as string) || null
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

  await prisma.vehiculo.update({
    where: { idveh },
    data: {
      plaveh,
      marveh,
      modveh,
      categoria: categoria?.trim() || null,
      precioalquilo,
      fotoveh: fotoveh?.trim() || null,
      imagenUrl: imagenUrl?.trim() || null,
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

export async function eliminarVehiculo(idveh: number): Promise<Result> {
  const check = await requireAdmin()
  if (!check.ok) return { ok: false, error: check.error }

  const vehiculo = await prisma.vehiculo.findUnique({
    where: { idveh },
    include: { reserva: true, mantenimiento: true },
  })
  if (!vehiculo) return { ok: false, error: "Vehículo no encontrado" }
  if (vehiculo.reserva.length > 0 || vehiculo.mantenimiento.length > 0) {
    return { ok: false, error: "No se puede eliminar: tiene reservas o mantenimientos asociados" }
  }

  await prisma.vehiculo.delete({ where: { idveh } })
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/vehiculos")
  return { ok: true }
}
