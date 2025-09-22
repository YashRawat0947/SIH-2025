"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { isAuthenticated } from "@/lib/auth"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [mounted, setMounted] = useState(false) // ✅ client-only flag
  const router = useRouter()

  useEffect(() => {
    setMounted(true) // mark as mounted

    if (!isAuthenticated()) {
      router.push("/auth/login")
      return
    }

    setUser({ name: "Admin User", email: "admin@trainmanager.com" })
  }, [router])

  if (!mounted) return null // ✅ prevent SSR/client mismatch
  if (!isAuthenticated()) return null // redirecting user

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
