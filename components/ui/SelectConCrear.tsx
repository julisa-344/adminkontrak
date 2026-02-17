'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, X, Check, Loader2 } from 'lucide-react'

export interface SelectOption {
  id: number
  nombre: string
  extra?: string // Para mostrar info adicional (ej: marca del modelo)
}

interface SelectConCrearProps {
  label: string
  name: string
  value: number | null
  options: SelectOption[]
  onChange: (value: number | null) => void
  onCreateNew: (nombre: string) => Promise<{ success: boolean; id?: number; error?: string }>
  placeholder?: string
  required?: boolean
  disabled?: boolean
  loading?: boolean
  error?: string
  helpText?: string
  createLabel?: string // Texto del boton crear, ej: "Crear nueva categoria"
}

export function SelectConCrear({
  label,
  name,
  value,
  options,
  onChange,
  onCreateNew,
  placeholder = 'Seleccionar...',
  required = false,
  disabled = false,
  loading = false,
  error,
  helpText,
  createLabel = 'Crear nuevo'
}: SelectConCrearProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsCreating(false)
        setNewItemName('')
        setCreateError(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Enfocar input cuando se abre modo crear
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreating])

  const selectedOption = options.find(opt => opt.id === value)

  const handleSelect = (optionId: number) => {
    onChange(optionId)
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  const handleCreateClick = () => {
    setIsCreating(true)
    setCreateError(null)
  }

  const handleCreateSubmit = async () => {
    if (!newItemName.trim()) {
      setCreateError('El nombre es obligatorio')
      return
    }

    setIsSubmitting(true)
    setCreateError(null)

    try {
      const result = await onCreateNew(newItemName.trim())
      if (result.success && result.id) {
        onChange(result.id)
        setIsOpen(false)
        setIsCreating(false)
        setNewItemName('')
      } else {
        setCreateError(result.error || 'Error al crear')
      }
    } catch (err) {
      setCreateError('Error inesperado')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreateSubmit()
    } else if (e.key === 'Escape') {
      setIsCreating(false)
      setNewItemName('')
      setCreateError(null)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={`w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between gap-2 transition
          ${disabled || loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${isOpen ? 'ring-2 ring-primary border-primary' : ''}
        `}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
          {loading ? 'Cargando...' : selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.nombre}
              {selectedOption.extra && (
                <span className="text-xs text-gray-500">({selectedOption.extra})</span>
              )}
            </span>
          ) : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          {loading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <ChevronDown className={`w-4 h-4 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>
      </button>

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value || ''} />

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Help text */}
      {helpText && !error && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {/* Create new option */}
          {!isCreating ? (
            <button
              type="button"
              onClick={handleCreateClick}
              className="w-full px-3 py-2 text-left text-primary hover:bg-primary/5 flex items-center gap-2 border-b border-gray-100"
            >
              <Plus className="w-4 h-4" />
              {createLabel}
            </button>
          ) : (
            <div className="p-3 border-b border-gray-100 space-y-2">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nombre..."
                  maxLength={100}
                  disabled={isSubmitting}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleCreateSubmit}
                  disabled={isSubmitting || !newItemName.trim()}
                  className="p-1.5 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false)
                    setNewItemName('')
                    setCreateError(null)
                  }}
                  disabled={isSubmitting}
                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {createError && (
                <p className="text-xs text-red-600">{createError}</p>
              )}
            </div>
          )}

          {/* Options list */}
          {options.length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-sm">
              No hay opciones disponibles
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between
                  ${value === option.id ? 'bg-primary/5 text-primary' : 'text-gray-900'}
                `}
              >
                <span className="flex items-center gap-2">
                  {option.nombre}
                  {option.extra && (
                    <span className="text-xs text-gray-500">({option.extra})</span>
                  )}
                </span>
                {value === option.id && <Check className="w-4 h-4" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
