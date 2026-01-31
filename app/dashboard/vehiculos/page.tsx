import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getVehiculosAdmin } from "@/lib/actions/admin-vehiculos"
import { VehiculosList } from "@/components/VehiculosList"
import { Plus } from "lucide-react"

export default async function DashboardVehiculosPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.rol?.toUpperCase() !== "ADMINISTRADOR") redirect("/login")

  const vehiculos = await getVehiculosAdmin()

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600 mt-1">Gestiona tu flota de equipos</p>
        </div>
        <Link
          href="/dashboard/vehiculos/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition w-fit"
        >
          <Plus className="w-5 h-5" />
          Agregar producto
        </Link>
      </div>

      <VehiculosList vehiculos={vehiculos} />
    </div>
  )
}
