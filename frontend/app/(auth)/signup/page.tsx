"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signUp } from "@/lib/api"
import { useAuth } from "@/components/auth-context"

export default function SignUpPage() {
  const router = useRouter()
  const { login: authLogin } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [shopName, setShopName] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [location, setLocation] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await signUp({ 
        email, 
        password, 
        shopName,
        ownerName,
        location 
      })
      setLoading(false)

      if (response?.success && response.accessToken) {
        // Save to localStorage using explicit keys as requested
        localStorage.setItem("accessToken", response.accessToken)
        localStorage.setItem("shopId", response.shopId)
        localStorage.setItem("shopName", response.shopName || shopName)
        
        // Also keep standard keys for compatibility with other parts of the app
        localStorage.setItem("token", response.accessToken)
        localStorage.setItem("shop_id", response.shopId)
        localStorage.setItem("user_details", JSON.stringify({
          ownerName: response.ownerName || ownerName,
          shopName: response.shopName || shopName,
          location: response.location || location,
          email: email
        }))

        // Update global context
        authLogin(response.accessToken, response.shopId, {
          ownerName: response.ownerName || ownerName,
          shopName: response.shopName || shopName,
          location: response.location || location,
          email: email
        })
        
        // Navigation
        const redirectPath = response.redirect || "/dashboard"
        router.push(redirectPath)
        return
      }

      setError(response?.error || "Unable to create account. Please try again.")
    } catch (err) {
      setLoading(false)
      setError("An unexpected error occurred. Please try again.")
    }
  }

  return (
    <div className="grid gap-8">
      <div className="space-y-3 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/70">Retail Analytics</p>
        <h1 className="text-3xl font-semibold text-white">Create your Retail Insights account</h1>
        <p className="mx-auto max-w-xl text-sm text-slate-400">
          Sign up to manage your shop, analyze customer behavior, and send personalized offers.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-black/20"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="ownerName" className="block text-sm font-medium text-slate-300">
              Owner Name
            </label>
            <input
              id="ownerName"
              type="text"
              required
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="shopName" className="block text-sm font-medium text-slate-300">
              Shop Name
            </label>
            <input
              id="shopName"
              type="text"
              required
              value={shopName}
              onChange={(event) => setShopName(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              placeholder="My Store Analytics"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="location" className="block text-sm font-medium text-slate-300">
            Location
          </label>
          <input
            id="location"
            type="text"
            required
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            placeholder="e.g. New York, USA"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-slate-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            placeholder="you@business.com"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-slate-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            placeholder="Create a secure password"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/signin" className="font-semibold text-sky-300 hover:text-sky-200">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
