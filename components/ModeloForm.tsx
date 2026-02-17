'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { createModelo, updateModelo, type ModeloFormData } from '@/lib/actions/admin-modelos'
import { getMarcasActivas } from '@/lib/actions/admin-marcas'

interface Marca {
  id: number
  nombre: string
  logo_url: string | null
}

interface ModeloFormProps {
  modelo?: {
    id: number
    nombre: string
    descripcion: string | null
    marca_id: number | null
    activo: boolean
  }
  isEditing?: boolean
}

export function ModeloForm({ modelo, isEditing = false }: ModeloFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [loadingMarcas, setLoadingMarcas] = useState(true)

  const [formData, setFormData] = useState<ModeloFormData>({
    nombre: modelo?.nombre || '',
    descripcion: modelo?.descripcion || '',
    marca_id: modelo?.marca_id || null,
    activo: modelo?.activo ?? true
  })

  // Cargar marcas al montar el componente
  useEffect(() => {
    async function loadMarcas() {
      try {
        const data = await getMarcasActivas()
        setMarcas(data)
      } catch (error) {
        console.error('Error al cargar marcas:', error)
      } finally {
        setLoadingMarcas(false)
      }
    }
    loadMarcas()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }))
    } else if (name === 'marca_id') {
      setFormData(prev => ({
        ...prev,
        marca_id: value ? parseInt(value, 10) : null
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const result = isEditing && modelo
        ? await updateModelo(modelo.id, formData)
        : await createModelo(formData)

      if (result.success) {
        router.push('/dashboard/modelos')
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
          href="/dashboard/modelos"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Modelo' : 'Nuevo Modelo'}
          </h1>
          <p className="text-gray-600">
            {isEditing 
              ? `Edita la informacion del modelo ${modelo?.nombre}`
              : 'Completa la informacion para crear un nuevo modelo'
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
                Nombre del modelo <span className="text-red-500">*</span>
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
                placeholder="Ej: Excavadora 320D, Cargador 950H..."
              />
              <p className="mt-1 text-xs text-gray-500">Maximo 100 caracteres</p>
            </div>

            <div>
              <label htmlFor="marca_id" className="block text-sm font-medium text-gray-700 mb-2">
                Marca
              </label>
              <select
                id="marca_id"
                name="marca_id"
                value={formData.marca_id || ''}
                onChange={handleInputChange}
                disabled={loadingMarcas}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Sin marca asignada</option>
                {marcas.map((marca) => (
                  <option key={marca.id} value={marca.id}>
                    {marca.nombre}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {loadingMarcas ? 'Cargando marcas...' : 'Selecciona la marca a la que pertenece este modelo'}
              </p>
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
                placeholder="Descripcion opcional del modelo..."
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700">Modelo activo</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Los modelos inactivos no apareceran en formularios de vehiculos
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t">
            <Link
              href="/dashboard/modelos"
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
                  {isEditing ? 'Actualizar Modelo' : 'Crear Modelo'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
