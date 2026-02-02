"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { EstadoVehiculo } from "@prisma/client"

type VehiculoFormProps = {
  mode: "create" | "edit"
  idveh?: number
  defaultValues?: {
    plaveh?: string | null
    marveh?: string | null
    modveh?: string | null
    categoria?: string | null
    precioalquilo?: number | null
    fotoveh?: string | null
    imagenUrl?: string | null
    anioveh?: number | null
    capacidad?: string | null
    dimensiones?: string | null
    peso?: number | null
    potencia?: number | null
    accesorios?: string | null
    requiere_certificacion?: boolean | null
    horas_uso?: number | null
    estveh?: EstadoVehiculo | null
  }
  onSubmitCreate?: (formData: FormData) => Promise<{ ok: boolean; error?: string }>
  onSubmitEdit?: (idveh: number, formData: FormData) => Promise<{ ok: boolean; error?: string }>
}

const ESTADOS: { value: EstadoVehiculo; label: string }[] = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "OCUPADO", label: "Ocupado" },
  { value: "EN_MANTENIMIENTO", label: "En mantenimiento" },
  { value: "FUERA_SERVICIO", label: "Fuera de servicio" },
]

const CURRENT_YEAR = new Date().getFullYear()
const MIN_YEAR = 1900
const MAX_YEAR = CURRENT_YEAR + 1

// Tipos de errores de validación
type ValidationErrors = {
  plaveh?: string
  marveh?: string
  modveh?: string
  precioalquilo?: string
  anioveh?: string
  peso?: string
  potencia?: string
  horas_uso?: string
  image?: string
}

export function VehiculoForm({
  mode,
  idveh,
  defaultValues,
  onSubmitCreate,
  onSubmitEdit,
}: VehiculoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const d = defaultValues ?? {}

  // Validación de placa
  const validatePlaca = useCallback((value: string): string | undefined => {
    if (!value.trim()) return "La placa es obligatoria"
    if (value.length < 5 || value.length > 10) return "La placa debe tener entre 5 y 10 caracteres"
    if (!/^[A-Za-z0-9-]+$/.test(value)) return "La placa solo puede contener letras, números y guiones"
    return undefined
  }, [])

  // Validación de campos requeridos
  const validateRequired = useCallback((value: string, fieldName: string): string | undefined => {
    if (!value.trim()) return `${fieldName} es obligatorio`
    if (value.length > 255) return `${fieldName} no puede exceder 255 caracteres`
    return undefined
  }, [])

  // Validación de precio
  const validatePrecio = useCallback((value: string): string | undefined => {
    if (!value) return "El precio es obligatorio"
    const num = parseFloat(value)
    if (isNaN(num)) return "El precio debe ser un número válido"
    if (num < 0) return "El precio no puede ser negativo"
    if (num > 1000000) return "El precio parece demasiado alto (máx. 1,000,000)"
    return undefined
  }, [])

  // Validación de año
  const validateAnio = useCallback((value: string): string | undefined => {
    if (!value) return undefined // No es obligatorio
    const num = parseInt(value, 10)
    if (isNaN(num)) return "El año debe ser un número entero"
    if (num < MIN_YEAR || num > MAX_YEAR) return `El año debe estar entre ${MIN_YEAR} y ${MAX_YEAR}`
    return undefined
  }, [])

  // Validación de números positivos
  const validatePositive = useCallback((value: string, fieldName: string): string | undefined => {
    if (!value) return undefined // No es obligatorio
    const num = parseFloat(value)
    if (isNaN(num)) return `${fieldName} debe ser un número válido`
    if (num < 0) return `${fieldName} no puede ser negativo`
    return undefined
  }, [])

  // Validación de imagen
  const validateImage = useCallback((file: File): string | undefined => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return "Tipo de archivo no válido. Use JPG, PNG, GIF o WebP."
    }
    if (file.size > 5 * 1024 * 1024) {
      return "El archivo es demasiado grande. Máximo 5MB."
    }
    return undefined
  }, [])

  // Manejar cambio de archivo de imagen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const error = validateImage(file)
      if (error) {
        setErrors(prev => ({ ...prev, image: error }))
        e.target.value = '' // Limpiar input
        return
      }
      setErrors(prev => ({ ...prev, image: undefined }))
      setImageFile(file)
      // Crear preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setImageFile(null)
      setImagePreview(null)
    }
  }

  // Validar campo en blur
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let error: string | undefined

    switch (name) {
      case 'plaveh':
        error = validatePlaca(value)
        break
      case 'marveh':
        error = validateRequired(value, 'Marca')
        break
      case 'modveh':
        error = validateRequired(value, 'Modelo')
        break
      case 'precioalquilo':
        error = validatePrecio(value)
        break
      case 'anioveh':
        error = validateAnio(value)
        break
      case 'peso':
        error = validatePositive(value, 'Peso')
        break
      case 'potencia':
        error = validatePositive(value, 'Potencia')
        break
      case 'horas_uso':
        error = validatePositive(value, 'Horas de uso')
        break
    }

    setErrors(prev => ({ ...prev, [name]: error }))
  }

  // Validar todo el formulario antes de enviar
  const validateForm = (formData: FormData): boolean => {
    const newErrors: ValidationErrors = {}
    
    const plaveh = formData.get('plaveh') as string
    const marveh = formData.get('marveh') as string
    const modveh = formData.get('modveh') as string
    const precioalquilo = formData.get('precioalquilo') as string
    const anioveh = formData.get('anioveh') as string
    const peso = formData.get('peso') as string
    const potencia = formData.get('potencia') as string
    const horas_uso = formData.get('horas_uso') as string

    newErrors.plaveh = validatePlaca(plaveh)
    newErrors.marveh = validateRequired(marveh, 'Marca')
    newErrors.modveh = validateRequired(modveh, 'Modelo')
    newErrors.precioalquilo = validatePrecio(precioalquilo)
    newErrors.anioveh = validateAnio(anioveh)
    newErrors.peso = validatePositive(peso, 'Peso')
    newErrors.potencia = validatePositive(potencia, 'Potencia')
    newErrors.horas_uso = validatePositive(horas_uso, 'Horas de uso')

    // Filtrar errores undefined
    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([_, v]) => v !== undefined)
    ) as ValidationErrors

    setErrors(filteredErrors)
    return Object.keys(filteredErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    // Validar en frontend primero
    if (!validateForm(formData)) {
      toast.error("Por favor corrige los errores en el formulario")
      return
    }

    setLoading(true)
    
    // Agregar el archivo de imagen al FormData si existe
    if (imageFile) {
      formData.append('image', imageFile)
    }
    
    try {
      let res: { ok: boolean; error?: string }
      if (mode === "create" && onSubmitCreate) {
        res = await onSubmitCreate(formData)
      } else if (mode === "edit" && idveh != null && onSubmitEdit) {
        res = await onSubmitEdit(idveh, formData)
      } else {
        res = { ok: false, error: "Acción no configurada" }
      }
      if (res.ok) {
        toast.success(mode === "create" ? "Producto creado exitosamente" : "Producto actualizado exitosamente")
        router.push("/dashboard/vehiculos")
        router.refresh()
      } else {
        toast.error(res.error ?? "Error al guardar")
      }
    } catch (error) {
      toast.error("Error inesperado al procesar la solicitud")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Componente para mostrar error
  const FieldError = ({ error }: { error?: string }) => {
    if (!error) return null
    return (
      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
        <AlertCircle className="w-4 h-4" />
        {error}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/vehiculos"
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-xl font-semibold text-gray-900">
          {mode === "create" ? "Nuevo producto / vehículo" : "Editar producto"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Placa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Placa <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="plaveh"
            required
            maxLength={10}
            defaultValue={d.plaveh ?? ""}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary uppercase ${
              errors.plaveh ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Ej. EXC-20T"
          />
          <FieldError error={errors.plaveh} />
        </div>

        {/* Marca */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Marca <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="marveh"
            required
            maxLength={255}
            defaultValue={d.marveh ?? ""}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
              errors.marveh ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Ej. Caterpillar"
          />
          <FieldError error={errors.marveh} />
        </div>

        {/* Modelo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Modelo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="modveh"
            required
            maxLength={255}
            defaultValue={d.modveh ?? ""}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
              errors.modveh ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Ej. Excavadora 20T"
          />
          <FieldError error={errors.modveh} />
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
          <input
            type="text"
            name="categoria"
            maxLength={255}
            defaultValue={d.categoria ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Ej. Maquinaria Pesada"
          />
        </div>

        {/* Precio alquiler */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio alquiler (S/) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="precioalquilo"
            required
            min={0}
            max={1000000}
            step={0.01}
            defaultValue={d.precioalquilo ?? ""}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
              errors.precioalquilo ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0.00"
          />
          <FieldError error={errors.precioalquilo} />
        </div>

        {/* Año */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
          <input
            type="number"
            name="anioveh"
            min={MIN_YEAR}
            max={MAX_YEAR}
            defaultValue={d.anioveh ?? ""}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
              errors.anioveh ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={String(CURRENT_YEAR)}
          />
          <FieldError error={errors.anioveh} />
          <p className="mt-1 text-xs text-gray-500">Año entre {MIN_YEAR} y {MAX_YEAR}</p>
        </div>

        {/* Capacidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad</label>
          <input
            type="text"
            name="capacidad"
            maxLength={255}
            defaultValue={d.capacidad ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Ej. 1.2 m³"
          />
        </div>

        {/* Dimensiones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dimensiones</label>
          <input
            type="text"
            name="dimensiones"
            maxLength={255}
            defaultValue={d.dimensiones ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Ej. 9.5m x 2.8m"
          />
        </div>

        {/* Peso */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
          <input
            type="number"
            name="peso"
            min={0}
            step={0.01}
            defaultValue={d.peso ?? ""}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
              errors.peso ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
          />
          <FieldError error={errors.peso} />
        </div>

        {/* Potencia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Potencia (HP)</label>
          <input
            type="number"
            name="potencia"
            min={0}
            step={0.01}
            defaultValue={d.potencia ?? ""}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
              errors.potencia ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
          />
          <FieldError error={errors.potencia} />
        </div>

        {/* Horas de uso */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Horas de uso</label>
          <input
            type="number"
            name="horas_uso"
            min={0}
            step={0.01}
            defaultValue={d.horas_uso ?? ""}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
              errors.horas_uso ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
          />
          <FieldError error={errors.horas_uso} />
        </div>

        {/* Estado (solo en edición) */}
        {mode === "edit" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              name="estveh"
              defaultValue={d.estveh ?? "DISPONIBLE"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Accesorios */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Accesorios</label>
          <input
            type="text"
            name="accesorios"
            maxLength={500}
            defaultValue={d.accesorios ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Opcional (máx. 500 caracteres)"
          />
        </div>

        {/* Imagen del vehículo */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imagen del vehículo
          </label>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleImageChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 ${
              errors.image ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <FieldError error={errors.image} />
          <p className="text-xs text-gray-500 mt-1">
            Formatos aceptados: JPG, PNG, GIF, WEBP. Tamaño máximo: 5MB
          </p>
          {/* Preview de la imagen */}
          {(imagePreview || d.imagenUrl) && (
            <div className="mt-3">
              <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
              <img
                src={imagePreview || d.imagenUrl || ''}
                alt="Preview"
                className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200"
              />
            </div>
          )}
        </div>

        {/* Requiere certificación */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="requiere_certificacion"
            value="true"
            defaultChecked={d.requiere_certificacion ?? false}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label className="ml-2 text-sm text-gray-700">Requiere certificación del operador</label>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-4 pt-4 border-t">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Guardando..." : mode === "create" ? "Crear producto" : "Guardar cambios"}
        </button>
        <Link
          href="/dashboard/vehiculos"
          className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
