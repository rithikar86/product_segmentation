"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  PieChart,
  Users,
  Package,
  Play,
  Upload,
  ChevronLeft,
  ChevronRight,
  MessageSquareWarning,
  Boxes,
  MapPin,
  Store,
  LogOut,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-context"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Segmentation Analysis", href: "/segmentation", icon: PieChart },
  { name: "Customer Insights", href: "/customers", icon: Users },
  { name: "Feedback Insights", href: "/insights", icon: MessageSquareWarning },
  { name: "Product Recommendations", href: "/recommendations", icon: Package },
  { name: "Inventory Management", href: "/inventory", icon: Boxes },
  { name: "Simulator", href: "/simulator", icon: Play },
  { name: "Data Upload", href: "/upload", icon: Upload },
  { name: "Shop Profile", href: "/profile", icon: User },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-card transition-sidebar",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <PieChart className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-xs font-bold text-foreground leading-tight">
              Customer Segments & Products
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Footer */}
      <div className="border-t border-border p-4">
        {!collapsed && user ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Store className="mt-0.5 h-3.5 w-3.5 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground truncate w-44">
                  {user.shopName || "Unknown Shop"}
                </p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{user.location || "Unknown Location"}</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>

            <div className="h-px bg-border/50 w-full" />
            <p className="text-[10px] text-muted-foreground/70 text-center">
              Retail Intelligence Suite v1.2
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
             <Store className="h-4 w-4 text-primary/50" />
             {collapsed && (
               <button onClick={logout} className="text-rose-400 hover:text-rose-300">
                 <LogOut className="h-4 w-4" />
               </button>
             )}
          </div>
        )}
      </div>
    </aside>
  )
}
