/**
 * Script de uso único: deja en la tabla usuario solo 2 roles — ADMINISTRADOR y CLIENTE.
 * Todos los que no sean ADMINISTRADOR (CONTRATISTA, PROPIETARIO, etc.) pasan a CLIENTE.
 *
 * Uso: npx tsx scripts/normalize-user-roles.ts
 */

import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { PrismaClient } from "@prisma/client"

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
  const antes = await prisma.usuario.findMany({
    where: {
      OR: [
        { rol: null },
        { rol: { not: "ADMINISTRADOR", mode: "insensitive" } },
      ],
    },
    select: { idprop: true, emailprop: true, rol: true },
  })

  const result = await prisma.usuario.updateMany({
    where: {
      OR: [
        { rol: null },
        { rol: { not: "ADMINISTRADOR", mode: "insensitive" } },
      ],
    },
    data: { rol: "CLIENTE" },
  })

  console.log(`Actualizados ${result.count} usuario(s) a rol CLIENTE.`)
  if (antes.length > 0) {
    console.log("Usuarios afectados (antes tenían otro rol):")
    antes.forEach((u) => console.log(`  - ${u.emailprop ?? u.idprop} (${u.rol ?? "null"} → CLIENTE)`))
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
