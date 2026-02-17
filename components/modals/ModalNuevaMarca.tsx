'use client'

import { useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'
import { createMarcaRapida } from '@/lib/actions/admin-marcas'

interface ModalNuevaMarcaProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (marca: { id: number; nombre: string }) => void
}

export function ModalNuevaMarca({ isOpen, onClose, onSuccess }: ModalNuevaMarcaProps) {
  const [nombre, setNombre] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createMarcaRapida(nombre.trim())
      if (result.success && result.marca) {
        onSuccess({ id: result.marca.id, nombre: result.marca.nombre })
        setNombre('')
        onClose()
      } else {
        setError(result.error || 'Error al crear la marca')
      }
    } catch (err) {
      setError('Error inesperado al crear la marca')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setNombre('')
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Nueva Marca</h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={isSubmitting}
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100"
              placeholder="Ej: Caterpillar"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              Podras agregar logo y descripcion despues desde el modulo de marcas
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nombre.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Crear Marca
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
