"use client"

import { useAuth } from "@/components/auth-context"
import { useEffect, useState } from "react"
import { User, Store, MapPin, Database, Mail, ShieldCheck, Users } from "lucide-react"

export default function ProfilePage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<{ total_customers: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfileStats = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch("http://127.0.0.1:5000/api/stats", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch profile stats", error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchProfileStats()
    }
  }, [user])

  if (!user) return null

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Shop Profile</h1>
          <p className="text-slate-400">Manage your shop details and view data summary</p>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
          <ShieldCheck className="h-8 w-8" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Details */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-white">
            <User className="h-5 w-5 text-sky-400" />
            Owner Details
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Full Name</p>
                <p className="font-medium text-white">{user.ownerName || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Email Address</p>
                <p className="font-medium text-white">{user.email || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Shop Details */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-white">
            <Store className="h-5 w-5 text-sky-400" />
            Shop Information
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Shop Name</p>
                <p className="font-medium text-white">{user.shopName || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Location</p>
                <p className="font-medium text-white">{user.location || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Summary */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-white">
          <Database className="h-5 w-5 text-sky-400" />
          Data Summary
        </h2>
        <div className="flex items-center justify-between rounded-2xl bg-slate-950/50 p-6 border border-white/5">
          <div className="space-y-1">
            <p className="text-sm text-slate-400">Total Customer Records</p>
            <p className="text-4xl font-bold text-white">
              {loading ? "..." : stats?.total_customers || 0}
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-sky-500/20 flex items-center justify-center">
             <Users className="h-6 w-6 text-sky-500" />
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          This count represents all unique customers stored in the database for your shop ID.
        </p>
      </div>
    </div>
  )
}
