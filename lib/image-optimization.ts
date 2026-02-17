/**
 * Configuración y utilidades para optimización de imágenes en el cliente
 * Utiliza browser-image-compression para comprimir imágenes antes de subirlas
 * 
 * IMPORTANTE: Este módulo solo debe usarse en el cliente (navegador)
 */

// ============================================================
// TIPOS (definidos aquí para evitar importar la librería)
// ============================================================

export interface ImageCompressionOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  useWebWorker?: boolean
  fileType?: string
  initialQuality?: number
  alwaysKeepResolution?: boolean
  onProgress?: (progress: number) => void
}

// ============================================================
// CONFIGURACIÓN
// ============================================================

/**
 * Configuración por defecto para la compresión de imágenes
 */
export const IMAGE_OPTIMIZATION_CONFIG: ImageCompressionOptions = {
  maxSizeMB: 1,              // Máximo 1MB después de comprimir
  maxWidthOrHeight: 1920,    // Máximo 1920px en cualquier dimensión
  useWebWorker: true,        // Usar Web Worker para no bloquear UI
  fileType: 'image/webp',    // Convertir a WebP para mejor compresión
  initialQuality: 0.8,       // Calidad inicial 80%
  alwaysKeepResolution: false, // Permitir reducir resolución si es necesario
}

/**
 * Configuración para thumbnails/previews más pequeños
 */
export const THUMBNAIL_CONFIG: ImageCompressionOptions = {
  maxSizeMB: 0.1,            // Máximo 100KB
  maxWidthOrHeight: 400,     // Máximo 400px
  useWebWorker: true,
  fileType: 'image/webp',
  initialQuality: 0.7,
}

/**
 * Tipos de archivo permitidos para imágenes
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
]

/**
 * Tamaño máximo permitido antes de la optimización (5MB)
 */
export const MAX_FILE_SIZE_BEFORE_OPTIMIZATION = 5 * 1024 * 1024

/**
 * Tamaño mínimo para aplicar compresión (100KB)
 * Archivos más pequeños no necesitan compresión
 */
export const MIN_SIZE_FOR_COMPRESSION = 100 * 1024

// ============================================================
// TIPOS EXPORTADOS
// ============================================================

export interface OptimizedImage {
  file: File
  originalName: string
  originalSize: number
  compressedSize: number
  previewUrl: string
  savings: number // Porcentaje de ahorro (0-100)
  wasCompressed: boolean
}

export interface OptimizationStats {
  totalOriginalSize: number
  totalCompressedSize: number
  totalSavings: number
  imagesProcessed: number
  imagesCompressed: number
  averageSavingsPercent: number
}

export interface OptimizationProgress {
  current: number
  total: number
  currentFileName: string
  percent: number
}

// ============================================================
// FUNCIONES DE UTILIDAD
// ============================================================

/**
 * Formatea el tamaño de archivo en formato legible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

/**
 * Calcula el ahorro en formato legible
 */
export function calculateSavingsText(originalSize: number, compressedSize: number): string {
  const saved = originalSize - compressedSize
  const percent = Math.round((saved / originalSize) * 100)
  return `${formatFileSize(saved)} (${percent}%)`
}

/**
 * Calcula el porcentaje de ahorro
 */
export function calculateSavingsPercent(originalSize: number, compressedSize: number): number {
  if (originalSize === 0) return 0
  return Math.round(((originalSize - compressedSize) / originalSize) * 100)
}

/**
 * Valida si un archivo es una imagen válida
 */
export function isValidImageType(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type)
}

/**
 * Verifica si el archivo necesita compresión
 */
export function needsCompression(file: File): boolean {
  return file.size > MIN_SIZE_FOR_COMPRESSION
}

/**
 * Verifica si el archivo excede el tamaño máximo
 */
export function exceedsMaxSize(file: File): boolean {
  return file.size > MAX_FILE_SIZE_BEFORE_OPTIMIZATION
}

// ============================================================
// FUNCIONES DE COMPRESIÓN (con importación dinámica)
// ============================================================

/**
 * Carga la librería de compresión de forma dinámica
 * Solo se carga cuando se necesita y solo en el cliente
 */
async function getImageCompression() {
  if (typeof window === 'undefined') {
    throw new Error('Image compression can only be used in the browser')
  }
  const imageCompression = (await import('browser-image-compression')).default
  return imageCompression
}

/**
 * Comprime una imagen individual
 * @param file - Archivo de imagen a comprimir
 * @param onProgress - Callback opcional para el progreso (0-100)
 * @returns Promise con la imagen optimizada
 */
export async function compressImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OptimizedImage> {
  const originalSize = file.size
  const originalName = file.name

  // Si el archivo es muy pequeño, no comprimir
  if (!needsCompression(file)) {
    const previewUrl = URL.createObjectURL(file)
    return {
      file,
      originalName,
      originalSize,
      compressedSize: originalSize,
      previewUrl,
      savings: 0,
      wasCompressed: false
    }
  }

  try {
    // Importar dinámicamente la librería
    const imageCompression = await getImageCompression()
    
    const options: ImageCompressionOptions = {
      ...IMAGE_OPTIMIZATION_CONFIG,
      onProgress: onProgress
    }

    const compressedFile = await imageCompression(file, options)
    
    // Mantener el nombre original pero con extensión actualizada si cambió el tipo
    const newExtension = compressedFile.type === 'image/webp' ? '.webp' : ''
    const baseName = originalName.replace(/\.[^/.]+$/, '')
    const finalName = newExtension ? `${baseName}${newExtension}` : originalName
    
    // Crear un nuevo archivo con el nombre correcto
    const finalFile = new File([compressedFile], finalName, {
      type: compressedFile.type,
      lastModified: Date.now()
    })

    const previewUrl = URL.createObjectURL(finalFile)
    const savings = calculateSavingsPercent(originalSize, finalFile.size)

    return {
      file: finalFile,
      originalName, // Mantener nombre original para matching con Excel
      originalSize,
      compressedSize: finalFile.size,
      previewUrl,
      savings,
      wasCompressed: true
    }
  } catch (error) {
    console.error(`Error comprimiendo imagen ${originalName}:`, error)
    
    // Si falla la compresión, devolver el archivo original
    const previewUrl = URL.createObjectURL(file)
    return {
      file,
      originalName,
      originalSize,
      compressedSize: originalSize,
      previewUrl,
      savings: 0,
      wasCompressed: false
    }
  }
}

/**
 * Comprime múltiples imágenes con seguimiento de progreso
 * @param files - Array de archivos a comprimir
 * @param onProgress - Callback para el progreso global
 * @returns Promise con array de imágenes optimizadas y estadísticas
 */
export async function compressMultipleImages(
  files: File[],
  onProgress?: (progress: OptimizationProgress) => void
): Promise<{ images: OptimizedImage[], stats: OptimizationStats }> {
  const images: OptimizedImage[] = []
  let totalOriginalSize = 0
  let totalCompressedSize = 0
  let imagesCompressed = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    
    // Reportar progreso
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: files.length,
        currentFileName: file.name,
        percent: Math.round(((i + 1) / files.length) * 100)
      })
    }

    const optimized = await compressImage(file)
    images.push(optimized)
    
    totalOriginalSize += optimized.originalSize
    totalCompressedSize += optimized.compressedSize
    if (optimized.wasCompressed) imagesCompressed++
  }

  const stats: OptimizationStats = {
    totalOriginalSize,
    totalCompressedSize,
    totalSavings: totalOriginalSize - totalCompressedSize,
    imagesProcessed: files.length,
    imagesCompressed,
    averageSavingsPercent: calculateSavingsPercent(totalOriginalSize, totalCompressedSize)
  }

  return { images, stats }
}

/**
 * Libera las URLs de preview para evitar memory leaks
 */
export function revokePreviewUrls(images: OptimizedImage[]): void {
  images.forEach(img => {
    if (img.previewUrl) {
      URL.revokeObjectURL(img.previewUrl)
    }
  })
}

/**
 * Valida un array de archivos antes de la optimización
 */
export function validateImageFiles(files: File[]): {
  valid: File[]
  errors: { fileName: string; error: string }[]
} {
  const valid: File[] = []
  const errors: { fileName: string; error: string }[] = []

  for (const file of files) {
    if (!isValidImageType(file)) {
      errors.push({
        fileName: file.name,
        error: 'Formato no válido. Use JPG, PNG, GIF o WebP.'
      })
      continue
    }

    if (exceedsMaxSize(file)) {
      errors.push({
        fileName: file.name,
        error: `Excede el tamaño máximo de ${formatFileSize(MAX_FILE_SIZE_BEFORE_OPTIMIZATION)}`
      })
      continue
    }

    valid.push(file)
  }

  return { valid, errors }
}
