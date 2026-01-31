import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { crearVehiculo } from "@/lib/actions/admin-vehiculos"
import { VehiculoForm } from "@/components/VehiculoForm"

export default async function NuevoVehiculoPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.rol?.toUpperCase() !== "ADMINISTRADOR") redirect("/login")

  return (
    <div className="p-8 max-w-4xl">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <VehiculoForm mode="create" onSubmitCreate={crearVehiculo} />
      </div>
    </div>
  )
}
