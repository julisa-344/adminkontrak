import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { listUsers } from "@/lib/actions/admin-usuario"
// import { CrearAdminForm } from "@/components/CrearAdminForm"
import { Users, Mail, User, Shield } from "lucide-react"

export default async function DashboardUsuariosPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.rol?.toUpperCase() !== "ADMINISTRADOR") redirect("/login")

  const users = await listUsers()

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Usuarios</h1>
      <p className="text-gray-600 mb-8">Gestiona usuarios y administradores.</p>

      {/* Botón de crear administrador temporalmente oculto
      <div className="mb-8">
        <CrearAdminForm />
      </div>
      */}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Listado de usuarios</h2>
        </div>
        <div className="overflow-x-auto">
          {users.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No hay usuarios registrados.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">ID</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Correo</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Rol</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.idprop} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm text-gray-900">{u.idprop}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-900">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {u.emailprop ?? "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-900">
                        <User className="w-4 h-4 text-gray-400" />
                        {[u.nomprop, u.apeprop].filter(Boolean).join(" ") || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                          u.rol?.toUpperCase() === "ADMINISTRADOR"
                            ? "text-primary"
                            : "text-gray-600"
                        }`}
                      >
                        {u.rol?.toUpperCase() === "ADMINISTRADOR" && (
                          <Shield className="w-4 h-4" />
                        )}
                        {u.rol?.toUpperCase() === "ADMINISTRADOR"
                          ? "Administrador"
                          : "Cliente"}
                      </span>
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
