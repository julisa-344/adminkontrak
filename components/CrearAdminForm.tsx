"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createAdmin } from "@/lib/actions/admin-usuario"
import { toast } from "sonner"
import { Eye, EyeOff, UserPlus } from "lucide-react"
import { PASSWORD_POLICY_HINT } from "@/lib/password-policy"

export function CrearAdminForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
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

    const result = await createAdmin({ email, nombre, apellido, password })

    if (result.ok) {
      toast.success("Administrador creado.")
      setOpen(false)
      form.reset()
      router.refresh()
    } else {
      toast.error(result.error ?? "Error al crear administrador")
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90"
      >
        <UserPlus className="w-5 h-5" />
        Crear administrador
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Nuevo administrador</h3>
      <p className="text-slate-500 text-xs mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
        {PASSWORD_POLICY_HINT}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-1">
            Correo electrónico *
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="admin@ejemplo.com"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="admin-nombre" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              id="admin-nombre"
              name="nombre"
              type="text"
              autoComplete="given-name"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Juan"
            />
          </div>
          <div>
            <label htmlFor="admin-apellido" className="block text-sm font-medium text-gray-700 mb-1">
              Apellido
            </label>
            <input
              id="admin-apellido"
              name="apellido"
              type="text"
              autoComplete="family-name"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Pérez"
            />
          </div>
        </div>
        <div>
          <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña *
          </label>
          <div className="relative">
            <input
              id="admin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
