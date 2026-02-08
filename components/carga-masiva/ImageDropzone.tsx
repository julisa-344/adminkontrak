"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
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
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFiles = (files: File[]): { valid: File[], errors: string[] } => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024 // 5MB
    const valid: File[] = []
    const errors: string[] = []

    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        errors.push(`${file.name}: Formato no válido (solo JPG, PNG, WEBP)`)
        continue
      }
      if (file.size > maxSize) {
        errors.push(`${file.name}: Excede 5MB`)
        continue
      }
      valid.push(file)
    }

    return { valid, errors }
  }

  const handleUpload = async (files: File[]) => {
    if (disabled) return

    setError(null)
    const { valid, errors: validationErrors } = validateFiles(files)

    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'))
    }

    if (valid.length === 0) return

    // Check if exceeds max images
    if (uploadedImages.length + valid.length > 200) {
      setError(`Máximo 200 imágenes. Ya tienes ${uploadedImages.length}, intentas agregar ${valid.length}.`)
      return
    }

    setIsUploading(true)
    setUploadProgress(`Subiendo ${valid.length} imagen(es)...`)

    try {
      const formData = new FormData()
      valid.forEach(file => formData.append('images', file))

      const response = await fetch('/api/carga-masiva/images', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Error al subir imágenes')
        return
      }

      if (result.images && result.images.length > 0) {
        onImagesUploaded(result.images)
      }

      if (result.error) {
        setError(result.error)
      }

    } catch (err) {
      console.error('Error uploading:', err)
      setError('Error de conexión al subir imágenes')
    } finally {
      setIsUploading(false)
      setUploadProgress("")
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    handleUpload(files)
  }, [disabled])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      handleUpload(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
          ${isDragging 
            ? 'border-primary bg-primary/5' 
            : disabled 
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
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-gray-600">{uploadProgress}</p>
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
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
        </div>
      )}

      {/* Uploaded images grid */}
      {uploadedImages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-700 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              {uploadedImages.length} imagen(es) subida(s)
            </h4>
            <p className="text-sm text-gray-500">
              Usa estos nombres exactos en el Excel
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {uploadedImages.map((img) => (
              <div 
                key={img.fileName} 
                className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.fileName}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay with filename */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-xs text-white truncate font-medium" title={img.fileName}>
                    {img.fileName}
                  </p>
                  <p className="text-xs text-white/70">{formatFileSize(img.size)}</p>
                </div>

                {/* Remove button */}
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

      {/* Empty state */}
      {uploadedImages.length === 0 && !isUploading && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <ImageIcon className="w-5 h-5 text-blue-500" />
          <p className="text-sm text-blue-700">
            Sube las imágenes primero. Los nombres de archivo se usarán para vincular con el Excel.
          </p>
        </div>
      )}
    </div>
  )
}
