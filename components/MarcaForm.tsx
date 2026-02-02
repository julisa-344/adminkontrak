'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Upload, X, Check } from 'lucide-react'
import Link from 'next/link'
import { createMarca, updateMarca, type MarcaFormData } from '@/lib/actions/admin-marcas'

interface MarcaFormProps {
  marca?: {
    id: number
    nombre: string
    descripcion: string | null
    logo_url: string | null
    activa: boolean
  }
  isEditing?: boolean
}

export function MarcaForm({ marca, isEditing = false }: MarcaFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(marca?.logo_url || null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false)

  const [formData, setFormData] = useState<MarcaFormData>({
    nombre: marca?.nombre || '',
    descripcion: marca?.descripcion || '',
    activa: marca?.activa ?? true
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Tipo de archivo no válido. Use JPG, PNG, GIF o WebP.')
      return
    }

    // Validar tamaño
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError('El archivo es demasiado grande. Máximo 5MB.')
      return
    }

    setSelectedFile(file)
    setRemoveCurrentImage(false)
    setError(null)

    // Crear preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setRemoveCurrentImage(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const fileToUpload = removeCurrentImage ? null : selectedFile
      
      const result = isEditing && marca
        ? await updateMarca(marca.id, formData, fileToUpload)
        : await createMarca(formData, selectedFile || undefined)

      if (result.success) {
        router.push('/dashboard/marcas')
      } else {
        setError(result.error || 'Error desconocido')
      }
    } catch (error) {
      setError('Error al procesar la solicitud')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/marcas"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Marca' : 'Nueva Marca'}
          </h1>
          <p className="text-gray-600">
            {isEditing 
              ? `Edita la información de la marca ${marca?.nombre}`
              : 'Completa la información para crear una nueva marca'
            }
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información básica */}
            <div className="space-y-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la marca *
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ej: Caterpillar, John Deere..."
                />
              </div>

              <div>
                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Descripción opcional de la marca..."
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="activa"
                    checked={formData.activa}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">Marca activa</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Las marcas inactivas no aparecerán en formularios de vehículos
                </p>
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Logo de la marca
              </label>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {previewUrl ? (
                  <div className="space-y-4">
                    <div className="w-32 h-32 mx-auto relative">
                      <Image
                        src={previewUrl}
                        alt="Preview del logo"
                        fill
                        className="object-contain rounded-lg"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                      Quitar imagen
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 mx-auto text-gray-400" />
                    <div>
                      <p className="text-gray-600">
                        Arrastra una imagen aquí o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG, GIF o WebP (máx. 5MB)
                      </p>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              <p className="text-xs text-gray-500">
                Recomendamos imágenes cuadradas de al menos 300x300px para mejor calidad
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t">
            <Link
              href="/dashboard/marcas"
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !formData.nombre.trim()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isEditing ? 'Actualizar Marca' : 'Crear Marca'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}