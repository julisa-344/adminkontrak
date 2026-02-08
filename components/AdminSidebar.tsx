"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Truck, Calendar, Users, LogOut, ExternalLink, Shield, Tag, Upload } from "lucide-react"
import { signOut } from "next-auth/react"

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/vehiculos", label: "Productos", icon: Truck },
  { href: "/dashboard/vehiculos/carga-masiva", label: "Carga Masiva", icon: Upload },
  { href: "/dashboard/reservas", label: "Reservas", icon: Calendar },
  { href: "/dashboard/usuarios", label: "Usuarios", icon: Users },
  // { href: "/dashboard/marcas", label: "Marcas", icon: Tag }, // Oculto temporalmente
  { href: "/dashboard/auditoria", label: "Auditoría", icon: Shield },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 h-screen flex-shrink-0 bg-slate-900 text-white flex flex-col overflow-hidden">
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white">Panel Admin</h2>
        <p className="text-sm text-slate-400">Kontrak</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? "bg-primary text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-slate-700 space-y-1">
        <a
          href={"https://kontrak-proyecto.vercel.app"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          <ExternalLink className="w-5 h-5" />
          Sitio público
        </a>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-red-400 w-full transition"
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
