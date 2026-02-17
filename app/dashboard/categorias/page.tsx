import { getCategorias } from "@/lib/actions/admin-categorias"
import { CategoriasTable } from "@/components/CategoriasTable"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function CategoriasPage() {
  const categorias = await getCategorias()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de Categorias</h1>
          <p className="text-gray-600">
            Administra las categorias de productos y vehiculos
          </p>
        </div>
        <Link
          href="/dashboard/categorias/nueva"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          <Plus className="w-5 h-5" />
          Nueva Categoria
        </Link>
      </div>

      <div className="bg-white rounded-lg border">
        <CategoriasTable categorias={categorias} />
      </div>
    </div>
  )
}
