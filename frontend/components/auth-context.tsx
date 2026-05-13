"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"

interface User {
  shopId: string
  shopName: string
  ownerName: string
  location: string
  email: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (token: string, shopId: string, details: Partial<User>) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("accessToken")
    localStorage.removeItem("shop_id")
    localStorage.removeItem("shopId")
    localStorage.removeItem("user_details")
    setUser(null)
    setToken(null)
    router.push("/signin")
  }, [router])

  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken") || localStorage.getItem("token")
    const storedShopId = localStorage.getItem("shopId") || localStorage.getItem("shop_id")
    const storedDetails = localStorage.getItem("user_details")

    if (storedToken && storedShopId && storedDetails) {
      try {
        setToken(storedToken)
        setUser({
          shopId: storedShopId,
          ...JSON.parse(storedDetails)
        })
      } catch (e) {
        console.error("Failed to parse stored user details", e)
        logout()
      }
    } else if (pathname !== "/signin" && pathname !== "/signup") {
      // Redirect if not on an auth page and no credentials
      router.push("/signin")
    }
    setLoading(false)
  }, [pathname, logout, router])

  const login = (newToken: string, shopId: string, details: Partial<User>) => {
    localStorage.setItem("token", newToken)
    localStorage.setItem("accessToken", newToken)
    localStorage.setItem("shop_id", shopId)
    localStorage.setItem("shopId", shopId)
    localStorage.setItem("user_details", JSON.stringify(details))
    
    setToken(newToken)
    setUser({ shopId, ...details } as User)
    router.push("/dashboard")
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
