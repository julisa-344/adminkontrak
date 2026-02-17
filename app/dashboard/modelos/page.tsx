import { getModelos } from "@/lib/actions/admin-modelos"
import { ModelosTable } from "@/components/ModelosTable"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function ModelosPage() {
  const modelos = await getModelos()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de Modelos</h1>
          <p className="text-gray-600">
            Administra los modelos de vehiculos y su relacion con marcas
          </p>
        </div>
        <Link
          href="/dashboard/modelos/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          <Plus className="w-5 h-5" />
          Nuevo Modelo
        </Link>
      </div>

      <div className="bg-white rounded-lg border">
        <ModelosTable modelos={modelos} />
      </div>
    </div>
  )
}
