"use client"

import { useState } from "react"
import { updateReservaEstado, type EstadoReserva } from "@/lib/actions/admin-reservas"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"

const ESTADOS: { value: EstadoReserva; label: string; color: string }[] = [
  { value: "PENDIENTE", label: "Pendiente", color: "bg-amber-100 text-amber-800" },
  { value: "CONFIRMADA", label: "Confirmada", color: "bg-blue-100 text-blue-800" },
  { value: "FINALIZADA", label: "Finalizada", color: "bg-green-100 text-green-800" },
  { value: "CANCELADA", label: "Cancelada", color: "bg-red-100 text-red-800" },
]

export function ReservaEstadoActions({
  idres,
  estadoActual,
}: {
  idres: number
  estadoActual: EstadoReserva | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const current = ESTADOS.find((e) => e.value === estadoActual) ?? ESTADOS[0]

  async function handleChange(estado: EstadoReserva) {
    setLoading(true)
    const result = await updateReservaEstado(idres, estado)
    setOpen(false)
    if (result.ok) {
      toast.success("Estado actualizado.")
      router.refresh()
    } else {
      toast.error(result.error ?? "Error al actualizar.")
    }
    setLoading(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={loading}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${current.color} hover:opacity-90 disabled:opacity-50`}
      >
        {current.label}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <ul className="absolute left-0 top-full mt-1 z-20 min-w-[140px] bg-white rounded-lg shadow-lg border border-gray-200 py-1">
            {ESTADOS.map((e) => (
              <li key={e.value}>
                <button
                  type="button"
                  onClick={() => handleChange(e.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${e.value === estadoActual ? "bg-gray-50 font-medium" : ""}`}
                >
                  {e.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
