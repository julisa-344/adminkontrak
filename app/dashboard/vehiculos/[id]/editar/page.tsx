import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { actualizarVehiculo } from "@/lib/actions/admin-vehiculos"
import { VehiculoForm } from "@/components/VehiculoForm"

export default async function EditarVehiculoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.rol?.toUpperCase() !== "ADMINISTRADOR") redirect("/login")

  const { id } = await params
  const idveh = parseInt(id, 10)
  if (isNaN(idveh)) notFound()

  const vehiculo = await prisma.vehiculo.findUnique({ where: { idveh } })
  if (!vehiculo) notFound()

  return (
    <div className="p-8 max-w-4xl">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <VehiculoForm
          mode="edit"
          idveh={idveh}
          defaultValues={{
            plaveh: vehiculo.plaveh,
            marveh: vehiculo.marveh,
            modveh: vehiculo.modveh,
            categoria: vehiculo.categoria,
            precioalquilo: vehiculo.precioalquilo,
            fotoveh: vehiculo.fotoveh,
            imagenUrl: vehiculo.imagenUrl,
            anioveh: vehiculo.anioveh,
            capacidad: vehiculo.capacidad,
            dimensiones: vehiculo.dimensiones,
            peso: vehiculo.peso,
            potencia: vehiculo.potencia,
            accesorios: vehiculo.accesorios,
            requiere_certificacion: vehiculo.requiere_certificacion,
            horas_uso: vehiculo.horas_uso,
            estveh: vehiculo.estveh,
          }}
          onSubmitEdit={actualizarVehiculo}
        />
      </div>
    </div>
  )
}
