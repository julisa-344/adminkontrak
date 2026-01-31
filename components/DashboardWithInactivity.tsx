"use client"

import { InactivityLogout } from "@/components/InactivityLogout"

export function DashboardWithInactivity({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InactivityLogout />
      {children}
    </>
  )
}
