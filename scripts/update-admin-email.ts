/**
 * Script para actualizar el email del usuario administrador
 * De: admin@autorent.com -> A: admin@kontrak.com
 * Uso: npx tsx scripts/update-admin-email.ts
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

const OLD_EMAIL = "admin@autorent.com"
const NEW_EMAIL = "admin@kontrak.com"

async function main() {
  try {
    console.log("🔍 Conectando a la base de datos...")
    await prisma.$connect()
    console.log("✅ Conexión exitosa\n")

    // Buscar usuario con el email antiguo
    console.log(`🔎 Buscando usuario con email: ${OLD_EMAIL}`)
    const oldUser = await prisma.usuario.findFirst({
      where: { emailprop: OLD_EMAIL }
    })

    if (!oldUser) {
      console.log(`⚠️  No se encontró usuario con email: ${OLD_EMAIL}`)
      
      // Verificar si ya existe con el nuevo email
      const newUser = await prisma.usuario.findFirst({
        where: { emailprop: NEW_EMAIL }
      })
      
      if (newUser) {
        console.log(`\n✅ Ya existe un usuario con el email nuevo: ${NEW_EMAIL}`)
        console.log("📧 Email:", newUser.emailprop)
        console.log("👤 Nombre:", newUser.nomprop, newUser.apeprop)
        console.log("🎭 Rol:", newUser.rol)
        console.log("\n✨ No es necesario hacer cambios.")
      } else {
        console.log(`\n❌ No existe usuario con ninguno de los emails.`)
        console.log("💡 Ejecuta 'npx tsx scripts/create-admin.ts' para crear uno nuevo.")
      }
      return
    }

    console.log(`✅ Usuario encontrado:`)
    console.log("   👤 Nombre:", oldUser.nomprop, oldUser.apeprop)
    console.log("   🎭 Rol:", oldUser.rol)
    console.log("   📧 Email actual:", oldUser.emailprop)

    // Verificar que no exista ya un usuario con el nuevo email
    const existingNewEmail = await prisma.usuario.findFirst({
      where: { 
        emailprop: NEW_EMAIL,
        idprop: { not: oldUser.idprop }
      }
    })

    if (existingNewEmail) {
      console.log(`\n❌ Error: Ya existe otro usuario con el email ${NEW_EMAIL}`)
      console.log("   No se puede actualizar porque causaría un duplicado.")
      return
    }

    // Actualizar el email
    console.log(`\n🔄 Actualizando email de ${OLD_EMAIL} a ${NEW_EMAIL}...`)
    
    const updatedUser = await prisma.usuario.update({
      where: { idprop: oldUser.idprop },
      data: { emailprop: NEW_EMAIL }
    })

    console.log("\n" + "=".repeat(50))
    console.log("✅ EMAIL ACTUALIZADO EXITOSAMENTE")
    console.log("=".repeat(50))
    console.log("📧 Email anterior:", OLD_EMAIL)
    console.log("📧 Email nuevo:", updatedUser.emailprop)
    console.log("👤 Usuario:", updatedUser.nomprop, updatedUser.apeprop)
    console.log("🎭 Rol:", updatedUser.rol)
    console.log("=".repeat(50))
    console.log("\n🔐 Ahora puedes hacer login con:")
    console.log("   Email: admin@kontrak.com")
    console.log("   Password: (la misma contraseña que tenías)")

  } catch (error) {
    console.error("\n❌ Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
