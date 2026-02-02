/**
 * Utilidades para manejo de Soft Delete
 */

import { prisma, setAuditContext, auditDelete } from './prisma'
import { auth } from '@/auth'

/**
 * Configuración de contexto de auditoría para operaciones de soft delete
 */
async function setupAuditContext(comment: string) {
  const session = await auth()
  if (session?.user?.id) {
    setAuditContext({
      userId: parseInt(session.user.id),
      userEmail: session.user.email || '',
      comment
    })
  }
}

/**
 * Soft delete para vehículos
 */
export async function softDeleteVehiculo(id: number, reason?: string) {
  try {
    await setupAuditContext(`Eliminación lógica de vehículo: ${reason || 'Sin razón especificada'}`)

    // Obtener datos antes del soft delete
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { idveh: id }
    })

    if (!vehiculo) {
      throw new Error('Vehículo no encontrado')
    }

    if (vehiculo.deleted_at) {
      throw new Error('El vehículo ya está eliminado')
    }

    const session = await auth()
    const now = new Date()

    // Marcar como eliminado
    const vehiculoEliminado = await prisma.vehiculo.update({
      where: { idveh: id },
      data: {
        deleted_at: now,
        deleted_by: session?.user?.id ? parseInt(session.user.id) : null
      }
    })

    // Registrar en la tabla de vehículos eliminados si existe
    try {
      await prisma.vehiculos_eliminados.create({
        data: {
          idveh: id,
          idprop: vehiculo.idprop || 0,
          razon: reason || 'Eliminación desde panel administrativo',
          fecharegistro: now
        }
      })
    } catch (error) {
      console.log('Nota: No se pudo registrar en vehiculos_eliminados:', error)
    }

    // Auditar la eliminación
    await auditDelete('vehiculo', id, vehiculo, `Vehículo marcado como eliminado: ${reason || 'Sin razón'}`)

    return { success: true, vehiculo: vehiculoEliminado }
  } catch (error) {
    console.error('Error en soft delete de vehículo:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Soft delete para marcas
 */
export async function softDeleteMarca(id: number, reason?: string) {
  try {
    await setupAuditContext(`Eliminación lógica de marca: ${reason || 'Sin razón especificada'}`)

    // Verificar que no tenga vehículos activos asociados
    const vehiculosActivos = await prisma.vehiculo.count({
      where: { 
        marca_id: id,
        deleted_at: null
      }
    })

    if (vehiculosActivos > 0) {
      throw new Error(`No se puede eliminar la marca porque tiene ${vehiculosActivos} vehículo(s) activo(s) asociado(s)`)
    }

    // Obtener datos antes del soft delete
    const marca = await prisma.marca.findUnique({
      where: { id }
    })

    if (!marca) {
      throw new Error('Marca no encontrada')
    }

    if (marca.deleted_at) {
      throw new Error('La marca ya está eliminada')
    }

    const session = await auth()
    
    // Marcar como eliminada
    const marcaEliminada = await prisma.marca.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: session?.user?.id ? parseInt(session.user.id) : null
      }
    })

    // Auditar la eliminación
    await auditDelete('marca', id, marca, `Marca marcada como eliminada: ${reason || 'Sin razón'}`)

    return { success: true, marca: marcaEliminada }
  } catch (error) {
    console.error('Error en soft delete de marca:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Soft delete para usuarios
 */
export async function softDeleteUsuario(id: number, reason?: string) {
  try {
    await setupAuditContext(`Eliminación lógica de usuario: ${reason || 'Sin razón especificada'}`)

    // Verificar que no tenga reservas activas
    const reservasActivas = await prisma.reserva.count({
      where: { 
        idcli: id,
        estado: { in: ['PENDIENTE', 'CONFIRMADA', 'EN_USO'] },
        deleted_at: null
      }
    })

    if (reservasActivas > 0) {
      throw new Error(`No se puede eliminar el usuario porque tiene ${reservasActivas} reserva(s) activa(s)`)
    }

    // Obtener datos antes del soft delete
    const usuario = await prisma.usuario.findUnique({
      where: { idprop: id }
    })

    if (!usuario) {
      throw new Error('Usuario no encontrado')
    }

    if (usuario.deleted_at) {
      throw new Error('El usuario ya está eliminado')
    }

    const session = await auth()
    
    // Marcar como eliminado
    const usuarioEliminado = await prisma.usuario.update({
      where: { idprop: id },
      data: {
        deleted_at: new Date(),
        deleted_by: session?.user?.id ? parseInt(session.user.id) : null,
        estprop: false // También desactivar
      }
    })

    // Auditar la eliminación
    await auditDelete('usuario', id, usuario, `Usuario marcado como eliminado: ${reason || 'Sin razón'}`)

    return { success: true, usuario: usuarioEliminado }
  } catch (error) {
    console.error('Error en soft delete de usuario:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Soft delete para reservas
 */
export async function softDeleteReserva(id: number, reason?: string) {
  try {
    await setupAuditContext(`Eliminación lógica de reserva: ${reason || 'Sin razón especificada'}`)

    // Obtener datos antes del soft delete
    const reserva = await prisma.reserva.findUnique({
      where: { idres: id }
    })

    if (!reserva) {
      throw new Error('Reserva no encontrada')
    }

    if (reserva.deleted_at) {
      throw new Error('La reserva ya está eliminada')
    }

    const session = await auth()
    
    // Marcar como eliminada
    const reservaEliminada = await prisma.reserva.update({
      where: { idres: id },
      data: {
        deleted_at: new Date(),
        deleted_by: session?.user?.id ? parseInt(session.user.id) : null
      }
    })

    // Auditar la eliminación
    await auditDelete('reserva', id, reserva, `Reserva marcada como eliminada: ${reason || 'Sin razón'}`)

    return { success: true, reserva: reservaEliminada }
  } catch (error) {
    console.error('Error en soft delete de reserva:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Restaurar vehículo soft-deleted
 */
export async function restoreVehiculo(id: number) {
  try {
    await setupAuditContext('Restauración de vehículo eliminado')

    const vehiculo = await prisma.vehiculo.findUnique({
      where: { idveh: id }
    })

    if (!vehiculo) {
      throw new Error('Vehículo no encontrado')
    }

    if (!vehiculo.deleted_at) {
      throw new Error('El vehículo no está eliminado')
    }

    const vehiculoRestaurado = await prisma.vehiculo.update({
      where: { idveh: id },
      data: {
        deleted_at: null,
        deleted_by: null
      }
    })

    return { success: true, vehiculo: vehiculoRestaurado }
  } catch (error) {
    console.error('Error al restaurar vehículo:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Obtener condiciones WHERE para filtrar elementos no eliminados
 */
export const notDeleted = { deleted_at: null }

/**
 * Obtener condiciones WHERE para filtrar solo elementos eliminados
 */
export const onlyDeleted = { deleted_at: { not: null } }