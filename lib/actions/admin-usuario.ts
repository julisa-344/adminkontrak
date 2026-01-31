"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { validateAdminPassword } from "@/lib/password-policy"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

const ROL_ADMIN = "ADMINISTRADOR"

export async function getAdminCount(): Promise<number> {
  return prisma.usuario.count({
    where: { rol: { equals: ROL_ADMIN, mode: "insensitive" } },
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

  const existing = await prisma.usuario.findUnique({
    where: { emailprop: normalizedEmail },
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

  const existing = await prisma.usuario.findUnique({
    where: { emailprop: normalizedEmail },
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
