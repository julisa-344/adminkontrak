/**
 * Script para verificar usuarios en la base de datos
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
  try {
    console.log("🔍 Consultando usuarios en la base de datos...")
    
    const usuarios = await prisma.usuario.findMany({
      select: {
        idprop: true,
        nomprop: true,
        apeprop: true,
        emailprop: true,
        rol: true,
        estprop: true,
        password: true
      }
    })

    console.log(`\n📊 Total de usuarios: ${usuarios.length}\n`)
    
    usuarios.forEach((user, index) => {
      console.log(`👤 Usuario ${index + 1}:`)
      console.log(`   ID: ${user.idprop}`)
      console.log(`   Nombre: ${user.nomprop} ${user.apeprop}`)
      console.log(`   Email: ${user.emailprop}`)
      console.log(`   Rol: ${user.rol}`)
      console.log(`   Activo: ${user.estprop}`)
      console.log(`   Tiene contraseña: ${user.password ? 'Sí' : 'No'}`)
      console.log("---")
    })

  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()