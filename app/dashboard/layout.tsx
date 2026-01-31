import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { AdminSidebar } from "@/components/AdminSidebar"
import { DashboardWithInactivity } from "@/components/DashboardWithInactivity"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.rol?.toUpperCase() !== "ADMINISTRADOR") redirect("/login")

  return (
    <DashboardWithInactivity>
      <div className="flex h-screen overflow-hidden bg-gray-100">
        <AdminSidebar />
        <main className="flex-1 min-h-0 overflow-auto">{children}</main>
      </div>
    </DashboardWithInactivity>
  )
}
