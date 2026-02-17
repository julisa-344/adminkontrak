'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { createCategoria, updateCategoria, type CategoriaFormData } from '@/lib/actions/admin-categorias'

interface CategoriaFormProps {
  categoria?: {
    id: number
    nombre: string
    descripcion: string | null
    activa: boolean
  }
  isEditing?: boolean
}

export function CategoriaForm({ categoria, isEditing = false }: CategoriaFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<CategoriaFormData>({
    nombre: categoria?.nombre || '',
    descripcion: categoria?.descripcion || '',
    activa: categoria?.activa ?? true
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const result = isEditing && categoria
        ? await updateCategoria(categoria.id, formData)
        : await createCategoria(formData)

      if (result.success) {
        router.push('/dashboard/categorias')
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
          href="/dashboard/categorias"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Categoria' : 'Nueva Categoria'}
          </h1>
          <p className="text-gray-600">
            {isEditing 
              ? `Edita la informacion de la categoria ${categoria?.nombre}`
              : 'Completa la informacion para crear una nueva categoria'
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

          <div className="grid grid-cols-1 gap-6 max-w-xl">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la categoria <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                required
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ej: Maquinaria Pesada, Herramientas..."
              />
              <p className="mt-1 text-xs text-gray-500">Maximo 100 caracteres</p>
            </div>

            <div>
              <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
                Descripcion
              </label>
              <textarea
                id="descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Descripcion opcional de la categoria..."
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
                <span className="text-sm font-medium text-gray-700">Categoria activa</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Las categorias inactivas no apareceran en formularios de vehiculos
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t">
            <Link
              href="/dashboard/categorias"
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
                  {isEditing ? 'Actualizar Categoria' : 'Crear Categoria'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
