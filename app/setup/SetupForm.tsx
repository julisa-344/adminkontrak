"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createFirstAdmin } from "@/lib/actions/admin-usuario"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { PASSWORD_POLICY_HINT } from "@/lib/password-policy"

export function SetupForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    const email = (formData.get("email") as string)?.trim()
    const nombre = (formData.get("nombre") as string)?.trim()
    const apellido = (formData.get("apellido") as string)?.trim()
    const password = formData.get("password") as string

    if (!email) {
      toast.error("El correo es obligatorio.")
      setLoading(false)
      return
    }
    if (!password) {
      toast.error("La contraseña es obligatoria.")
      setLoading(false)
      return
    }

    const result = await createFirstAdmin({ email, nombre, apellido, password })

    if (result.ok) {
      toast.success("Administrador creado. Inicia sesión.")
      router.push("/login")
      router.refresh()
    } else {
      toast.error(result.error ?? "Error al crear administrador")
    }
    setLoading(false)
  }

  return (
    <>
      <p className="text-slate-400 text-xs mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
        {PASSWORD_POLICY_HINT}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
            Correo electrónico *
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-slate-300 mb-1">
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              autoComplete="given-name"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Juan"
            />
          </div>
          <div>
            <label htmlFor="apellido" className="block text-sm font-medium text-slate-300 mb-1">
              Apellido
            </label>
            <input
              id="apellido"
              name="apellido"
              type="text"
              autoComplete="family-name"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Pérez"
            />
          </div>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
            Contraseña *
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
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
          {loading ? "Creando..." : "Crear administrador"}
        </button>
      </form>
    </>
  )
}
