import { redirect } from "next/navigation"
import { auth } from "@/auth"

export default async function HomePage() {
  const session = await auth()
  if (session?.user && session.user.rol?.toUpperCase() === "ADMINISTRADOR") {
    redirect("/dashboard")
  }
  redirect("/login")
}
