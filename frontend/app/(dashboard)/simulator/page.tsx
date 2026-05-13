"use client"

import { useState, useEffect } from "react"
import { ChartCard } from "@/components/ui/chart-card"
import { Play, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { fetchCustomers } from "@/lib/api"

export default function SimulatorPage() {
  // Move EVERY SINGLE HOOK to the absolute top of the function
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [simResults, setSimResults] = useState<{ success: number; failed: number } | null>(null)
  const [simSummary, setSimSummary] = useState<{ segment_summary?: Record<string, number>; top_products?: any[] } | null>(null)

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

  const runSimulation = async () => {
    setSimulating(true)
    setSimResults(null)
    
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/simulator/send-campaign", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      
      const result = await response.json()
      
      setSimulating(false)
      if (result.success) {
        setSimResults({
          success: result.projected_customers || 0,
          failed: result.failed || 0
        })
        setSimSummary({
          segment_summary: result.segment_summary,
          top_products: result.top_products
        })
      } else {
        setSimResults({
          success: 0,
          failed: 0
        })
        setSimSummary(null)
      }
    } catch (error) {
      console.error("Simulation failed:", error)
      setSimulating(false)
      setSimResults({ success: 0, failed: customers.length })
    }
  }

  // Ensure no return statements appear before hooks are called.
  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : customers.length === 0 ? (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-foreground">Campaign Simulator</h2>
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Play className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">Please Upload Data</h3>
            <p className="text-muted-foreground mt-2">
              Upload your sales dataset to start simulating marketing campaigns and notification triggers.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Campaign Simulator</h2>
            <button
              onClick={runSimulation}
              disabled={simulating}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
            >
              {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {simulating ? "SIMULATING..." : "RUN FULL SIMULATION"}
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <ChartCard title="Simulation Configuration" subtitle="Define campaign parameters for the current customer base">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Target Group</p>
                      <p className="text-sm font-medium">All Segments ({customers.length} customers)</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Channel</p>
                      <p className="text-sm font-medium">Analytic projection mode using customer RFM segments</p>
                    </div>
                  </div>
                  <div className="h-px bg-border/50" />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Projection Summary</p>
                    <div className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground italic">
                      This simulator projects customer segment performance and product demand based on your latest sales dataset.
                    </div>
                  </div>
                </div>
              </ChartCard>

              {simResults && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-3 text-emerald-400 mb-4">
                    <CheckCircle className="h-6 w-6" />
                    <h3 className="text-lg font-bold">Simulation Complete</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-background/50 p-4 border border-border">
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Messages Sent</p>
                      <p className="text-2xl font-bold text-foreground">{simResults.success}</p>
                    </div>
                    <div className="rounded-lg bg-background/50 p-4 border border-border">
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Failures</p>
                      <p className="text-2xl font-bold text-foreground">{simResults.failed}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <ChartCard title="Live Feed" subtitle="Real-time simulation logs">
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {simulating ? (
                    Array.from({length: 8}).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs text-muted-foreground animate-pulse">
                        <Send className="h-3 w-3" />
                        <span>Processing customer batch {i+1}...</span>
                      </div>
                    ))
                  ) : simResults ? (
                    <div className="flex items-center gap-3 text-xs text-emerald-400">
                      <CheckCircle className="h-3 w-3" />
                      <span>RFM simulation completed with segment projections.</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-10">Ready to simulate...</p>
                  )}
                </div>
              </ChartCard>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
