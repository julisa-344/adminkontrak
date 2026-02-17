/**
 * Acciones del servidor para gestión de categorías
 */

'use server'

import { revalidatePath } from 'next/cache'
import { prisma, setAuditContext, auditCreate, auditUpdate, auditDelete } from '@/lib/prisma'
import { softDeleteCategoria, notDeleted } from '@/lib/soft-delete'
import { auth } from '@/auth'

export interface CategoriaFormData {
  nombre: string
  descripcion?: string
  activa: boolean
}

/**
 * Obtiene todas las categorías no eliminadas
 */
export async function getCategorias() {
  try {
    const categorias = await prisma.categoria.findMany({
      where: notDeleted,
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { vehiculos: { where: notDeleted } }
        }
      }
    })
    return categorias
  } catch (error) {
    console.error('Error al obtener categorías:', error)
    return []
  }
}

/**
 * Obtiene una categoría por ID
 */
export async function getCategoriaById(id: number) {
  try {
    const categoria = await prisma.categoria.findUnique({
      where: { 
        id,
        deleted_at: null
      },
      include: {
        vehiculos: { where: notDeleted },
        created_by_user: {
          select: { nomprop: true, apeprop: true, emailprop: true }
        },
        updated_by_user: {
          select: { nomprop: true, apeprop: true, emailprop: true }
        }
      }
    })
    return categoria
  } catch (error) {
    console.error('Error al obtener categoría:', error)
    return null
  }
}

/**
 * Crea una nueva categoría
 */
export async function createCategoria(formData: CategoriaFormData) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('No autorizado')
    }

    // Configurar contexto de auditoría
    setAuditContext({
      userId: parseInt(session.user.id),
      userEmail: session.user.email || '',
      comment: 'Creación de nueva categoría'
    })

    // Validar que el nombre no esté vacío
    if (!formData.nombre || formData.nombre.trim().length === 0) {
      throw new Error('El nombre de la categoría es obligatorio')
    }

    // Validar longitud máxima
    if (formData.nombre.length > 100) {
      throw new Error('El nombre no puede exceder 100 caracteres')
    }

    // Validar que el nombre no exista
    const existingCategoria = await prisma.categoria.findFirst({
      where: { 
        nombre: formData.nombre.trim(),
        deleted_at: null
      }
    })

    if (existingCategoria) {
      throw new Error('Ya existe una categoría con ese nombre')
    }

    // Crear la categoría
    const categoria = await prisma.categoria.create({
      data: {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || null,
        activa: formData.activa,
        created_by: parseInt(session.user.id),
        updated_by: parseInt(session.user.id)
      }
    })

    // Auditar la creación
    await auditCreate('categoria', categoria.id, categoria, `Nueva categoría creada: ${categoria.nombre}`)

    revalidatePath('/dashboard/categorias')
    revalidatePath('/dashboard/vehiculos')
    revalidatePath('/dashboard/vehiculos/nuevo')
    
    return { success: true, categoria }
  } catch (error) {
    console.error('Error al crear categoría:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Actualiza una categoría existente
 */
export async function updateCategoria(id: number, formData: CategoriaFormData) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('No autorizado')
    }

    // Configurar contexto de auditoría
    setAuditContext({
      userId: parseInt(session.user.id),
      userEmail: session.user.email || '',
      comment: 'Actualización de categoría'
    })

    // Obtener categoría actual
    const categoriaActual = await prisma.categoria.findUnique({
      where: { id }
    })

    if (!categoriaActual) {
      throw new Error('Categoría no encontrada')
    }

    if (categoriaActual.deleted_at) {
      throw new Error('No se puede editar una categoría eliminada')
    }

    // Validar que el nombre no esté vacío
    if (!formData.nombre || formData.nombre.trim().length === 0) {
      throw new Error('El nombre de la categoría es obligatorio')
    }

    // Validar longitud máxima
    if (formData.nombre.length > 100) {
      throw new Error('El nombre no puede exceder 100 caracteres')
    }

    // Validar nombre único (excluyendo la categoría actual)
    if (formData.nombre.trim() !== categoriaActual.nombre) {
      const existingCategoria = await prisma.categoria.findFirst({
        where: { 
          nombre: formData.nombre.trim(),
          id: { not: id },
          deleted_at: null
        }
      })

      if (existingCategoria) {
        throw new Error('Ya existe una categoría con ese nombre')
      }
    }

    // Actualizar la categoría
    const categoriaActualizada = await prisma.categoria.update({
      where: { id },
      data: {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || null,
        activa: formData.activa,
        updated_by: parseInt(session.user.id)
      }
    })

    // Auditar la actualización
    await auditUpdate('categoria', id, categoriaActual, categoriaActualizada, `Categoría actualizada: ${categoriaActualizada.nombre}`)

    revalidatePath('/dashboard/categorias')
    revalidatePath('/dashboard/vehiculos')
    
    return { success: true, categoria: categoriaActualizada }
  } catch (error) {
    console.error('Error al actualizar categoría:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Elimina una categoría (soft delete)
 */
export async function deleteCategoria(id: number, reason?: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('No autorizado')
    }

    // Obtener categoría con vehículos asociados (no eliminados)
    const categoria = await prisma.categoria.findUnique({
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

    if (!categoria) {
      throw new Error('Categoría no encontrada')
    }

    // Verificar que no tenga vehículos asociados
    if (categoria._count.vehiculos > 0) {
      throw new Error(`No se puede eliminar la categoría "${categoria.nombre}" porque tiene ${categoria._count.vehiculos} vehículo(s) asociado(s)`)
    }

    // Realizar soft delete
    const result = await softDeleteCategoria(
      id, 
      reason || "Eliminada desde panel administrativo"
    )

    if (!result.success) {
      throw new Error(result.error || 'Error al eliminar categoría')
    }

    revalidatePath('/dashboard/categorias')
    revalidatePath('/dashboard/vehiculos')
    
    return { success: true }
  } catch (error) {
    console.error('Error al eliminar categoría:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Obtiene categorías activas para selects/dropdowns
 */
export async function getCategoriasActivas() {
  try {
    const categorias = await prisma.categoria.findMany({
      where: { 
        activa: true,
        deleted_at: null
      },
      select: {
        id: true,
        nombre: true
      },
      orderBy: { nombre: 'asc' }
    })
    return categorias
  } catch (error) {
    console.error('Error al obtener categorías activas:', error)
    return []
  }
}

/**
 * Crea una categoría rápida (para uso desde modales en otros formularios)
 * Versión simplificada de createCategoria
 */
export async function createCategoriaRapida(nombre: string) {
  return createCategoria({
    nombre,
    descripcion: undefined,
    activa: true
  })
}
