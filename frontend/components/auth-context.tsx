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

  // Initialize auth from localStorage on mount only
  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken") || localStorage.getItem("token")
    const storedShopId = localStorage.getItem("shopId") || localStorage.getItem("shop_id")
    const storedDetails = localStorage.getItem("user_details")

    try {
      if (storedToken && storedShopId && storedDetails) {
        const parsedDetails = JSON.parse(storedDetails)
        setToken(storedToken)
        setUser({
          shopId: storedShopId,
          ...parsedDetails
        })
      }
    } catch (e) {
      console.error("Failed to parse stored user details:", e)
      localStorage.removeItem('user_details')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('shopId')
      localStorage.removeItem('shop_id')
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }, [])

  // Redirect to signin if not authenticated and not on auth page
  useEffect(() => {
    if (loading) return
    
    const isAuthPage = pathname === "/signin" || pathname === "/signup" || pathname?.startsWith("/auth")
    const isAuthenticated = !!token
    
    if (!isAuthenticated && !isAuthPage && pathname) {
      router.push("/signin")
    }
  }, [token, pathname, loading, router])

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
