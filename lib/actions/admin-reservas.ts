"use server"

import { prisma } from "@/lib/prisma"
import { softDeleteReserva, notDeleted } from "@/lib/soft-delete"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

const ROL_ADMIN = "ADMINISTRADOR"

// Estos valores deben coincidir EXACTAMENTE con el enum EstadoReserva de PostgreSQL
export type EstadoReserva = "PENDIENTE" | "CONFIRMADA" | "FINALIZADA" | "CANCELADA"

/** Mapeo BD → UI: normaliza cualquier formato al valor del enum */
const ESTADO_DB_TO_UI: Record<string, EstadoReserva> = {
  // Valores exactos del enum PostgreSQL
  PENDIENTE: "PENDIENTE",
  CONFIRMADA: "CONFIRMADA",
  FINALIZADA: "FINALIZADA",
  CANCELADA: "CANCELADA",
  // Valores legacy/antiguos que podrían existir
  RECHAZADA: "CANCELADA",
  ESPERANDO_CLIENTE: "CONFIRMADA",
  EN_USO: "CONFIRMADA",
  ESPERANDO_PROPIETARIO: "CONFIRMADA",
  // Variantes de capitalización
  Pendiente: "PENDIENTE",
  Confirmada: "CONFIRMADA",
  Finalizada: "FINALIZADA",
  Cancelada: "CANCELADA",
}

/** Valores que se envían a la BD - deben ser EXACTAMENTE como el enum PostgreSQL */
const ESTADO_PARA_BD: Record<EstadoReserva, string> = {
  PENDIENTE: "PENDIENTE",
  CONFIRMADA: "CONFIRMADA",
  FINALIZADA: "FINALIZADA",
  CANCELADA: "CANCELADA",
}

type ReservaRow = {
  idres: number
  idcli: number | null
  idveh: number | null
  costo: number | null
  fechafin: Date | null
  fechafinalizacion: Date | null
  fechainicio: Date | null
  fechares: Date | null
  estado: string | null
  u_idprop: number | null
  emailprop: string | null
  nomprop: string | null
  apeprop: string | null
  telefonoprop: string | null
  v_idveh: number | null
  plaveh: string | null
  marveh: string | null
  modveh: string | null
}

export async function listReservas() {
  const session = await auth()
  if (!session?.user || session.user.rol?.toUpperCase() !== ROL_ADMIN) {
    return []
  }

  const rows = await prisma.$queryRaw<ReservaRow[]>`
    SELECT r.idres, r.idcli, r.idveh, r.costo, r.fechafin, r.fechafinalizacion, r.fechainicio, r.fechares, r.estado::text as estado,
           u.idprop as u_idprop, u.emailprop, u.nomprop, u.apeprop, u.telefonoprop,
           v.idveh as v_idveh, v.plaveh, v.marveh, v.modveh
    FROM reserva r
    LEFT JOIN usuario u ON r.idcli = u.idprop AND u.deleted_at IS NULL
    LEFT JOIN vehiculo v ON r.idveh = v.idveh AND v.deleted_at IS NULL
    WHERE r.deleted_at IS NULL
    ORDER BY r.fechares DESC NULLS LAST, r.idres DESC
  `

  return rows.map((r) => ({
    idres: r.idres,
    idcli: r.idcli,
    idveh: r.idveh,
    costo: r.costo,
    fechafin: r.fechafin,
    fechafinalizacion: r.fechafinalizacion,
    fechainicio: r.fechainicio,
    fechares: r.fechares,
    estado: (r.estado ? ESTADO_DB_TO_UI[r.estado] ?? (r.estado as EstadoReserva) : null) as EstadoReserva | null,
    usuario: r.u_idprop != null ? {
      idprop: r.u_idprop,
      emailprop: r.emailprop,
      nomprop: r.nomprop,
      apeprop: r.apeprop,
      telefonoprop: r.telefonoprop,
    } : null,
    vehiculo: r.v_idveh != null ? {
      idveh: r.v_idveh,
      plaveh: r.plaveh,
      marveh: r.marveh,
      modveh: r.modveh,
    } : null,
  }))
}

export async function updateReservaEstado(
  idres: number,
  estado: EstadoReserva
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user || session.user.rol?.toUpperCase() !== ROL_ADMIN) {
    return { ok: false, error: "No autorizado." }
  }

  const valid: EstadoReserva[] = ["PENDIENTE", "CONFIRMADA", "FINALIZADA", "CANCELADA"]
  if (!valid.includes(estado)) {
    return { ok: false, error: "Estado no válido." }
  }

  const valorBd = ESTADO_PARA_BD[estado]
  try {
    const result = await prisma.$executeRaw`
      UPDATE reserva SET estado = CAST(${valorBd} AS "EstadoReserva") WHERE idres = ${idres}
    `
    if (result === 0) {
      return { ok: false, error: "Reserva no encontrada." }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }

  revalidatePath("/dashboard/reservas")
  return { ok: true }
}

/**
 * Elimina una reserva usando soft delete
 */
export async function deleteReserva(idres: number, reason?: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user || session.user.rol?.toUpperCase() !== ROL_ADMIN) {
    return { ok: false, error: "No autorizado." }
  }

  // Verificar que la reserva exista y no esté ya eliminada
  const reserva = await prisma.reserva.findUnique({
    where: { 
      idres,
      deleted_at: null 
    }
  })

  if (!reserva) {
    return { ok: false, error: "Reserva no encontrada" }
  }

  // Realizar soft delete
  const result = await softDeleteReserva(
    idres, 
    reason || "Eliminada desde panel administrativo"
  )

  if (!result.success) {
    return { ok: false, error: result.error || "Error al eliminar reserva" }
  }

  revalidatePath("/dashboard/reservas")
  return { ok: true }
}
