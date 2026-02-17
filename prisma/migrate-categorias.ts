/**
 * Script de migración para convertir categorías de texto a la nueva tabla categoria
 * 
 * Este script:
 * 1. Extrae todas las categorías únicas del campo 'categoria' de la tabla vehiculo
 * 2. Crea registros en la nueva tabla 'categoria'
 * 3. Actualiza los vehículos con el categoria_id correspondiente
 * 
 * Ejecutar con: npx ts-node prisma/migrate-categorias.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateCategories() {
  console.log('Iniciando migración de categorías...\n')

  try {
    // 1. Obtener todas las categorías únicas de vehículos
    const vehiculosConCategoria = await prisma.vehiculo.findMany({
      where: {
        categoria: { not: null },
        deleted_at: null
      },
      select: {
        categoria: true
      },
      distinct: ['categoria']
    })

    const categoriasUnicas = vehiculosConCategoria
      .map(v => v.categoria)
      .filter((c): c is string => c !== null && c.trim() !== '')
      .map(c => c.trim())

    console.log(`Encontradas ${categoriasUnicas.length} categorías únicas:`)
    categoriasUnicas.forEach(c => console.log(`  - ${c}`))
    console.log('')

    if (categoriasUnicas.length === 0) {
      console.log('No hay categorías para migrar.')
      return
    }

    // 2. Crear las categorías en la nueva tabla
    let creadas = 0
    let existentes = 0

    for (const nombreCategoria of categoriasUnicas) {
      // Verificar si ya existe
      const existente = await prisma.categoria.findFirst({
        where: {
          nombre: nombreCategoria,
          deleted_at: null
        }
      })

      if (existente) {
        console.log(`  [EXISTE] ${nombreCategoria} (ID: ${existente.id})`)
        existentes++
        continue
      }

      // Crear nueva categoría
      const nueva = await prisma.categoria.create({
        data: {
          nombre: nombreCategoria,
          descripcion: `Categoría migrada automáticamente desde campo texto`,
          activa: true
        }
      })

      console.log(`  [CREADA] ${nombreCategoria} (ID: ${nueva.id})`)
      creadas++
    }

    console.log(`\nResumen de creación: ${creadas} nuevas, ${existentes} existentes\n`)

    // 3. Actualizar vehículos con el categoria_id correspondiente
    console.log('Actualizando vehículos con categoria_id...')
    
    let actualizados = 0
    const vehiculos = await prisma.vehiculo.findMany({
      where: {
        categoria: { not: null },
        categoria_id: null,
        deleted_at: null
      }
    })

    for (const vehiculo of vehiculos) {
      if (!vehiculo.categoria) continue

      const categoria = await prisma.categoria.findFirst({
        where: {
          nombre: vehiculo.categoria.trim(),
          deleted_at: null
        }
      })

      if (categoria) {
        await prisma.vehiculo.update({
          where: { idveh: vehiculo.idveh },
          data: { categoria_id: categoria.id }
        })
        actualizados++
      }
    }

    console.log(`\nVehículos actualizados: ${actualizados}`)
    console.log('\nMigración completada exitosamente!')

  } catch (error) {
    console.error('Error durante la migración:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar migración
migrateCategories()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
