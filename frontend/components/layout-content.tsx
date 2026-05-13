"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useAuth } from "@/components/auth-context"

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { loading } = useAuth()
  const isAuthPage =
    pathname === "/signin" ||
    pathname === "/signup" ||
    pathname?.startsWith("/auth")

  if (!pathname) {
    return null
  }

  if (isAuthPage) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
