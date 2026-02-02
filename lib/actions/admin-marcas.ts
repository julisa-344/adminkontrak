/**
 * Acciones del servidor para gestión de marcas
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma, setAuditContext, auditCreate, auditUpdate, auditDelete } from '@/lib/prisma'
import { uploadImage, deleteImage, validateImageFile, isVercelBlobUrl } from '@/lib/blob-storage'
import { softDeleteMarca, notDeleted } from '@/lib/soft-delete'
import { auth } from '@/auth'

export interface MarcaFormData {
  nombre: string
  descripcion?: string
  activa: boolean
}

/**
 * Obtiene todas las marcas
 */
export async function getMarcas() {
  try {
    const marcas = await prisma.marca.findMany({
      where: notDeleted,
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { vehiculos: { where: notDeleted } }
        }
      }
    })
    return marcas
  } catch (error) {
    console.error('Error al obtener marcas:', error)
    return []
  }
}

/**
 * Obtiene una marca por ID
 */
export async function getMarcaById(id: number) {
  try {
    const marca = await prisma.marca.findUnique({
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
    return marca
  } catch (error) {
    console.error('Error al obtener marca:', error)
    return null
  }
}

/**
 * Crea una nueva marca
 */
export async function createMarca(
  formData: MarcaFormData,
  logoFile?: File
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('No autorizado')
    }

    // Configurar contexto de auditoría
    setAuditContext({
      userId: parseInt(session.user.id),
      userEmail: session.user.email || '',
      comment: 'Creación de nueva marca'
    })

    // Validar que el nombre no exista
    const existingMarca = await prisma.marca.findFirst({
      where: { 
        nombre: formData.nombre,
        deleted_at: null
      }
    })

    if (existingMarca) {
      throw new Error('Ya existe una marca con ese nombre')
    }

    let logoUrl: string | null = null

    // Subir logo si se proporcionó
    if (logoFile) {
      const validation = validateImageFile(logoFile)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      const uploadResult = await uploadImage(logoFile, 'marcas')
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Error al subir imagen')
      }

      logoUrl = uploadResult.url!
    }

    // Crear la marca
    const marca = await prisma.marca.create({
      data: {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        logo_url: logoUrl,
        activa: formData.activa,
        created_by: parseInt(session.user.id),
        updated_by: parseInt(session.user.id)
      }
    })

    // Auditar la creación
    await auditCreate('marca', marca.id, marca, `Nueva marca creada: ${marca.nombre}`)

    revalidatePath('/dashboard/marcas')
    return { success: true, marca }
  } catch (error) {
    console.error('Error al crear marca:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Actualiza una marca existente
 */
export async function updateMarca(
  id: number,
  formData: MarcaFormData,
  logoFile?: File | null
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('No autorizado')
    }

    // Configurar contexto de auditoría
    setAuditContext({
      userId: parseInt(session.user.id),
      userEmail: session.user.email || '',
      comment: 'Actualización de marca'
    })

    // Obtener marca actual
    const marcaActual = await prisma.marca.findUnique({
      where: { id }
    })

    if (!marcaActual) {
      throw new Error('Marca no encontrada')
    }

    // Validar nombre único (excluyendo la marca actual)
    if (formData.nombre !== marcaActual.nombre) {
      const existingMarca = await prisma.marca.findFirst({
        where: { 
          nombre: formData.nombre,
          id: { not: id },
          deleted_at: null
        }
      })

      if (existingMarca) {
        throw new Error('Ya existe una marca con ese nombre')
      }
    }

    let logoUrl = marcaActual.logo_url

    // Manejar actualización de logo
    if (logoFile) {
      const validation = validateImageFile(logoFile)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Eliminar logo anterior si existe y es de Vercel Blob
      if (marcaActual.logo_url && isVercelBlobUrl(marcaActual.logo_url)) {
        await deleteImage(marcaActual.logo_url)
      }

      // Subir nuevo logo a Vercel Blob
      const uploadResult = await uploadImage(logoFile, 'marcas')
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Error al subir imagen')
      }

      logoUrl = uploadResult.url!
    } else if (logoFile === null) {
      // Eliminar logo existente
      if (marcaActual.logo_url && isVercelBlobUrl(marcaActual.logo_url)) {
        await deleteImage(marcaActual.logo_url)
      }
      logoUrl = null
    }

    // Actualizar la marca
    const marcaActualizada = await prisma.marca.update({
      where: { id },
      data: {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        logo_url: logoUrl,
        activa: formData.activa,
        updated_by: parseInt(session.user.id)
      }
    })

    // Auditar la actualización
    await auditUpdate('marca', id, marcaActual, marcaActualizada, `Marca actualizada: ${marcaActualizada.nombre}`)

    revalidatePath('/dashboard/marcas')
    return { success: true, marca: marcaActualizada }
  } catch (error) {
    console.error('Error al actualizar marca:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Elimina una marca (soft delete)
 */
export async function deleteMarca(id: number, reason?: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('No autorizado')
    }

    // Obtener marca con vehículos asociados (no eliminados)
    const marca = await prisma.marca.findUnique({
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

    if (!marca) {
      throw new Error('Marca no encontrada')
    }

    // Verificar que no tenga vehículos asociados
    if (marca._count.vehiculos > 0) {
      throw new Error(`No se puede eliminar la marca "${marca.nombre}" porque tiene ${marca._count.vehiculos} vehículo(s) asociado(s)`)
    }

    // Realizar soft delete
    const result = await softDeleteMarca(
      id, 
      reason || "Eliminada desde panel administrativo"
    )

    if (!result.success) {
      throw new Error(result.error || 'Error al eliminar marca')
    }

    revalidatePath('/dashboard/marcas')
    return { success: true }
  } catch (error) {
    console.error('Error al eliminar marca:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Obtiene marcas activas para selects
 */
export async function getMarcasActivas() {
  try {
    const marcas = await prisma.marca.findMany({
      where: { 
        activa: true,
        deleted_at: null
      },
      select: {
        id: true,
        nombre: true,
        logo_url: true
      },
      orderBy: { nombre: 'asc' }
    })
    return marcas
  } catch (error) {
    console.error('Error al obtener marcas activas:', error)
    return []
  }
}