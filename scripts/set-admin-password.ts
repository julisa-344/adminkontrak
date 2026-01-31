/**
 * Script de uso único: actualiza la contraseña de un usuario (p. ej. el admin creado por SQL)
 * para que cumpla la política del panel (alfanumérico, mayúscula, minúscula, número, etc.).
 *
 * Uso: npx tsx scripts/set-admin-password.ts <email> <nueva_contraseña>
 * Ejemplo: npx tsx scripts/set-admin-password.ts admin@ejemplo.com MiPass123
 *
 * La contraseña debe cumplir la política (ver lib/password-policy.ts).
 */

import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { validateAdminPassword } from "../lib/password-policy"

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env")
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, "utf-8")
  for (const line of content.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, "")
      if (!process.env[key]) process.env[key] = value
    }
  }
}

loadEnv()

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const newPassword = process.argv[3]

  if (!email || !newPassword) {
    console.error("Uso: npx tsx scripts/set-admin-password.ts <email> <nueva_contraseña>")
    process.exit(1)
  }

  const policy = validateAdminPassword(newPassword)
  if (!policy.valid) {
    console.error("La contraseña no cumple la política:", policy.error)
    process.exit(1)
  }

  const user = await prisma.usuario.findUnique({
    where: { emailprop: email.trim().toLowerCase() },
  })

  if (!user) {
    console.error("No se encontró ningún usuario con ese correo.")
    process.exit(1)
  }

  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.usuario.update({
    where: { idprop: user.idprop },
    data: { password: hash },
  })

  console.log("Contraseña actualizada correctamente para:", user.emailprop)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
