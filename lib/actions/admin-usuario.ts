"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { validateAdminPassword } from "@/lib/password-policy"
import { softDeleteUsuario, notDeleted } from "@/lib/soft-delete"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

const ROL_ADMIN = "ADMINISTRADOR"

export async function getAdminCount(): Promise<number> {
  return prisma.usuario.count({
    where: { 
      rol: { equals: ROL_ADMIN, mode: "insensitive" },
      deleted_at: null
    },
  })
}

export type CreateAdminInput = {
  email: string
  nombre: string
  apellido: string
  password: string
}

export async function createFirstAdmin(data: CreateAdminInput): Promise<{ ok: boolean; error?: string }> {
  const count = await getAdminCount()
  if (count > 0) {
    return { ok: false, error: "Ya existe al menos un administrador. Usa el login o el panel para agregar más." }
  }

  const normalizedEmail = data.email.trim().toLowerCase()
  if (!normalizedEmail) return { ok: false, error: "El correo es obligatorio." }

  const policy = validateAdminPassword(data.password)
  if (!policy.valid) return { ok: false, error: policy.error }

  const existing = await prisma.usuario.findFirst({
    where: { 
      emailprop: normalizedEmail,
      deleted_at: null
    },
  })
  if (existing) return { ok: false, error: "Ya existe un usuario con ese correo." }

  const hash = await bcrypt.hash(data.password, 10)
  await prisma.usuario.create({
    data: {
      emailprop: normalizedEmail,
      nomprop: data.nombre.trim() || null,
      apeprop: data.apellido.trim() || null,
      password: hash,
      rol: ROL_ADMIN,
    },
  })

  revalidatePath("/setup")
  revalidatePath("/login")
  return { ok: true }
}

export async function createAdmin(data: CreateAdminInput): Promise<{ ok: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user || (session.user.rol?.toUpperCase() !== ROL_ADMIN)) {
    return { ok: false, error: "No autorizado." }
  }

  const normalizedEmail = data.email.trim().toLowerCase()
  if (!normalizedEmail) return { ok: false, error: "El correo es obligatorio." }

  const policy = validateAdminPassword(data.password)
  if (!policy.valid) return { ok: false, error: policy.error }

  const existing = await prisma.usuario.findFirst({
    where: { 
      emailprop: normalizedEmail,
      deleted_at: null
    },
  })
  if (existing) return { ok: false, error: "Ya existe un usuario con ese correo." }

  const hash = await bcrypt.hash(data.password, 10)
  await prisma.usuario.create({
    data: {
      emailprop: normalizedEmail,
      nomprop: data.nombre.trim() || null,
      apeprop: data.apellido.trim() || null,
      password: hash,
      rol: ROL_ADMIN,
    },
  })

  revalidatePath("/dashboard/usuarios")
  return { ok: true }
}

export async function listUsers() {
  const session = await auth()
  if (!session?.user || session.user.rol?.toUpperCase() !== ROL_ADMIN) {
    return []
  }
  return prisma.usuario.findMany({
    where: notDeleted,
    orderBy: [{ rol: "asc" }, { emailprop: "asc" }],
    select: {
      idprop: true,
      emailprop: true,
      nomprop: true,
      apeprop: true,
      rol: true,
      dniprop: true,
      telefonoprop: true,
    },
  })
}

/**
 * Elimina un usuario usando soft delete
 */
export async function deleteUsuario(idprop: number, reason?: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user || session.user.rol?.toUpperCase() !== ROL_ADMIN) {
    return { ok: false, error: "No autorizado." }
  }

  // Verificar que el usuario exista y no esté ya eliminado
  const usuario = await prisma.usuario.findUnique({
    where: { 
      idprop,
      deleted_at: null 
    },
    include: {
      _count: {
        select: { 
          vehiculo: { where: notDeleted },
          reserva: { where: notDeleted }
        }
      }
    }
  })

  if (!usuario) {
    return { ok: false, error: "Usuario no encontrado" }
  }

  // No permitir eliminar al último administrador
  if (usuario.rol?.toUpperCase() === ROL_ADMIN) {
    const adminCount = await getAdminCount()
    if (adminCount <= 1) {
      return { ok: false, error: "No se puede eliminar el último administrador del sistema" }
    }
  }

  // Verificar si tiene vehículos o reservas activas
  if (usuario._count.vehiculo > 0 || usuario._count.reserva > 0) {
    return { 
      ok: false, 
      error: `No se puede eliminar: el usuario tiene ${usuario._count.vehiculo} vehículo(s) y ${usuario._count.reserva} reserva(s) asociados` 
    }
  }

  // Realizar soft delete
  const result = await softDeleteUsuario(
    idprop, 
    reason || "Eliminado desde panel administrativo"
  )

  if (!result.success) {
    return { ok: false, error: result.error || "Error al eliminar usuario" }
  }

  revalidatePath("/dashboard/usuarios")
  return { ok: true }
}
