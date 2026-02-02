'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Edit, Trash2, Eye, Check, X } from 'lucide-react'
import { deleteMarca } from '@/lib/actions/admin-marcas'

interface Marca {
  id: number
  nombre: string
  descripcion: string | null
  logo_url: string | null
  activa: boolean
  created_at: Date
  updated_at: Date
  _count: {
    vehiculos: number
  }
}

interface MarcasTableProps {
  marcas: Marca[]
}

export function MarcasTable({ marcas }: MarcasTableProps) {
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar la marca "${nombre}"?`)) {
      return
    }

    setIsDeleting(id)
    try {
      const result = await deleteMarca(id)
      if (!result.success) {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      alert('Error al eliminar la marca')
    } finally {
      setIsDeleting(null)
    }
  }

  if (marcas.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No hay marcas registradas aún</p>
        <Link 
          href="/dashboard/marcas/nueva"
          className="mt-4 inline-block text-primary hover:underline"
        >
          Crear primera marca
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Logo
            </th>
            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Nombre
            </th>
            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Descripción
            </th>
            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Vehículos
            </th>
            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Creado
            </th>
            <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {marcas.map((marca) => (
            <tr key={marca.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="w-12 h-12 relative">
                  {marca.logo_url ? (
                    <Image
                      src={marca.logo_url}
                      alt={`Logo de ${marca.nombre}`}
                      fill
                      className="object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-gray-400">Sin logo</span>
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{marca.nombre}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-gray-600 max-w-xs truncate">
                  {marca.descripcion || '—'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {marca.activa ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    <Check className="w-3 h-3" />
                    Activa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    <X className="w-3 h-3" />
                    Inactiva
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                {marca._count.vehiculos} vehículo{marca._count.vehiculos !== 1 ? 's' : ''}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                {new Date(marca.created_at).toLocaleDateString('es-ES')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/dashboard/marcas/${marca.id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 transition"
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/dashboard/marcas/${marca.id}/editar`}
                    className="p-2 text-gray-400 hover:text-yellow-600 transition"
                    title="Editar marca"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(marca.id, marca.nombre)}
                    disabled={isDeleting === marca.id || marca._count.vehiculos > 0}
                    className="p-2 text-gray-400 hover:text-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      marca._count.vehiculos > 0 
                        ? "No se puede eliminar: tiene vehículos asociados"
                        : "Eliminar marca"
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}