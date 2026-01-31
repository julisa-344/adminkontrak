"use server"

import { EstadoVehiculo } from "@prisma/client"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export type ResultOk = { ok: true }
export type ResultErr = { ok: false; error: string }
export type Result = ResultOk | ResultErr

export async function ponerVehiculoEnMantenimiento(
  idveh: number,
  revalidateRoute: string = "/dashboard/vehiculos"
): Promise<Result> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: "No autenticado" }
  if (session.user.rol?.toUpperCase() !== "ADMINISTRADOR") {
    return { ok: false, error: "Sin permiso: solo administradores" }
  }

  const vehiculo = await prisma.vehiculo.findUnique({ where: { idveh } })
  if (!vehiculo) return { ok: false, error: "Vehículo no encontrado" }
  if (vehiculo.estveh !== EstadoVehiculo.DISPONIBLE) {
    return { ok: false, error: "Solo se puede enviar a mantenimiento un vehículo DISPONIBLE" }
  }

  await prisma.vehiculo.update({
    where: { idveh },
    data: { estveh: EstadoVehiculo.EN_MANTENIMIENTO },
  })
  revalidatePath(revalidateRoute)
  return { ok: true }
}
