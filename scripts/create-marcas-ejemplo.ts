/**
 * Script para crear marcas de ejemplo
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
    console.log("🏭 Creando marcas de ejemplo...")

    // Obtener usuario admin para asignar como creador
    const admin = await prisma.usuario.findFirst({
      where: { rol: "administrador" }
    })

    if (!admin) {
      console.log("❌ No se encontró usuario administrador")
      return
    }

    const marcasEjemplo = [
      {
        nombre: "Caterpillar",
        descripcion: "Líder mundial en maquinaria de construcción, minería y equipos industriales.",
        activa: true
      },
      {
        nombre: "John Deere",
        descripcion: "Especialista en maquinaria agrícola y equipos de construcción.",
        activa: true
      },
      {
        nombre: "Komatsu",
        descripcion: "Fabricante japonés de equipos de construcción y minería.",
        activa: true
      },
      {
        nombre: "Bobcat",
        descripcion: "Especialista en equipos compactos para construcción y paisajismo.",
        activa: true
      },
      {
        nombre: "Case",
        descripcion: "Fabricante de equipos de construcción y maquinaria agrícola.",
        activa: true
      },
      {
        nombre: "Hitachi",
        descripcion: "Fabricante de excavadoras y equipos de construcción pesada.",
        activa: true
      },
      {
        nombre: "Volvo",
        descripcion: "Equipos de construcción y maquinaria pesada de alta calidad.",
        activa: true
      },
      {
        nombre: "JCB",
        descripcion: "Especialista británico en excavadoras y cargadoras.",
        activa: true
      },
      {
        nombre: "Liebherr",
        descripcion: "Fabricante alemán de grúas y equipos de construcción.",
        activa: true
      },
      {
        nombre: "Doosan",
        descripcion: "Fabricante surcoreano de excavadoras y equipos industriales.",
        activa: true
      }
    ]

    for (const marcaData of marcasEjemplo) {
      // Verificar si ya existe
      const existing = await prisma.marca.findUnique({
        where: { nombre: marcaData.nombre }
      })

      if (existing) {
        console.log(`⚠️ La marca ${marcaData.nombre} ya existe`)
        continue
      }

      // Crear la marca
      const marca = await prisma.marca.create({
        data: {
          ...marcaData,
          created_by: admin.idprop,
          updated_by: admin.idprop
        }
      })

      console.log(`✅ Creada marca: ${marca.nombre}`)
    }

    console.log("🎉 Marcas de ejemplo creadas exitosamente")

    // Mostrar estadísticas
    const totalMarcas = await prisma.marca.count()
    console.log(`📊 Total de marcas en la base de datos: ${totalMarcas}`)

  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()