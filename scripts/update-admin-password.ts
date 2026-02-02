/**
 * Script para actualizar la contraseña del administrador existente
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
  try {
    // Nueva contraseña que cumple la política
    const newPassword = "Admin1357"  // Sin secuencias consecutivas, con mayúscula, minúscula y números
    
    console.log("🔍 Validando contraseña contra la política...")
    const policy = validateAdminPassword(newPassword)
    
    if (!policy.valid) {
      console.error("❌ La contraseña no cumple la política:", policy.error)
      return
    }
    
    console.log("✅ Contraseña válida según la política")
    
    // Buscar el usuario admin
    const admin = await prisma.usuario.findUnique({
      where: {
        emailprop: "admin@kontrak.com"
      }
    })

    if (!admin) {
      console.error("❌ No se encontró usuario admin con email admin@kontrak.com")
      return
    }

    console.log("👤 Usuario admin encontrado:", admin.nomprop, admin.apeprop)

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Actualizar la contraseña
    await prisma.usuario.update({
      where: { 
        emailprop: "admin@kontrak.com" 
      },
      data: { 
        password: hashedPassword,
        rol: "administrador"  // Asegurar que tiene el rol correcto
      }
    })

    console.log("✅ Contraseña actualizada exitosamente!")
    console.log("📧 Email:", admin.emailprop)
    console.log("🔑 Nueva contraseña:", newPassword)
    console.log("🎭 Rol:", "administrador")

  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()