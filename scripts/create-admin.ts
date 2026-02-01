/**
 * Script para crear un usuario administrador
 * Uso: npx tsx scripts/create-admin.ts
 */

import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

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
    // Verificar conexión a la BD
    console.log("🔍 Verificando conexión a la base de datos...")
    await prisma.$connect()
    console.log("✅ Conexión exitosa")

    // Buscar si ya existe un usuario admin
    const existingAdmin = await prisma.usuario.findFirst({
      where: {
        OR: [
          { rol: "administrador" },
          { emailprop: "admin@autorent.com" }
        ]
      }
    })

    if (existingAdmin) {
      console.log("✅ Ya existe un usuario administrador:")
      console.log("📧 Email:", existingAdmin.emailprop)
      console.log("👤 Nombre:", existingAdmin.nomprop, existingAdmin.apeprop)
      console.log("🎭 Rol:", existingAdmin.rol)
      
      // Si no tiene el rol correcto, lo actualizamos
      if (existingAdmin.rol !== "administrador") {
        await prisma.usuario.update({
          where: { idprop: existingAdmin.idprop },
          data: { rol: "administrador" }
        })
        console.log("🔄 Rol actualizado a 'administrador'")
      }
      
      return
    }

    // Crear contraseña hasheada que cumpla la política
    const password = "Admin12345"  // Sin símbolos, solo alfanumérico con mayúscula, minúscula y números
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear usuario admin
    const admin = await prisma.usuario.create({
      data: {
        nomprop: "Administrador",
        apeprop: "Sistema", 
        emailprop: "admin@autorent.com",
        password: hashedPassword,
        rol: "administrador",
        estprop: true,
        dniprop: "00000000",
        telefonoprop: "999999999"
      }
    })

    console.log("✅ Usuario administrador creado exitosamente:")
    console.log("📧 Email:", admin.emailprop)
    console.log("🔑 Contraseña:", password)
    console.log("🔒 Por favor, cambia la contraseña después del primer login")

  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()