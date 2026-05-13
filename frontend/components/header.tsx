"use client"

import { Search, Bell, Moon, Sun, User, UserCircle } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { useAuth } from "@/components/auth-context"
import { cn } from "@/lib/utils"

export function Header() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { user } = useAuth()

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      {/* Title */}
      <div className="flex flex-col">
        <h1 className="text-sm font-bold text-foreground leading-tight max-w-[200px]">
          Customer Segments and Products for Retail using RFM
        </h1>
        <p className="text-xs text-muted-foreground">
          Electrical & Electronics Retail Intelligence Suite
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="h-9 w-64 rounded-lg border border-border bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
        >
          <Sun className={cn("h-4 w-4", resolvedTheme === "dark" ? "block" : "hidden")} />
          <Moon className={cn("h-4 w-4", resolvedTheme === "dark" ? "hidden" : "block")} />
        </button>

        {/* User Profile */}
        <div className="group relative">
          <button className="flex items-center gap-3 rounded-lg border border-border bg-background p-1.5 transition-colors hover:bg-accent">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold text-foreground leading-none">
                {user?.ownerName || "Account"}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground leading-none">
                {user?.shopName || "Active Shop"}
              </p>
            </div>
          </button>
          
          {/* Tooltip / Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-48 origin-top-right rounded-lg border border-border bg-card p-3 shadow-xl transition-all scale-95 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 group-hover:pointer-events-auto z-50">
            <div className="space-y-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Email</p>
                <p className="text-xs text-foreground truncate">{user?.claims?.email || "n/a"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Location</p>
                <p className="text-xs text-foreground">{user?.claims?.location || "n/a"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
