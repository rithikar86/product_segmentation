"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { fetchCustomers } from "@/lib/api"
import { useAuth } from "@/components/auth-context"

type Customer = {
  id: number | string
  name: string
  email: string
  segment: string
  totalSpent: number
  frequency: number
  sentiment: string
  rfmScore: number
  lastPurchase: string
  [key: string]: any
}

interface CustomerContextValue {
  customers: Customer[]
  loading: boolean
  error: string | null
  refreshCustomers: () => Promise<void>
  isDataUpdated: boolean
  markDataUpdated: () => void
}

const CustomerContext = createContext<CustomerContextValue | undefined>(undefined)

export function CustomersProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDataUpdated, setIsDataUpdated] = useState(false)

  const markDataUpdated = useCallback(() => {
    setIsDataUpdated(true)
  }, [])

  const refreshCustomers = async () => {
    if (!isAuthenticated) return;
    setLoading(true)
    try {
      const data = await fetchCustomers()
      setCustomers(data)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load customers"
      setError(message)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      void refreshCustomers()
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    if (isDataUpdated && !authLoading && isAuthenticated) {
      void refreshCustomers().then(() => setIsDataUpdated(false))
    }
  }, [isDataUpdated, authLoading, isAuthenticated])

  return (
    <CustomerContext.Provider value={{ customers, loading, error, refreshCustomers, isDataUpdated, markDataUpdated }}>
      {children}
    </CustomerContext.Provider>
  )
}

export function useCustomers() {
  const context = useContext(CustomerContext)
  if (!context) {
    throw new Error("useCustomers must be used within CustomersProvider")
  }
  return context
}
