"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Zap,
  TrendingDown,
  FileImage
} from "lucide-react"
import { useImageOptimizer, type OptimizedImage } from "@/hooks/useImageOptimizer"
import type { UploadedImage } from "@/lib/actions/admin-carga-masiva"

interface ImageDropzoneProps {
  onImagesUploaded: (images: UploadedImage[]) => void
  uploadedImages: UploadedImage[]
  onRemoveImage: (fileName: string) => void
  disabled?: boolean
}

export function ImageDropzone({ 
  onImagesUploaded, 
  uploadedImages, 
  onRemoveImage,
  disabled = false 
}: ImageDropzoneProps) {
  // Estados locales
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hook de optimización
  const {
    optimizedImages,
    isOptimizing,
    progress,
    stats,
    errors: optimizationErrors,
    optimizeFiles,
    removeImage: removeOptimizedImage,
    clearAll,
    getFilesForUpload,
    formatSize
  } = useImageOptimizer({ maxImages: 200 })

  // Subir imágenes optimizadas al servidor
  const handleUploadToServer = async () => {
    if (optimizedImages.length === 0 || isUploading) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const files = getFilesForUpload()
      const formData = new FormData()
      
      // Agregar archivos con sus nombres originales
      optimizedImages.forEach((img, index) => {
        // Crear archivo con nombre original para mantener matching con Excel
        const fileWithOriginalName = new File([img.file], img.originalName, {
          type: img.file.type,
          lastModified: Date.now()
        })
        formData.append('images', fileWithOriginalName)
      })

      const response = await fetch('/api/carga-masiva/images', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!result.success) {
        setUploadError(result.error || 'Error al subir imágenes')
        return
      }

      if (result.images && result.images.length > 0) {
        onImagesUploaded(result.images)
        clearAll() // Limpiar imágenes optimizadas después de subir
      }

      if (result.error) {
        setUploadError(result.error)
      }

    } catch (err) {
      console.error('Error uploading:', err)
      setUploadError('Error de conexión al subir imágenes')
    } finally {
      setIsUploading(false)
    }
  }

  // Manejar selección/drop de archivos
  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (disabled || isOptimizing || isUploading) return
    setUploadError(null)
    await optimizeFiles(files)
  }, [disabled, isOptimizing, isUploading, optimizeFiles])

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && !isOptimizing && !isUploading) setIsDragging(true)
  }, [disabled, isOptimizing, isUploading])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled || isOptimizing || isUploading) return

    const files = Array.from(e.dataTransfer.files)
    handleFilesSelected(files)
  }, [disabled, isOptimizing, isUploading, handleFilesSelected])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      handleFilesSelected(files)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveOptimized = (originalName: string) => {
    removeOptimizedImage(originalName)
  }

  // Calcular totales
  const totalImages = uploadedImages.length + optimizedImages.length
  const hasOptimizedImages = optimizedImages.length > 0
  const hasUploadedImages = uploadedImages.length > 0

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isOptimizing && !isUploading && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
          ${isDragging 
            ? 'border-primary bg-primary/5' 
            : disabled || isOptimizing || isUploading
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-primary hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isOptimizing || isUploading}
        />

        {isOptimizing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Zap className="w-12 h-12 text-primary animate-pulse" />
            </div>
            <div className="space-y-2 w-full max-w-xs">
              <p className="text-gray-700 font-medium">
                Optimizando imágenes...
              </p>
              {progress && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    {progress.current} de {progress.total} - {progress.currentFileName}
                  </p>
                </>
              )}
            </div>
          </div>
        ) : isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-gray-600">Subiendo al servidor...</p>
          </div>
        ) : (
          <>
            <Upload className={`w-12 h-12 mx-auto mb-4 ${disabled ? 'text-gray-300' : 'text-gray-400'}`} />
            <p className={`text-lg font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
              {isDragging ? 'Suelta las imágenes aquí' : 'Arrastra imágenes aquí'}
            </p>
            <p className={`text-sm mt-1 ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
              o haz clic para seleccionar archivos
            </p>
            <p className="text-xs text-gray-400 mt-2">
              JPG, PNG, WEBP • Máximo 5MB cada una • Hasta 200 imágenes
            </p>
            <p className="text-xs text-primary mt-1 flex items-center justify-center gap-1">
              <Zap className="w-3 h-3" />
              Las imágenes se optimizan automáticamente antes de subir
            </p>
          </>
        )}
      </div>

      {/* Errores de optimización */}
      {optimizationErrors.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            {optimizationErrors.map((err, i) => (
              <p key={i}>{err.fileName}: {err.error}</p>
            ))}
          </div>
        </div>
      )}

      {/* Error de upload */}
      {uploadError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{uploadError}</p>
        </div>
      )}

      {/* Estadísticas de optimización */}
      {stats && hasOptimizedImages && (
        <div className="flex items-center gap-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <TrendingDown className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              Optimización completada
            </p>
            <p className="text-xs text-green-600">
              {stats.imagesProcessed} imagen(es) • 
              Ahorro: {formatSize(stats.totalSavings)} ({stats.averageSavingsPercent}%) • 
              Tamaño final: {formatSize(stats.totalCompressedSize)}
            </p>
          </div>
        </div>
      )}

      {/* Imágenes optimizadas (pendientes de subir) */}
      {hasOptimizedImages && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-700 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              {optimizedImages.length} imagen(es) optimizada(s) - Listas para subir
            </h4>
            <div className="flex gap-2">
              <button
                onClick={clearAll}
                disabled={isUploading}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Limpiar
              </button>
              <button
                onClick={handleUploadToServer}
                disabled={isUploading || isOptimizing}
                className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Subir al servidor
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {optimizedImages.map((img) => (
              <div 
                key={img.originalName} 
                className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square border-2 border-amber-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt={img.originalName}
                  className="w-full h-full object-cover"
                />
                
                {/* Badge de ahorro */}
                {img.wasCompressed && img.savings > 0 && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-green-500 text-white text-xs font-bold rounded">
                    ↓{img.savings}%
                  </div>
                )}
                
                {/* Overlay con info */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-xs text-white truncate font-medium" title={img.originalName}>
                    {img.originalName}
                  </p>
                  <p className="text-xs text-white/70">
                    {formatSize(img.compressedSize)}
                    {img.wasCompressed && (
                      <span className="text-green-300 ml-1">
                        (antes: {formatSize(img.originalSize)})
                      </span>
                    )}
                  </p>
                </div>

                {/* Botón eliminar */}
                {!disabled && !isUploading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveOptimized(img.originalName)
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar imagen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Imágenes ya subidas */}
      {hasUploadedImages && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-700 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              {uploadedImages.length} imagen(es) subida(s) al servidor
            </h4>
            <p className="text-sm text-gray-500">
              Usa estos nombres exactos en el Excel
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {uploadedImages.map((img) => (
              <div 
                key={img.fileName} 
                className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square border-2 border-green-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.fileName}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay con filename */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-xs text-white truncate font-medium" title={img.fileName}>
                    {img.fileName}
                  </p>
                  <p className="text-xs text-white/70">{formatSize(img.size)}</p>
                </div>

                {/* Botón eliminar */}
                {!disabled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveImage(img.fileName)
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar imagen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {!hasOptimizedImages && !hasUploadedImages && !isOptimizing && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <FileImage className="w-5 h-5 text-blue-500" />
          <p className="text-sm text-blue-700">
            Sube las imágenes primero. Se optimizarán automáticamente y los nombres de archivo se usarán para vincular con el Excel.
          </p>
        </div>
      )}
    </div>
  )
}
