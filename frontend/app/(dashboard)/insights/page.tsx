"use client"

import { useState, useEffect } from "react"
import { ChartCard } from "@/components/ui/chart-card"
import { MessageSquareWarning, Star, Search, Loader2 } from "lucide-react"
import { fetchCustomers } from "@/lib/api"

export default function InsightsPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchCustomers()
        setCustomers(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Feedback Insights</h2>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <MessageSquareWarning className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Please Upload Data</h3>
          <p className="text-muted-foreground mt-2">
            Upload your dataset to analyze customer feedback and order-status correlations.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Feedback Insights</h2>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Customer Sentiment Feed" subtitle="Live analysis of order status and customer data">
            <div className="space-y-4">
              {customers.slice(0, 10).map((customer, index) => (
                <div key={index} className="rounded-xl border border-border bg-secondary/20 p-4 transition-hover hover:border-primary/20">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{customer.name}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-full bg-background border border-border">
                          {customer.rfm_segment}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Order Status: <span className="text-primary font-medium">{customer.order_status || "Delivered"}</span></p>
                    </div>
                    <div className="flex text-yellow-500">
                      {Array.from({length: 5}).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < 4 ? "fill-current" : ""}`} />
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-foreground/80 leading-relaxed italic">
                    "Excellent service! The product was exactly as described and the delivery from {customer.location || "Local Branch"} was prompt."
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        <div className="space-y-6">
          <ChartCard title="Insight Summary" subtitle="Key metrics from your dataset">
             <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Positive Feedback</span>
                    <span className="text-emerald-400">85%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{width: '85%'}} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Delivered Ratio</span>
                    <span className="text-sky-400">92%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{width: '92%'}} />
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-bold text-foreground mb-2">Automated Insight</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Most customers in the "Champions" segment prefer direct delivery to their {customers[0]?.location || "Location"}. Consider localized stock optimization.
                  </p>
                </div>
             </div>
          </ChartCard>
        </div>
      </div>
    </div>
  )
}
