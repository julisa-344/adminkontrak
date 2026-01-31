import Link from "next/link"
import { getAdminCount } from "@/lib/actions/admin-usuario"
import { SetupForm } from "./SetupForm"
import { Shield, AlertCircle, LogIn } from "lucide-react"

export default async function SetupPage() {
  let count: number
  try {
    count = await getAdminCount()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const isConnectionError =
      message.includes("Can't reach database") ||
      message.includes("host:5432") ||
      message.includes("connection")

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-800 rounded-xl shadow-xl border border-red-900/50 p-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <h1 className="text-xl font-bold text-white">Error de conexión a la base de datos</h1>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              {isConnectionError
                ? "No se pudo conectar a la base de datos. Revisa tu archivo .env."
                : "Ocurrió un error al verificar los administradores."}
            </p>
            <ul className="text-slate-400 text-sm list-disc list-inside space-y-1 mb-6">
              <li>Comprueba que <code className="text-slate-300">DATABASE_URL</code> y <code className="text-slate-300">DIRECT_URL</code> en <code className="text-slate-300">.env</code> sean las correctas (Neon u otro servidor).</li>
              <li>Si acabas de cambiar <code className="text-slate-300">.env</code>, <strong className="text-white">reinicia el servidor</strong>: detén con Ctrl+C y vuelve a ejecutar <code className="text-slate-300">npm run dev</code> o <code className="text-slate-300">bun run dev</code>.</li>
            </ul>
            <a
              href="/setup"
              className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Reintentar
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (count > 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary rounded-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Ya hay administradores</h1>
                <p className="text-slate-400 text-sm">Kontrak — Inicia sesión</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Existe al menos un administrador. Usa el login para entrar al panel.
            </p>
            <p className="text-slate-400 text-sm mb-4">
              Si no puedes entrar porque la contraseña no cumple los requisitos (por ejemplo, un admin creado por SQL), actualízala desde la terminal:
            </p>
            <pre className="text-xs bg-slate-900 rounded-lg p-4 text-slate-300 border border-slate-600 mb-6 overflow-x-auto">
              npm run set-admin-password -- tu@email.com NuevaPass123
            </pre>
            <p className="text-slate-500 text-xs mb-6">
              La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula y número (ej: NuevaPass123).
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 w-full justify-center py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90"
            >
              <LogIn className="w-5 h-5" />
              Ir al login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary rounded-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Crear primer administrador</h1>
              <p className="text-slate-400 text-sm">Kontrak — Configuración inicial</p>
            </div>
          </div>

          <p className="text-slate-400 text-sm mb-6">
            Aún no hay administradores. Crea la primera cuenta con la que podrás acceder al panel.
          </p>

          <SetupForm />
        </div>

        <p className="mt-6 text-center text-slate-500 text-sm">
          <a href="/login" className="text-primary hover:underline">
            Volver al login
          </a>
        </p>
      </div>
    </div>
  )
}
