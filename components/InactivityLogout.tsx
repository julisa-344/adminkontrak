"use client"

import { useEffect, useRef, useCallback } from "react"
import { signOut } from "next-auth/react"

const INACTIVITY_MINUTES = 15

export function InactivityLogout() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    timeoutRef.current = setTimeout(() => {
      signOut({ callbackUrl: "/login" })
    }, INACTIVITY_MINUTES * 60 * 1000)
  }, [])

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"]

    resetTimer()

    function onActivity() {
      resetTimer()
    }

    events.forEach((ev) => window.addEventListener(ev, onActivity))

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity))
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [resetTimer])

  return null
}
