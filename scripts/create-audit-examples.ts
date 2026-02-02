/**
 * Script para agregar algunos logs de auditoría de ejemplo
 */

import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { PrismaClient, AuditAction } from "@prisma/client"
import { auditLoginAttempt, setAuditContext, auditCreate, auditUpdate } from "../lib/audit-helpers"

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
    console.log("🔍 Creando registros de auditoría de ejemplo...")

    // Obtener usuario admin
    const admin = await prisma.usuario.findFirst({
      where: { rol: "administrador" }
    })

    if (!admin) {
      console.log("❌ No se encontró usuario administrador")
      return
    }

    console.log("👤 Usuario admin encontrado:", admin.emailprop)

    // Configurar contexto de auditoría
    setAuditContext({
      userId: admin.idprop,
      userEmail: admin.emailprop || "admin@kontrak.com",
      ipAddress: "127.0.0.1",
      userAgent: "Script de pruebas",
      comment: "Registro automático de prueba"
    })

    // Crear algunos logs de ejemplo
    await auditLoginAttempt(admin.emailprop || "admin@kontrak.com", true, "127.0.0.1", "Script de pruebas")
    
    // Simular algunos cambios en vehículos
    const vehiculos = await prisma.vehiculo.findMany({ take: 3 })
    
    for (const vehiculo of vehiculos) {
      await auditUpdate(
        "vehiculo",
        vehiculo.idveh,
        { ...vehiculo, precioalquilo: vehiculo.precioalquilo },
        { ...vehiculo, precioalquilo: (vehiculo.precioalquilo || 0) * 1.1 },
        "Actualización de precio por inflación"
      )
    }

    // Simular algunos cambios en reservas
    const reservas = await prisma.reserva.findMany({ take: 2 })
    
    for (const reserva of reservas) {
      await auditUpdate(
        "reserva",
        reserva.idres,
        { ...reserva, estado: reserva.estado },
        { ...reserva, estado: "CONFIRMADO" },
        "Confirmación automática de reserva"
      )
    }

    // Agregar algunos logs de login fallidos
    await auditLoginAttempt("hacker@evil.com", false, "192.168.1.100", "Malicious Bot")
    await auditLoginAttempt("admin@fake.com", false, "10.0.0.5", "Chrome/Bad Actor")

    console.log("✅ Se crearon logs de auditoría de ejemplo exitosamente")
    
    // Mostrar estadísticas
    const count = await prisma.audit_log.count()
    console.log(`📊 Total de registros de auditoría: ${count}`)

  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()