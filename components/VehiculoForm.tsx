"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
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
  const d = defaultValues ?? {}

  // Manejar cambio de archivo de imagen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    
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
        toast.success(mode === "create" ? "Producto creado" : "Producto actualizado")
        router.push("/dashboard/vehiculos")
        router.refresh()
      } else {
        toast.error(res.error ?? "Error")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Placa *</label>
          <input
            type="text"
            name="plaveh"
            required
            defaultValue={d.plaveh ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Ej. EXC-20T"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
          <input
            type="text"
            name="marveh"
            required
            defaultValue={d.marveh ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Ej. Caterpillar"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
          <input
            type="text"
            name="modveh"
            required
            defaultValue={d.modveh ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Ej. Excavadora 20T"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
          <input
            type="text"
            name="categoria"
            defaultValue={d.categoria ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Ej. Maquinaria Pesada"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Precio alquiler (S/) *</label>
          <input
            type="number"
            name="precioalquilo"
            required
            min={0}
            step={0.01}
            defaultValue={d.precioalquilo ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
          <input
            type="number"
            name="anioveh"
            min={1900}
            max={2100}
            defaultValue={d.anioveh ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="2023"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad</label>
          <input
            type="text"
            name="capacidad"
            defaultValue={d.capacidad ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Ej. 1.2 m³"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dimensiones</label>
          <input
            type="text"
            name="dimensiones"
            defaultValue={d.dimensiones ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Ej. 9.5m x 2.8m"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
          <input
            type="number"
            name="peso"
            min={0}
            step={0.01}
            defaultValue={d.peso ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Potencia</label>
          <input
            type="number"
            name="potencia"
            min={0}
            step={0.01}
            defaultValue={d.potencia ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Horas de uso</label>
          <input
            type="number"
            name="horas_uso"
            min={0}
            step={0.01}
            defaultValue={d.horas_uso ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="0"
          />
        </div>
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
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Accesorios</label>
          <input
            type="text"
            name="accesorios"
            defaultValue={d.accesorios ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Opcional"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imagen del vehículo
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          />
          <p className="text-xs text-gray-500 mt-1">
            Formatos aceptados: JPG, PNG, WEBP. Tamaño máximo: 5MB
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
        <div className="flex items-center">
          <input
            type="checkbox"
            name="requiere_certificacion"
            value="true"
            defaultChecked={d.requiere_certificacion ?? false}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label className="ml-2 text-sm text-gray-700">Requiere certificación</label>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Guardando..." : mode === "create" ? "Crear producto" : "Guardar cambios"}
        </button>
        <Link
          href="/dashboard/vehiculos"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
