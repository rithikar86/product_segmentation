"use client"

import { useState, useEffect } from "react"
import { ChartCard } from "@/components/ui/chart-card"
import { segments, getSegmentColor, mockSegmentOffers, formatCurrency } from "@/lib/mock-data"
import { TrendingUp } from "lucide-react"
import { useCustomers } from "@/components/customer-context"

export default function SegmentationPage() {
  const [selectedSegment, setSelectedSegment] = useState<string>("all")
  const { customers, loading, error, refreshCustomers } = useCustomers()

  useEffect(() => {
    void refreshCustomers()
  }, [])

  const filteredCustomers =
    selectedSegment === "all"
      ? customers
      : customers.filter((c) => c.segment === selectedSegment)

  const getSegmentStats = (segmentName: string) => {
    const segmentCustomers = customers.filter((c) => c.segment === segmentName)
    return {
      count: segmentCustomers.length,
      avgValue: segmentCustomers.length > 0 ? segmentCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0) / segmentCustomers.length : 0,
      avgScore: segmentCustomers.length > 0 ? (segmentCustomers.reduce((sum, c) => sum + (c.rfm_score || 0), 0) / segmentCustomers.length).toFixed(1) : '0.0',
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Customer Segmentation</h2>
        <p className="text-center py-10 text-muted-foreground">Fetching latest data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
        <h2 className="text-lg font-semibold">Unable to load segmentation data</h2>
        <p className="mt-2">{error}</p>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Customer Segmentation</h2>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No data found. Please upload a CSV to begin.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Segment Filter Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <button
          onClick={() => setSelectedSegment("all")}
          className={`rounded-lg border-2 p-3 text-left transition-all ${
            selectedSegment === "all"
              ? "border-primary bg-primary/10"
              : "border-border bg-card hover:border-primary/50"
          }`}
        >
          <p className="text-xs font-medium text-muted-foreground">All Segments</p>
          <p className="text-lg font-semibold text-foreground">{customers.length}</p>
        </button>
        {segments.map((segment) => {
          const stats = getSegmentStats(segment.name)
          return (
            <button
              key={segment.name}
              onClick={() => setSelectedSegment(segment.name)}
              className={`rounded-lg border-2 p-3 text-left transition-all ${
                selectedSegment === segment.name
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <p className="text-xs font-medium text-muted-foreground">{segment.name}</p>
              </div>
              <p className="text-lg font-semibold text-foreground">{stats.count}</p>
              <p className="text-xs text-accent font-medium">{formatCurrency(stats.avgValue)}</p>
            </button>
          )
        })}
      </div>

      {/* Segment Details */}
      <ChartCard
        title={selectedSegment === "all" ? "All Customer Segments" : selectedSegment}
        subtitle={`${filteredCustomers.length} customers`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">RFM Score</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Total Spent</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Frequency</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Sentiment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{customer.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{customer.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      <TrendingUp className="h-3 w-3" />
                      {customer.rfm_score || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-accent">{formatCurrency(customer.total_spent)}</td>
                  <td className="px-4 py-3 text-foreground">{customer.transaction_count}x</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        customer.sentiment === "positive"
                          ? "bg-green-500/10 text-green-500"
                          : customer.sentiment === "neutral"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {customer.sentiment}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Segment Insights */}
      {selectedSegment !== "all" && (
        <ChartCard title={`${selectedSegment} Insights`} subtitle="Segment-specific targeting strategy">
          <div className="space-y-4">
            {Object.entries(mockSegmentOffers).map(([segment, offer]) => {
              if (segment !== selectedSegment) return null
              return (
                <div key={segment} className="rounded-lg bg-secondary/30 p-5 border border-border">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-1">Campaign Offer</h4>
                      <p className="text-foreground font-medium">{offer.offer}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-1">Messaging Strategy</h4>
                      <p className="text-foreground text-sm">{offer.message}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-accent mb-1">Primary Incentive</h4>
                      <p className="text-foreground text-sm">{offer.incentive}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>
      )}

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {segments.map((segment) => {
          const stats = getSegmentStats(segment.name)
          return (
            <div key={segment.name} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-muted-foreground">{segment.name}</p>
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Customers</p>
                  <p className="text-xl font-bold text-foreground">{stats.count}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Spent</p>
                  <p className="text-lg font-semibold text-accent">{formatCurrency(stats.avgValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">RFM Score</p>
                  <p className="text-lg font-semibold text-primary">{stats.avgScore}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
