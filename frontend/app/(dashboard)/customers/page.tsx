"use client"

import { useState, useEffect } from "react"
import { ChartCard } from "@/components/ui/chart-card"
import { getSegmentColor, formatCurrency } from "@/lib/mock-data"
import { Search, AlertTriangle, TrendingUp } from "lucide-react"
import { fetchCustomers } from "@/lib/api"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sentimentFilter, setSentimentFilter] = useState<"all" | "positive" | "neutral" | "negative">("all")
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)

  // FETCH DATA FROM PYTHON API
  useEffect(() => {
    async function loadCustomers() {
      try {
        const data = await fetchCustomers()
        setCustomers(data)
      } catch (error) {
        console.error("Failed to load real database:", error)
      } finally {
        setLoading(false)
      }
    }
    loadCustomers()
  }, [])

  // FILTER LOGIC (Now uses the 'customers' state from database)
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Note: If your SQLite doesn't have 'sentiment' yet, this defaults to true
    const matchesSentiment = sentimentFilter === "all" || customer.sentiment === sentimentFilter
    return matchesSearch && matchesSentiment
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Customers</h2>
        <p className="text-center py-10 text-muted-foreground">Fetching latest data...</p>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Customers</h2>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No data found. Please upload a CSV to begin.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters Section (Same as your code) */}
      <ChartCard title="Search Customers" subtitle="Find and manage your live database">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-input pl-10 pr-4 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "positive", "neutral", "negative"] as const).map((sentiment) => (
              <button
                key={sentiment}
                onClick={() => setSentimentFilter(sentiment)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  sentimentFilter === sentiment
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground hover:border-primary/50"
                }`}
              >
                {sentiment === "all" ? "All Sentiments" : sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* Customer Table Section (Now showing Real Data) */}
      <ChartCard
        title="Live Customer Database"
        subtitle={`${filteredCustomers.length} records retrieved from MongoDB`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Segment</th>
                <th className="px-4 py-3 text-left font-semibold">Last Purchase</th>
                <th className="px-4 py-3 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{customer.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{customer.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: getSegmentColor(customer.segment || "Neutral") + "20",
                        color: getSegmentColor(customer.segment || "Neutral"),
                      }}
                    >
                      {customer.segment || "Unassigned"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-accent">{customer.last_purchase_date ? new Date(customer.last_purchase_date).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedCustomer(customer)}
                      className="text-primary hover:underline font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
