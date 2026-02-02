/**
 * Utilidades para manejo de imágenes con Vercel Blob Storage
 */

import { put, del } from '@vercel/blob'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Valida si el archivo es una imagen válida
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de archivo no válido. Use JPG, PNG, GIF o WebP.'
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'El archivo es demasiado grande. Máximo 5MB.'
    }
  }

  return { valid: true }
}

/**
 * Genera un nombre único para el archivo
 */
function generateFileName(originalName: string, folder: string): string {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  return `${folder}/${timestamp}-${randomStr}.${extension}`
}

/**
 * Sube una imagen a Vercel Blob Storage
 */
export async function uploadImage(
  file: File,
  folder: string = 'vehiculos'
): Promise<UploadResult> {
  try {
    // Verificar que el token está configurado
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        success: false,
        error: 'Vercel Blob no está configurado. Configura la variable BLOB_READ_WRITE_TOKEN.'
      }
    }

    // Validar archivo
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    // Generar nombre único
    const fileName = generateFileName(file.name, folder)

    // Subir a Vercel Blob
    const blob = await put(fileName, file, {
      access: 'public',
      addRandomSuffix: false, // Ya generamos un nombre único
    })

    return {
      success: true,
      url: blob.url
    }
  } catch (error) {
    console.error('Error al subir imagen a Vercel Blob:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al subir imagen'
    }
  }
}

/**
 * Elimina una imagen de Vercel Blob Storage
 */
export async function deleteImage(url: string): Promise<boolean> {
  try {
    if (!url || !url.includes('blob.vercel-storage.com')) {
      // No es una URL de Vercel Blob, ignorar
      return true
    }

    await del(url)
    return true
  } catch (error) {
    console.error('Error al eliminar imagen de Vercel Blob:', error)
    return false
  }
}

/**
 * Verifica si una URL es de Vercel Blob
 */
export function isVercelBlobUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.includes('blob.vercel-storage.com')
}
