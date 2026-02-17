'use client'

import { useState, useCallback } from 'react'
import {
  compressMultipleImages,
  validateImageFiles,
  revokePreviewUrls,
  formatFileSize,
  type OptimizedImage,
  type OptimizationStats,
  type OptimizationProgress
} from '@/lib/image-optimization'

// ============================================================
// TIPOS
// ============================================================

export interface UseImageOptimizerOptions {
  /** Máximo de imágenes permitidas */
  maxImages?: number
}

export interface UseImageOptimizerReturn {
  /** Imágenes optimizadas listas para subir */
  optimizedImages: OptimizedImage[]
  /** Estado de optimización en curso */
  isOptimizing: boolean
  /** Progreso de la optimización actual */
  progress: OptimizationProgress | null
  /** Estadísticas de la última optimización */
  stats: OptimizationStats | null
  /** Errores de validación */
  errors: { fileName: string; error: string }[]
  /** Optimizar un array de archivos */
  optimizeFiles: (files: File[]) => Promise<void>
  /** Remover una imagen optimizada por nombre */
  removeImage: (originalName: string) => void
  /** Limpiar todas las imágenes */
  clearAll: () => void
  /** Obtener archivos listos para FormData */
  getFilesForUpload: () => File[]
  /** Formatear tamaño de archivo */
  formatSize: (bytes: number) => string
}

// ============================================================
// HOOK
// ============================================================

export function useImageOptimizer(
  options: UseImageOptimizerOptions = {}
): UseImageOptimizerReturn {
  const { maxImages = 200 } = options

  // Estados
  const [optimizedImages, setOptimizedImages] = useState<OptimizedImage[]>([])
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [progress, setProgress] = useState<OptimizationProgress | null>(null)
  const [stats, setStats] = useState<OptimizationStats | null>(null)
  const [errors, setErrors] = useState<{ fileName: string; error: string }[]>([])

  /**
   * Optimiza un array de archivos de imagen
   */
  const optimizeFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    // Validar límite de imágenes
    const currentCount = optimizedImages.length
    if (currentCount + files.length > maxImages) {
      setErrors([{
        fileName: 'general',
        error: `Máximo ${maxImages} imágenes. Ya tienes ${currentCount}, intentas agregar ${files.length}.`
      }])
      return
    }

    // Validar archivos
    const { valid, errors: validationErrors } = validateImageFiles(files)
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
    }

    if (valid.length === 0) return

    setIsOptimizing(true)
    setErrors([])
    setProgress({
      current: 0,
      total: valid.length,
      currentFileName: '',
      percent: 0
    })

    try {
      const { images, stats: newStats } = await compressMultipleImages(
        valid,
        (p) => setProgress(p)
      )

      // Agregar a las imágenes existentes
      setOptimizedImages(prev => {
        // Liberar URLs de preview anteriores que serán reemplazadas
        const newNames = new Set(images.map(img => img.originalName))
        const toRevoke = prev.filter(img => newNames.has(img.originalName))
        revokePreviewUrls(toRevoke)
        
        // Filtrar duplicados y agregar nuevas
        const filtered = prev.filter(img => !newNames.has(img.originalName))
        return [...filtered, ...images]
      })

      // Actualizar estadísticas
      setStats(prevStats => {
        if (!prevStats) return newStats
        return {
          totalOriginalSize: prevStats.totalOriginalSize + newStats.totalOriginalSize,
          totalCompressedSize: prevStats.totalCompressedSize + newStats.totalCompressedSize,
          totalSavings: prevStats.totalSavings + newStats.totalSavings,
          imagesProcessed: prevStats.imagesProcessed + newStats.imagesProcessed,
          imagesCompressed: prevStats.imagesCompressed + newStats.imagesCompressed,
          averageSavingsPercent: Math.round(
            ((prevStats.totalOriginalSize + newStats.totalOriginalSize) - 
             (prevStats.totalCompressedSize + newStats.totalCompressedSize)) /
            (prevStats.totalOriginalSize + newStats.totalOriginalSize) * 100
          )
        }
      })

    } catch (error) {
      console.error('Error optimizing images:', error)
      setErrors([{
        fileName: 'general',
        error: 'Error al optimizar las imágenes. Por favor intenta de nuevo.'
      }])
    } finally {
      setIsOptimizing(false)
      setProgress(null)
    }
  }, [optimizedImages.length, maxImages])

  /**
   * Remueve una imagen por su nombre original
   */
  const removeImage = useCallback((originalName: string) => {
    setOptimizedImages(prev => {
      const toRemove = prev.find(img => img.originalName === originalName)
      if (toRemove) {
        revokePreviewUrls([toRemove])
      }
      const newImages = prev.filter(img => img.originalName !== originalName)
      
      // Recalcular estadísticas
      if (newImages.length === 0) {
        setStats(null)
      } else if (toRemove) {
        setStats(prevStats => {
          if (!prevStats) return null
          const newTotalOriginal = prevStats.totalOriginalSize - toRemove.originalSize
          const newTotalCompressed = prevStats.totalCompressedSize - toRemove.compressedSize
          return {
            totalOriginalSize: newTotalOriginal,
            totalCompressedSize: newTotalCompressed,
            totalSavings: newTotalOriginal - newTotalCompressed,
            imagesProcessed: prevStats.imagesProcessed - 1,
            imagesCompressed: prevStats.imagesCompressed - (toRemove.wasCompressed ? 1 : 0),
            averageSavingsPercent: newTotalOriginal > 0 
              ? Math.round((newTotalOriginal - newTotalCompressed) / newTotalOriginal * 100)
              : 0
          }
        })
      }
      
      return newImages
    })
  }, [])

  /**
   * Limpia todas las imágenes y libera memoria
   */
  const clearAll = useCallback(() => {
    setOptimizedImages(prev => {
      revokePreviewUrls(prev)
      return []
    })
    setStats(null)
    setErrors([])
    setProgress(null)
  }, [])

  /**
   * Obtiene los archivos optimizados listos para subir
   */
  const getFilesForUpload = useCallback((): File[] => {
    return optimizedImages.map(img => img.file)
  }, [optimizedImages])

  return {
    optimizedImages,
    isOptimizing,
    progress,
    stats,
    errors,
    optimizeFiles,
    removeImage,
    clearAll,
    getFilesForUpload,
    formatSize: formatFileSize
  }
}

export type { OptimizedImage, OptimizationStats, OptimizationProgress }
