import { getMarcas } from "@/lib/actions/admin-marcas"
import { MarcasTable } from "@/components/MarcasTable"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function MarcasPage() {
  const marcas = await getMarcas()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Marcas</h1>
          <p className="text-gray-600">
            Administra las marcas de vehículos y sus logos
          </p>
        </div>
        <Link
          href="/dashboard/marcas/nueva"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          <Plus className="w-5 h-5" />
          Nueva Marca
        </Link>
      </div>

      <div className="bg-white rounded-lg border">
        <MarcasTable marcas={marcas} />
      </div>
    </div>
  )
}