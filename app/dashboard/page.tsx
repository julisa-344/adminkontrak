import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { EstadoVehiculo } from "@prisma/client"
import { Truck, Calendar, Users, ArrowRight } from "lucide-react"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.rol?.toUpperCase() !== "ADMINISTRADOR") redirect("/login")

  const [totalVehiculos, totalReservas, totalUsuarios] = await Promise.all([
    prisma.vehiculo.count(),
    prisma.reserva.count(),
    prisma.usuario.count(),
  ])
  const vehiculosDisponibles = await prisma.vehiculo.count({
    where: { estveh: EstadoVehiculo.DISPONIBLE },
  })

  const cards = [
    {
      title: "Productos",
      value: totalVehiculos,
      sub: `${vehiculosDisponibles} disponibles`,
      href: "/dashboard/vehiculos",
      icon: Truck,
      color: "bg-blue-500",
    },
    {
      title: "Reservas",
      value: totalReservas,
      sub: "Total de reservas",
      href: "/dashboard/reservas",
      icon: Calendar,
      color: "bg-amber-500",
    },
    {
      title: "Usuarios",
      value: totalUsuarios,
      sub: "Registrados",
      href: "/dashboard/usuarios",
      icon: Users,
      color: "bg-emerald-500",
    },
  ]

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
      <p className="text-gray-600 mb-8">Gestiona productos, reservas y usuarios desde aquí.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              href={card.href}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-primary/20 transition flex items-start gap-4"
            >
              <div className={`p-3 rounded-lg ${card.color} text-white`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500">{card.sub}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </Link>
          )
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones rápidas</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/dashboard/vehiculos/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition"
          >
            <Truck className="w-4 h-4" />
            Agregar producto / vehículo
          </Link>
          <Link
            href="/dashboard/vehiculos"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
          >
            Ver todos los productos
          </Link>
        </div>
      </div>
    </div>
  )
}
