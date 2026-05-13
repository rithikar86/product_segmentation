"use client"

import { FormEvent, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "@/lib/api"
import { useAuth } from "@/components/auth-context"

export default function SignInPage() {
  const router = useRouter()
  const { login: authLogin, isAuthenticated } = useAuth()
  
  // States as requested by user
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [shopName, setShopName] = useState("")
  const [location, setLocation] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await signIn({ email, password })
      setLoading(false)

      if (response?.success && response.accessToken) {
        // Save to local states first (optional, but requested)
        const details = {
          shopName: response.shopName || "N/A",
          ownerName: response.ownerName || "N/A",
          location: response.location || "N/A",
          email: email
        }
        
        setShopName(details.shopName)
        setOwnerName(details.ownerName)
        setLocation(details.location)

        // Explicit persistence to localStorage as requested
        localStorage.setItem("token", response.accessToken)
        localStorage.setItem("shop_id", response.shopId)
        localStorage.setItem("user_details", JSON.stringify(details))

        // Update global context and navigate to dashboard
        authLogin(response.accessToken, response.shopId, details)
        return
      }

      setError(response?.error || "Invalid credentials. Please try again.")
    } catch (err) {
      setLoading(false)
      setError("An unexpected error occurred. Please check your connection.")
    }
  }

  return (
    <div className="grid gap-8">
      <div className="space-y-3 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/70">Retail Insights</p>
        <h1 className="text-3xl font-semibold text-white">Sign in to your dashboard</h1>
        <p className="mx-auto max-w-xl text-sm text-slate-400">
          Access segmentation insights, customer recommendations, and campaign analytics.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-black/20"
      >
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
            placeholder="Enter your password"
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
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-sm text-slate-500">
          New here?{' '}
          <Link href="/signup" className="font-semibold text-sky-300 hover:text-sky-200">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  )
}

