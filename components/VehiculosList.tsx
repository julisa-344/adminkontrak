"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, X, SlidersHorizontal } from "lucide-react"
import { VehiculosTableActions } from "@/components/VehiculosTableActions"
import { EstadoVehiculo } from "@prisma/client"

type VehiculoRow = {
  idveh: number
  plaveh: string | null
  marveh: string | null
  modveh: string | null
  categoria: string | null
  precioalquilo: number | null
  estveh: EstadoVehiculo | null
  fotoveh: string | null
  imagenUrl: string | null
  usuario: { nomprop: string | null; apeprop: string | null; emailprop: string | null } | null
}

const ESTADO_LABELS: Record<string, string> = {
  DISPONIBLE: "Disponible",
  OCUPADO: "Ocupado",
  EN_MANTENIMIENTO: "En mantenimiento",
  FUERA_SERVICIO: "Fuera de servicio",
}

const ESTADO_FILTER_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "OCUPADO", label: "Ocupado" },
  { value: "EN_MANTENIMIENTO", label: "En mantenimiento" },
  { value: "FUERA_SERVICIO", label: "Fuera de servicio" },
]

export function VehiculosList({ vehiculos }: { vehiculos: VehiculoRow[] }) {
  const [search, setSearch] = useState("")
  const [estadoFilter, setEstadoFilter] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vehiculos.filter((v) => {
      const matchSearch =
        !q ||
        (v.plaveh?.toLowerCase().includes(q) ||
          v.marveh?.toLowerCase().includes(q) ||
          v.modveh?.toLowerCase().includes(q) ||
          v.categoria?.toLowerCase().includes(q))
      const matchEstado = !estadoFilter || v.estveh === estadoFilter
      return matchSearch && matchEstado
    })
  }, [vehiculos, search, estadoFilter])

  const hasFilters = search.trim() !== "" || estadoFilter !== ""

  function clearFilters() {
    setSearch("")
    setEstadoFilter("")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar por código, marca, modelo o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {ESTADO_FILTER_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-500">
        {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {vehiculos.length === 0 ? (
              <>
                <p className="mb-4">No hay productos registrados.</p>
                <Link
                  href="/dashboard/vehiculos/nuevo"
                  className="text-primary font-medium hover:underline"
                >
                  Agregar el primero
                </Link>
              </>
            ) : (
              <>
                <p className="mb-4">No hay resultados para tu búsqueda o filtros.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-primary font-medium hover:underline"
                >
                  Limpiar filtros
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Imagen
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Código / Modelo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Categoría
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Precio alquiler
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filtered.map((v) => (
                  <tr key={v.idveh} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="w-14 h-14 relative rounded overflow-hidden bg-gray-100">
                        {(v.imagenUrl || v.fotoveh) ? (
                          <Image
                            src={(v.imagenUrl || v.fotoveh)!}
                            alt={v.modveh ?? ""}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            Sin img
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{v.modveh ?? "—"}</div>
                      <div className="text-sm text-gray-500">{v.plaveh ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{v.categoria ?? "—"}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      S/ {(v.precioalquilo ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          v.estveh === EstadoVehiculo.DISPONIBLE
                            ? "bg-green-100 text-green-800"
                            : v.estveh === EstadoVehiculo.EN_MANTENIMIENTO
                            ? "bg-amber-100 text-amber-800"
                            : v.estveh === EstadoVehiculo.OCUPADO
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {ESTADO_LABELS[v.estveh ?? ""] ?? v.estveh ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <VehiculosTableActions
                        idveh={v.idveh}
                        estveh={v.estveh}
                        modveh={v.modveh ?? ""}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
