import { getAuditLogs, getAuditStats } from "@/lib/prisma"
import { AuditAction } from "@prisma/client"
import { Clock, User, Eye, Plus, Edit, Trash2, LogIn, LogOut, AlertTriangle } from "lucide-react"

export default async function AuditoriaPage() {
  const [logs, stats] = await Promise.all([
    getAuditLogs({ limit: 100 }),
    getAuditStats()
  ])

  const getActionIcon = (operacion: AuditAction) => {
    switch (operacion) {
      case AuditAction.CREATE:
        return <Plus className="w-4 h-4 text-green-500" />
      case AuditAction.UPDATE:
        return <Edit className="w-4 h-4 text-blue-500" />
      case AuditAction.DELETE:
        return <Trash2 className="w-4 h-4 text-red-500" />
      case AuditAction.LOGIN:
        return <LogIn className="w-4 h-4 text-emerald-500" />
      case AuditAction.LOGOUT:
        return <LogOut className="w-4 h-4 text-gray-500" />
      case AuditAction.FAILED_LOGIN:
        return <AlertTriangle className="w-4 h-4 text-orange-500" />
      default:
        return <Eye className="w-4 h-4 text-gray-500" />
    }
  }

  const getActionColor = (operacion: AuditAction) => {
    switch (operacion) {
      case AuditAction.CREATE:
        return "bg-green-100 text-green-800"
      case AuditAction.UPDATE:
        return "bg-blue-100 text-blue-800"
      case AuditAction.DELETE:
        return "bg-red-100 text-red-800"
      case AuditAction.LOGIN:
        return "bg-emerald-100 text-emerald-800"
      case AuditAction.LOGOUT:
        return "bg-gray-100 text-gray-800"
      case AuditAction.FAILED_LOGIN:
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auditoría del Sistema</h1>
        <p className="text-gray-600">
          Registro de todas las actividades y cambios en el sistema
        </p>
      </div>

      {/* Estadísticas de auditoría */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Eventos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        {stats.porOperacion.map((stat) => (
          <div key={stat.operacion} className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {stat.operacion.charAt(0) + stat.operacion.slice(1).toLowerCase().replace('_', ' ')}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stat._count.operacion}</p>
              </div>
              {getActionIcon(stat.operacion)}
            </div>
          </div>
        ))}
      </div>

      {/* Tabla de logs de auditoría */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Registro de Actividades</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Fecha/Hora
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Acción
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Tabla
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Registro
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Comentario
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {new Date(log.fecha_cambio).toLocaleDateString('es-ES')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.fecha_cambio).toLocaleTimeString('es-ES')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.operacion)}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.operacion)}`}>
                        {log.operacion.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                    {log.tabla}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {log.registro_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.usuario ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-col">
                          <span className="text-gray-900 font-medium">
                            {log.usuario.nomprop} {log.usuario.apeprop}
                          </span>
                          <span className="text-xs text-gray-500">
                            {log.usuario_email}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500">Sistema</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono text-xs">
                    {log.ip_address || '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                    {log.comentario || '—'}
                  </td>
                </tr>
              ))}
              
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No hay registros de auditoría aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}