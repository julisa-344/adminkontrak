/**
 * Acciones del servidor para gestión de modelos de vehículos
 */

'use server'

import { revalidatePath } from 'next/cache'
import { prisma, setAuditContext, auditCreate, auditUpdate, auditDelete } from '@/lib/prisma'
import { softDeleteModelo, notDeleted } from '@/lib/soft-delete'
import { auth } from '@/auth'

export interface ModeloFormData {
  nombre: string
  descripcion?: string
  marca_id?: number | null
  activo: boolean
}

/**
 * Obtiene todos los modelos no eliminados
 */
export async function getModelos() {
  try {
    const modelos = await prisma.modelo.findMany({
      where: notDeleted,
      orderBy: [
        { marca: { nombre: 'asc' } },
        { nombre: 'asc' }
      ],
      include: {
        marca: {
          select: { id: true, nombre: true, logo_url: true }
        },
        _count: {
          select: { vehiculos: { where: notDeleted } }
        }
      }
    })
    return modelos
  } catch (error) {
    console.error('Error al obtener modelos:', error)
    return []
  }
}

/**
 * Obtiene un modelo por ID
 */
export async function getModeloById(id: number) {
  try {
    const modelo = await prisma.modelo.findUnique({
      where: { 
        id,
        deleted_at: null
      },
      include: {
        marca: true,
        vehiculos: { where: notDeleted },
        created_by_user: {
          select: { nomprop: true, apeprop: true, emailprop: true }
        },
        updated_by_user: {
          select: { nomprop: true, apeprop: true, emailprop: true }
        }
      }
    })
    return modelo
  } catch (error) {
    console.error('Error al obtener modelo:', error)
    return null
  }
}

/**
 * Crea un nuevo modelo
 */
export async function createModelo(formData: ModeloFormData) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('No autorizado')
    }

    // Configurar contexto de auditoría
    setAuditContext({
      userId: parseInt(session.user.id),
      userEmail: session.user.email || '',
      comment: 'Creación de nuevo modelo'
    })

    // Validar que el nombre no esté vacío
    if (!formData.nombre || formData.nombre.trim().length === 0) {
      throw new Error('El nombre del modelo es obligatorio')
    }

    // Validar longitud máxima
    if (formData.nombre.length > 100) {
      throw new Error('El nombre no puede exceder 100 caracteres')
    }

    // Validar que el nombre no exista para la misma marca
    const existingModelo = await prisma.modelo.findFirst({
      where: { 
        nombre: formData.nombre.trim(),
        marca_id: formData.marca_id || null,
        deleted_at: null
      }
    })

    if (existingModelo) {
      throw new Error('Ya existe un modelo con ese nombre para esta marca')
    }

    // Verificar que la marca existe si se proporciona
    if (formData.marca_id) {
      const marca = await prisma.marca.findUnique({
        where: { id: formData.marca_id, deleted_at: null }
      })
      if (!marca) {
        throw new Error('La marca seleccionada no existe')
      }
    }

    // Crear el modelo
    const modelo = await prisma.modelo.create({
      data: {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || null,
        marca_id: formData.marca_id || null,
        activo: formData.activo,
        created_by: parseInt(session.user.id),
        updated_by: parseInt(session.user.id)
      },
      include: {
        marca: true
      }
    })

    // Auditar la creación
    await auditCreate('modelo', modelo.id, modelo, `Nuevo modelo creado: ${modelo.nombre}`)

    revalidatePath('/dashboard/modelos')
    revalidatePath('/dashboard/vehiculos')
    revalidatePath('/dashboard/vehiculos/nuevo')
    
    return { success: true, modelo }
  } catch (error) {
    console.error('Error al crear modelo:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Actualiza un modelo existente
 */
export async function updateModelo(id: number, formData: ModeloFormData) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('No autorizado')
    }

    // Configurar contexto de auditoría
    setAuditContext({
      userId: parseInt(session.user.id),
      userEmail: session.user.email || '',
      comment: 'Actualización de modelo'
    })

    // Obtener modelo actual
    const modeloActual = await prisma.modelo.findUnique({
      where: { id }
    })

    if (!modeloActual) {
      throw new Error('Modelo no encontrado')
    }

    if (modeloActual.deleted_at) {
      throw new Error('No se puede editar un modelo eliminado')
    }

    // Validar que el nombre no esté vacío
    if (!formData.nombre || formData.nombre.trim().length === 0) {
      throw new Error('El nombre del modelo es obligatorio')
    }

    // Validar longitud máxima
    if (formData.nombre.length > 100) {
      throw new Error('El nombre no puede exceder 100 caracteres')
    }

    // Validar nombre único para la marca (excluyendo el modelo actual)
    const nombreCambiado = formData.nombre.trim() !== modeloActual.nombre
    const marcaCambiada = formData.marca_id !== modeloActual.marca_id

    if (nombreCambiado || marcaCambiada) {
      const existingModelo = await prisma.modelo.findFirst({
        where: { 
          nombre: formData.nombre.trim(),
          marca_id: formData.marca_id || null,
          id: { not: id },
          deleted_at: null
        }
      })

      if (existingModelo) {
        throw new Error('Ya existe un modelo con ese nombre para esta marca')
      }
    }

    // Verificar que la marca existe si se proporciona
    if (formData.marca_id) {
      const marca = await prisma.marca.findUnique({
        where: { id: formData.marca_id, deleted_at: null }
      })
      if (!marca) {
        throw new Error('La marca seleccionada no existe')
      }
    }

    // Actualizar el modelo
    const modeloActualizado = await prisma.modelo.update({
      where: { id },
      data: {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || null,
        marca_id: formData.marca_id || null,
        activo: formData.activo,
        updated_by: parseInt(session.user.id)
      },
      include: {
        marca: true
      }
    })

    // Auditar la actualización
    await auditUpdate('modelo', id, modeloActual, modeloActualizado, `Modelo actualizado: ${modeloActualizado.nombre}`)

    revalidatePath('/dashboard/modelos')
    revalidatePath('/dashboard/vehiculos')
    
    return { success: true, modelo: modeloActualizado }
  } catch (error) {
    console.error('Error al actualizar modelo:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Elimina un modelo (soft delete)
 */
export async function deleteModelo(id: number, reason?: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('No autorizado')
    }

    // Obtener modelo con vehículos asociados (no eliminados)
    const modelo = await prisma.modelo.findUnique({
      where: { 
        id,
        deleted_at: null
      },
      include: {
        _count: {
          select: { vehiculos: { where: notDeleted } }
        }
      }
    })

    if (!modelo) {
      throw new Error('Modelo no encontrado')
    }

    // Verificar que no tenga vehículos asociados
    if (modelo._count.vehiculos > 0) {
      throw new Error(`No se puede eliminar el modelo "${modelo.nombre}" porque tiene ${modelo._count.vehiculos} vehículo(s) asociado(s)`)
    }

    // Realizar soft delete
    const result = await softDeleteModelo(
      id, 
      reason || "Eliminado desde panel administrativo"
    )

    if (!result.success) {
      throw new Error(result.error || 'Error al eliminar modelo')
    }

    revalidatePath('/dashboard/modelos')
    revalidatePath('/dashboard/vehiculos')
    
    return { success: true }
  } catch (error) {
    console.error('Error al eliminar modelo:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Obtiene modelos activos para selects/dropdowns
 */
export async function getModelosActivos() {
  try {
    const modelos = await prisma.modelo.findMany({
      where: { 
        activo: true,
        deleted_at: null
      },
      select: {
        id: true,
        nombre: true,
        marca_id: true,
        marca: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: [
        { marca: { nombre: 'asc' } },
        { nombre: 'asc' }
      ]
    })
    return modelos
  } catch (error) {
    console.error('Error al obtener modelos activos:', error)
    return []
  }
}

/**
 * Obtiene modelos activos filtrados por marca
 */
export async function getModelosPorMarca(marcaId: number) {
  try {
    const modelos = await prisma.modelo.findMany({
      where: { 
        activo: true,
        deleted_at: null,
        marca_id: marcaId
      },
      select: {
        id: true,
        nombre: true,
        marca_id: true
      },
      orderBy: { nombre: 'asc' }
    })
    return modelos
  } catch (error) {
    console.error('Error al obtener modelos por marca:', error)
    return []
  }
}

/**
 * Crea un modelo rápido (para uso desde modales en otros formularios)
 * Versión simplificada de createModelo
 */
export async function createModeloRapido(nombre: string, marcaId?: number) {
  return createModelo({
    nombre,
    descripcion: undefined,
    marca_id: marcaId || null,
    activo: true
  })
}
