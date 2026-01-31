"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Eye, EyeOff, Shield } from "lucide-react"
import { PASSWORD_POLICY_HINT } from "@/lib/password-policy"

export default function AdminLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!email?.trim()) {
      toast.error("Ingresa tu correo electrónico.")
      setLoading(false)
      return
    }
    if (!password) {
      toast.error("Ingresa tu contraseña.")
      setLoading(false)
      return
    }

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error(result.error === "CredentialsSignin" ? "Credenciales inválidas o contraseña no cumple la política." : result.error)
      } else {
        toast.success("Acceso concedido")
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      toast.error("Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary rounded-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Panel Admin</h1>
              <p className="text-slate-400 text-sm">KOntrak — Solo administradores</p>
            </div>
          </div>

          <p className="text-slate-400 text-xs mb-6 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            {PASSWORD_POLICY_HINT}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="admin@ejemplo.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-300"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verificando..." : "Iniciar sesión"}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-500 text-sm">
            Este panel es independiente del sitio público. Usa otro dominio en producción para mayor seguridad.
          </p>
          <p className="mt-3 text-center text-slate-500 text-sm">
            <Link
              href="/setup"
              className="inline-block mt-2 px-4 py-2 rounded-lg border border-primary/50 text-primary hover:bg-primary/10 hover:underline focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-800 transition"
            >
              ¿Primera vez? Crear primer administrador
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
