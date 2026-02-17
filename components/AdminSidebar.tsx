"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Truck, 
  Calendar, 
  Users, 
  LogOut, 
  ExternalLink, 
  Shield, 
  Tag, 
  Upload,
  ChevronDown,
  ChevronRight,
  Package,
  FolderOpen,
  Boxes
} from "lucide-react"
import { signOut } from "next-auth/react"

// Items del submenu Catalogo
const catalogoItems = [
  { href: "/dashboard/vehiculos", label: "Productos", icon: Package },
  { href: "/dashboard/vehiculos/carga-masiva", label: "Carga Masiva", icon: Upload },
  { href: "/dashboard/categorias", label: "Categorias", icon: FolderOpen },
  { href: "/dashboard/marcas", label: "Marcas", icon: Tag },
  { href: "/dashboard/modelos", label: "Modelos", icon: Boxes },
]

// Items principales del menu
const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/reservas", label: "Reservas", icon: Calendar },
  { href: "/dashboard/usuarios", label: "Usuarios", icon: Users },
  { href: "/dashboard/auditoria", label: "Auditoria", icon: Shield },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [catalogoOpen, setCatalogoOpen] = useState(() => {
    // Abrir por defecto si estamos en alguna pagina del catalogo
    return catalogoItems.some(item => 
      pathname === item.href || pathname.startsWith(item.href)
    )
  })

  // Verificar si alguna ruta del catalogo esta activa
  const isCatalogoActive = catalogoItems.some(item => 
    pathname === item.href || 
    (item.href !== "/dashboard/vehiculos" && pathname.startsWith(item.href)) ||
    (item.href === "/dashboard/vehiculos" && pathname === "/dashboard/vehiculos")
  )

  return (
    <aside className="w-64 h-screen flex-shrink-0 bg-slate-900 text-white flex flex-col overflow-hidden">
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white">Panel Admin</h2>
        <p className="text-sm text-slate-400">Kontrak</p>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Inicio */}
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
            pathname === "/dashboard"
              ? "bg-primary text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          Inicio
        </Link>

        {/* Submenu Catalogo */}
        <div>
          <button
            type="button"
            onClick={() => setCatalogoOpen(!catalogoOpen)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition ${
              isCatalogoActive && !catalogoOpen
                ? "bg-primary/20 text-primary"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5" />
              <span>Catalogo</span>
            </div>
            {catalogoOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {/* Items del submenu */}
          {catalogoOpen && (
            <div className="mt-1 ml-4 pl-4 border-l border-slate-700 space-y-1">
              {catalogoItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard/vehiculos" && pathname.startsWith(item.href)) ||
                  (item.href === "/dashboard/vehiculos" && pathname === "/dashboard/vehiculos")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                      isActive
                        ? "bg-primary text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Otros items del menu */}
        {navItems.filter(item => item.href !== "/dashboard").map((item) => {
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
          Sitio publico
        </a>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-red-400 w-full transition"
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesion
        </button>
      </div>
    </aside>
  )
}
