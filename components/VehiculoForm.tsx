"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { EstadoVehiculo } from "@prisma/client"

// Imports para selects con crear
import { SelectConCrear, type SelectOption } from "@/components/ui/SelectConCrear"
import { getCategoriasActivas, createCategoriaRapida } from "@/lib/actions/admin-categorias"
import { getMarcasActivas, createMarcaRapida } from "@/lib/actions/admin-marcas"
import { getModelosPorMarca, createModeloRapido } from "@/lib/actions/admin-modelos"

type VehiculoFormProps = {
  mode: "create" | "edit"
  idveh?: number
  defaultValues?: {
    plaveh?: string | null
    marveh?: string | null
    modveh?: string | null
    categoria?: string | null
    categoria_id?: number | null
    marca_id?: number | null
    modelo_id?: number | null
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

// Tipos de errores de validacion
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
  categoria_id?: string
  marca_id?: string
  modelo_id?: string
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

  // Estados para los selects
  const [categorias, setCategorias] = useState<SelectOption[]>([])
  const [marcas, setMarcas] = useState<SelectOption[]>([])
  const [modelos, setModelos] = useState<SelectOption[]>([])
  const [loadingCategorias, setLoadingCategorias] = useState(true)
  const [loadingMarcas, setLoadingMarcas] = useState(true)
  const [loadingModelos, setLoadingModelos] = useState(false)

  // Valores seleccionados
  const [categoriaId, setCategoriaId] = useState<number | null>(d.categoria_id || null)
  const [marcaId, setMarcaId] = useState<number | null>(d.marca_id || null)
  const [modeloId, setModeloId] = useState<number | null>(d.modelo_id || null)

  // Cargar categorias y marcas al montar
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [categoriasData, marcasData] = await Promise.all([
          getCategoriasActivas(),
          getMarcasActivas()
        ])
        setCategorias(categoriasData.map(c => ({ id: c.id, nombre: c.nombre })))
        setMarcas(marcasData.map(m => ({ id: m.id, nombre: m.nombre })))
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error)
      } finally {
        setLoadingCategorias(false)
        setLoadingMarcas(false)
      }
    }
    loadInitialData()
  }, [])

  // Cargar modelos cuando cambia la marca
  useEffect(() => {
    async function loadModelos() {
      if (!marcaId) {
        setModelos([])
        setModeloId(null)
        return
      }

      setLoadingModelos(true)
      try {
        const modelosData = await getModelosPorMarca(marcaId)
        setModelos(modelosData.map(m => ({ id: m.id, nombre: m.nombre })))
        
        // Si el modelo actual no pertenece a la nueva marca, limpiarlo
        if (modeloId) {
          const modeloExiste = modelosData.some(m => m.id === modeloId)
          if (!modeloExiste) {
            setModeloId(null)
          }
        }
      } catch (error) {
        console.error('Error al cargar modelos:', error)
        setModelos([])
      } finally {
        setLoadingModelos(false)
      }
    }
    loadModelos()
  }, [marcaId])

  // Handlers para crear nuevos items
  const handleCreateCategoria = async (nombre: string) => {
    const result = await createCategoriaRapida(nombre)
    if (result.success && result.categoria) {
      setCategorias(prev => [...prev, { id: result.categoria!.id, nombre: result.categoria!.nombre }])
      return { success: true, id: result.categoria.id }
    }
    return { success: false, error: result.error }
  }

  const handleCreateMarca = async (nombre: string) => {
    const result = await createMarcaRapida(nombre)
    if (result.success && result.marca) {
      setMarcas(prev => [...prev, { id: result.marca!.id, nombre: result.marca!.nombre }])
      return { success: true, id: result.marca.id }
    }
    return { success: false, error: result.error }
  }

  const handleCreateModelo = async (nombre: string) => {
    if (!marcaId) {
      return { success: false, error: 'Primero selecciona una marca' }
    }
    const result = await createModeloRapido(nombre, marcaId)
    if (result.success && result.modelo) {
      setModelos(prev => [...prev, { id: result.modelo!.id, nombre: result.modelo!.nombre }])
      return { success: true, id: result.modelo.id }
    }
    return { success: false, error: result.error }
  }

  // Validacion de placa
  const validatePlaca = useCallback((value: string): string | undefined => {
    if (!value.trim()) return "La placa es obligatoria"
    if (value.length < 5 || value.length > 10) return "La placa debe tener entre 5 y 10 caracteres"
    if (!/^[A-Za-z0-9-]+$/.test(value)) return "La placa solo puede contener letras, numeros y guiones"
    return undefined
  }, [])

  // Validacion de precio
  const validatePrecio = useCallback((value: string): string | undefined => {
    if (!value) return "El precio es obligatorio"
    const num = parseFloat(value)
    if (isNaN(num)) return "El precio debe ser un numero valido"
    if (num < 0) return "El precio no puede ser negativo"
    if (num > 1000000) return "El precio parece demasiado alto (max. 1,000,000)"
    return undefined
  }, [])

  // Validacion de anio
  const validateAnio = useCallback((value: string): string | undefined => {
    if (!value) return undefined // No es obligatorio
    const num = parseInt(value, 10)
    if (isNaN(num)) return "El anio debe ser un numero entero"
    if (num < MIN_YEAR || num > MAX_YEAR) return `El anio debe estar entre ${MIN_YEAR} y ${MAX_YEAR}`
    return undefined
  }, [])

  // Validacion de numeros positivos
  const validatePositive = useCallback((value: string, fieldName: string): string | undefined => {
    if (!value) return undefined // No es obligatorio
    const num = parseFloat(value)
    if (isNaN(num)) return `${fieldName} debe ser un numero valido`
    if (num < 0) return `${fieldName} no puede ser negativo`
    return undefined
  }, [])

  // Validacion de imagen
  const validateImage = useCallback((file: File): string | undefined => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return "Tipo de archivo no valido. Use JPG, PNG, GIF o WebP."
    }
    if (file.size > 5 * 1024 * 1024) {
      return "El archivo es demasiado grande. Maximo 5MB."
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
    const precioalquilo = formData.get('precioalquilo') as string
    const anioveh = formData.get('anioveh') as string
    const peso = formData.get('peso') as string
    const potencia = formData.get('potencia') as string
    const horas_uso = formData.get('horas_uso') as string

    newErrors.plaveh = validatePlaca(plaveh)
    newErrors.precioalquilo = validatePrecio(precioalquilo)
    newErrors.anioveh = validateAnio(anioveh)
    newErrors.peso = validatePositive(peso, 'Peso')
    newErrors.potencia = validatePositive(potencia, 'Potencia')
    newErrors.horas_uso = validatePositive(horas_uso, 'Horas de uso')

    // Validar marca (requerida)
    if (!marcaId) {
      newErrors.marca_id = 'La marca es obligatoria'
    }

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
    
    // Agregar los IDs de los selects al formData
    if (categoriaId) formData.set('categoria_id', String(categoriaId))
    if (marcaId) formData.set('marca_id', String(marcaId))
    if (modeloId) formData.set('modelo_id', String(modeloId))

    // Obtener nombres para compatibilidad con campos de texto existentes
    const marcaSeleccionada = marcas.find(m => m.id === marcaId)
    const modeloSeleccionado = modelos.find(m => m.id === modeloId)
    const categoriaSeleccionada = categorias.find(c => c.id === categoriaId)
    
    if (marcaSeleccionada) formData.set('marveh', marcaSeleccionada.nombre)
    if (modeloSeleccionado) formData.set('modveh', modeloSeleccionado.nombre)
    if (categoriaSeleccionada) formData.set('categoria', categoriaSeleccionada.nombre)
    
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
        res = { ok: false, error: "Accion no configurada" }
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
          {mode === "create" ? "Nuevo producto / vehiculo" : "Editar producto"}
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

        {/* Categoria - SELECT CON CREAR */}
        <SelectConCrear
          label="Categoria"
          name="categoria_id"
          value={categoriaId}
          options={categorias}
          onChange={setCategoriaId}
          onCreateNew={handleCreateCategoria}
          placeholder="Seleccionar categoria..."
          loading={loadingCategorias}
          error={errors.categoria_id}
          createLabel="Crear nueva categoria"
          helpText="Selecciona o crea una categoria para el producto"
        />

        {/* Marca - SELECT CON CREAR */}
        <SelectConCrear
          label="Marca"
          name="marca_id"
          value={marcaId}
          options={marcas}
          onChange={(value) => {
            setMarcaId(value)
            // Limpiar error si se selecciona
            if (value) {
              setErrors(prev => ({ ...prev, marca_id: undefined }))
            }
          }}
          onCreateNew={handleCreateMarca}
          placeholder="Seleccionar marca..."
          required
          loading={loadingMarcas}
          error={errors.marca_id}
          createLabel="Crear nueva marca"
          helpText="Selecciona o crea la marca del producto"
        />

        {/* Modelo - SELECT CON CREAR (depende de marca) */}
        <SelectConCrear
          label="Modelo"
          name="modelo_id"
          value={modeloId}
          options={modelos}
          onChange={setModeloId}
          onCreateNew={handleCreateModelo}
          placeholder={marcaId ? "Seleccionar modelo..." : "Primero selecciona una marca"}
          disabled={!marcaId}
          loading={loadingModelos}
          error={errors.modelo_id}
          createLabel="Crear nuevo modelo"
          helpText={marcaId ? "Selecciona o crea el modelo del producto" : "Selecciona una marca primero"}
        />

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

        {/* Anio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Anio</label>
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
          <p className="mt-1 text-xs text-gray-500">Anio entre {MIN_YEAR} y {MAX_YEAR}</p>
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
            placeholder="Ej. 1.2 m3"
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

        {/* Estado (solo en edicion) */}
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
            placeholder="Opcional (max. 500 caracteres)"
          />
        </div>

        {/* Imagen del vehiculo */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imagen del vehiculo
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
            Formatos aceptados: JPG, PNG, GIF, WEBP. Tamanio maximo: 5MB
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

        {/* Requiere certificacion */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="requiere_certificacion"
            value="true"
            defaultChecked={d.requiere_certificacion ?? false}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label className="ml-2 text-sm text-gray-700">Requiere certificacion del operador</label>
        </div>
      </div>

      {/* Botones de accion */}
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
