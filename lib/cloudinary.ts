/**
 * Utilidades para manejo de imágenes con Cloudinary
 */

import { v2 as cloudinary } from 'cloudinary'

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Verificar si Cloudinary está configurado
const isCloudinaryConfigured = () => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  
  return cloudName && cloudName !== 'demo' && apiKey && apiKey !== 'your-api-key' && apiSecret && apiSecret !== 'your-api-secret'
}

export interface UploadResult {
  success: boolean
  url?: string
  publicId?: string
  error?: string
}

/**
 * Sube una imagen a Cloudinary
 */
export async function uploadImage(
  file: File,
  folder: string = 'autorent/marcas'
): Promise<UploadResult> {
  try {
    // Verificar configuración de Cloudinary
    if (!isCloudinaryConfigured()) {
      return {
        success: false,
        error: 'Cloudinary no está configurado. Configura las variables de entorno NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.'
      }
    }

    // Convertir File a base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

    // Subir a Cloudinary
    const result = await cloudinary.uploader.upload(base64, {
      folder,
      resource_type: 'auto',
      quality: 'auto:good',
      format: 'webp', // Convertir a WebP para optimización
      transformation: [
        { width: 300, height: 300, crop: 'fit' }, // Redimensionar manteniendo aspecto
        { quality: 'auto:good' }
      ]
    })

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    }
  } catch (error) {
    console.error('Error al subir imagen a Cloudinary:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Elimina una imagen de Cloudinary
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return result.result === 'ok'
  } catch (error) {
    console.error('Error al eliminar imagen de Cloudinary:', error)
    return false
  }
}

/**
 * Extrae el public_id de una URL de Cloudinary
 */
export function extractPublicId(url: string): string | null {
  try {
    // Ejemplo URL: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/filename.ext
    const match = url.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp)$/i)
    return match ? match[1] : null
  } catch {
    return null
  }
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