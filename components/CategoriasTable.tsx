'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Edit, Trash2, Check, X } from 'lucide-react'
import { deleteCategoria } from '@/lib/actions/admin-categorias'

interface Categoria {
  id: number
  nombre: string
  descripcion: string | null
  activa: boolean
  created_at: Date
  updated_at: Date
  _count: {
    vehiculos: number
  }
}

interface CategoriasTableProps {
  categorias: Categoria[]
}

export function CategoriasTable({ categorias }: CategoriasTableProps) {
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Estas seguro de eliminar la categoria "${nombre}"?`)) {
      return
    }

    setIsDeleting(id)
    try {
      const result = await deleteCategoria(id)
      if (!result.success) {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      alert('Error al eliminar la categoria')
    } finally {
      setIsDeleting(null)
    }
  }

  if (categorias.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No hay categorias registradas aun</p>
        <Link 
          href="/dashboard/categorias/nueva"
          className="mt-4 inline-block text-primary hover:underline"
        >
          Crear primera categoria
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
          {categorias.map((categoria) => (
            <tr key={categoria.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{categoria.nombre}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-gray-600 max-w-xs truncate">
                  {categoria.descripcion || '—'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {categoria.activa ? (
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
                {categoria._count.vehiculos} vehiculo{categoria._count.vehiculos !== 1 ? 's' : ''}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                {new Date(categoria.created_at).toLocaleDateString('es-ES')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/dashboard/categorias/${categoria.id}/editar`}
                    className="p-2 text-gray-400 hover:text-yellow-600 transition"
                    title="Editar categoria"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(categoria.id, categoria.nombre)}
                    disabled={isDeleting === categoria.id || categoria._count.vehiculos > 0}
                    className="p-2 text-gray-400 hover:text-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      categoria._count.vehiculos > 0 
                        ? "No se puede eliminar: tiene vehiculos asociados"
                        : "Eliminar categoria"
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
