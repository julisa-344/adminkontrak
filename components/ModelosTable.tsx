'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Edit, Trash2, Check, X } from 'lucide-react'
import { deleteModelo } from '@/lib/actions/admin-modelos'

interface Modelo {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
  marca_id: number | null
  created_at: Date
  updated_at: Date
  marca: {
    id: number
    nombre: string
    logo_url: string | null
  } | null
  _count: {
    vehiculos: number
  }
}

interface ModelosTableProps {
  modelos: Modelo[]
}

export function ModelosTable({ modelos }: ModelosTableProps) {
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Estas seguro de eliminar el modelo "${nombre}"?`)) {
      return
    }

    setIsDeleting(id)
    try {
      const result = await deleteModelo(id)
      if (!result.success) {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      alert('Error al eliminar el modelo')
    } finally {
      setIsDeleting(null)
    }
  }

  if (modelos.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No hay modelos registrados aun</p>
        <Link 
          href="/dashboard/modelos/nuevo"
          className="mt-4 inline-block text-primary hover:underline"
        >
          Crear primer modelo
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
              Nombre
            </th>
            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Marca
            </th>
            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Descripcion
            </th>
            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
              Vehiculos
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
          {modelos.map((modelo) => (
            <tr key={modelo.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{modelo.nombre}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {modelo.marca ? (
                  <div className="flex items-center gap-2">
                    {modelo.marca.logo_url && (
                      <div className="w-6 h-6 relative flex-shrink-0">
                        <Image
                          src={modelo.marca.logo_url}
                          alt={modelo.marca.nombre}
                          fill
                          className="object-contain rounded"
                        />
                      </div>
                    )}
                    <span className="text-gray-700">{modelo.marca.nombre}</span>
                  </div>
                ) : (
                  <span className="text-gray-400 italic">Sin marca</span>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="text-gray-600 max-w-xs truncate">
                  {modelo.descripcion || '—'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {modelo.activo ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    <Check className="w-3 h-3" />
                    Activo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    <X className="w-3 h-3" />
                    Inactivo
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                {modelo._count.vehiculos} vehiculo{modelo._count.vehiculos !== 1 ? 's' : ''}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                {new Date(modelo.created_at).toLocaleDateString('es-ES')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/dashboard/modelos/${modelo.id}/editar`}
                    className="p-2 text-gray-400 hover:text-yellow-600 transition"
                    title="Editar modelo"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(modelo.id, modelo.nombre)}
                    disabled={isDeleting === modelo.id || modelo._count.vehiculos > 0}
                    className="p-2 text-gray-400 hover:text-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      modelo._count.vehiculos > 0 
                        ? "No se puede eliminar: tiene vehiculos asociados"
                        : "Eliminar modelo"
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
