import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { listReservas } from "@/lib/actions/admin-reservas"
import { ReservaEstadoActions } from "@/components/ReservaEstadoActions"
import { Calendar, User, Truck } from "lucide-react"

function formatDate(d: Date | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function DashboardReservasPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.rol?.toUpperCase() !== "ADMINISTRADOR") redirect("/login")

  const reservas = await listReservas()

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Reservas</h1>
      <p className="text-gray-600 mb-8">Administra las reservas del sistema.</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Listado de reservas</h2>
        </div>
        <div className="overflow-x-auto">
          {reservas.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No hay reservas registradas.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">ID</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Cliente</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Vehículo</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Fecha reserva</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Inicio</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Fin</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Costo</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((r) => (
                  <tr key={r.idres} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm text-gray-900">{r.idres}</td>
                    <td className="px-6 py-4">
                      {r.usuario ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-900">
                          <User className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>
                            {([r.usuario.nomprop, r.usuario.apeprop].filter(Boolean).join(" ") || r.usuario.emailprop) ?? "—"}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {r.vehiculo ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-900">
                          <Truck className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>
                            {[r.vehiculo.plaveh, r.vehiculo.marveh, r.vehiculo.modveh].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(r.fechares)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(r.fechainicio)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(r.fechafin)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {r.costo != null ? `S/ ${r.costo}` : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <ReservaEstadoActions
                        idres={r.idres}
                        estadoActual={r.estado}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
