/**
 * @deprecated Este archivo ya no se usa. Las imágenes ahora se manejan con Vercel Blob Storage.
 * Ver: lib/blob-storage.ts
 * 
 * Este archivo se mantiene temporalmente por si hay URLs de Cloudinary existentes en la BD.
 * Puede eliminarse después de migrar todas las imágenes.
 */

// Las funciones de Cloudinary ya no están disponibles
// import { v2 as cloudinary } from 'cloudinary'

export interface UploadResult {
  success: boolean
  url?: string
  publicId?: string
  error?: string
}

/**
 * @deprecated Usar blob-storage.ts -> uploadImage
 */
export async function uploadImage(): Promise<UploadResult> {
  return {
    success: false,
    error: 'Cloudinary está deprecado. Usar Vercel Blob Storage.'
  }
}

/**
 * @deprecated Usar blob-storage.ts -> deleteImage
 */
export async function deleteImage(): Promise<boolean> {
  console.warn('Cloudinary está deprecado. Usar Vercel Blob Storage.')
  return false
}

/**
 * @deprecated Ya no es necesario con Vercel Blob
 */
export function extractPublicId(url: string): string | null {
  try {
    const match = url.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp)$/i)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/**
 * @deprecated Usar blob-storage.ts -> validateImageFile
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  const maxSize = 5 * 1024 * 1024

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
