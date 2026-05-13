"use client"

import { useState, useEffect } from "react"
import { ChartCard } from "@/components/ui/chart-card"
import { Package, TrendingUp, Users, Loader2 } from "lucide-react"
import { fetchRecommendations } from "@/lib/api"
import { getSegmentColor } from "@/lib/mock-data"

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetchRecommendations()
        if (response?.success) {
          setRecommendations(response.recommendations)
        }
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

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Product Recommendations</h2>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Please Upload Data</h3>
          <p className="text-muted-foreground mt-2">
            Upload your sales dataset to generate AI-powered product recommendations based on customer buying patterns.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Product Recommendations</h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Top Co-occurrence" subtitle="Products frequently bought together">
          <div className="space-y-4">
            {recommendations.slice(0, 5).map((rule, index) => (
              <div key={index} className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-4 transition-hover hover:border-primary/30">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{rule.antecedent}</span>
                    <TrendingUp className="h-3 w-3 text-primary" />
                    <span className="text-sm font-medium text-foreground">{rule.consequent}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Confidence: {(rule.confidence * 100).toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary">RECOMMEND</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Segment Insights" subtitle="Buying frequency by customer segment">
          <div className="space-y-4">
             <div className="rounded-xl border border-border p-4 bg-primary/5">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h4 className="font-bold">Segment Strategy</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Based on the Apriori analysis of your dataset, we recommend bundling products with high confidence scores for "Champions" and offering them as personalized "Thank You" deals.
                </p>
             </div>
             
             <div className="grid gap-2">
               {["Champions", "Loyal", "At-Risk", "Lost"].map(seg => (
                 <div key={seg} className="flex items-center justify-between text-sm p-2 rounded hover:bg-secondary/20">
                   <span className="font-medium" style={{color: getSegmentColor(seg)}}>{seg}</span>
                   <span className="text-xs text-muted-foreground">Tailored Campaigns Ready</span>
                 </div>
               ))}
             </div>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
