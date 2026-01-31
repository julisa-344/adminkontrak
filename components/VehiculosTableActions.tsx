"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Pencil, Trash2, Wrench } from "lucide-react"
import { eliminarVehiculo } from "@/lib/actions/admin-vehiculos"
import { ponerVehiculoEnMantenimiento } from "@/lib/actions/admin-vehiculo"
import { EstadoVehiculo } from "@prisma/client"
import { toast } from "sonner"

type Props = {
  idveh: number
  estveh: EstadoVehiculo | null
  modveh: string
}

export function VehiculosTableActions({ idveh, estveh, modveh }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [mantenimiento, setMantenimiento] = useState(false)

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${modveh}"? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    const res = await eliminarVehiculo(idveh)
    setDeleting(false)
    if (res.ok) {
      toast.success("Producto eliminado")
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  async function handleMantenimiento() {
    if (!confirm(`¿Enviar "${modveh}" a mantenimiento?`)) return
    setMantenimiento(true)
    const res = await ponerVehiculoEnMantenimiento(idveh)
    setMantenimiento(false)
    if (res.ok) {
      toast.success("Enviado a mantenimiento")
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/dashboard/vehiculos/${idveh}/editar`}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
        title="Editar"
      >
        <Pencil className="w-4 h-4" />
      </Link>
      {estveh === EstadoVehiculo.DISPONIBLE && (
        <button
          type="button"
          onClick={handleMantenimiento}
          disabled={mantenimiento}
          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition disabled:opacity-50"
          title="Enviar a mantenimiento"
        >
          <Wrench className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
        title="Eliminar"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
