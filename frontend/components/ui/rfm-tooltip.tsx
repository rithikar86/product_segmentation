"use client"

import { useState } from "react"
import { HelpCircle, X } from "lucide-react"

export function RFMTooltip() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-muted-foreground hover:border-primary hover:text-primary transition-colors"
        title="RFM Scoring Formula"
      >
        <HelpCircle className="h-3 w-3" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-80 z-50">
          <div className="rounded-lg border border-border bg-card shadow-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-foreground">RFM Score Formula</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-secondary/30 rounded-lg p-3 border border-border">
                <p className="font-mono font-semibold text-primary mb-2">Score = R + F + M</p>
                <p className="text-xs text-muted-foreground">Where each component is rated 1-5</p>
              </div>

              <div className="space-y-2">
                <div className="flex gap-3">
                  <span className="font-semibold text-accent min-w-fit">R (Recency):</span>
                  <p className="text-muted-foreground text-xs">How recently the customer made a purchase (1=very old, 5=very recent)</p>
                </div>

                <div className="flex gap-3">
                  <span className="font-semibold text-primary min-w-fit">F (Frequency):</span>
                  <p className="text-muted-foreground text-xs">How often they purchase (1=rarely, 5=very frequently)</p>
                </div>

                <div className="flex gap-3">
                  <span className="font-semibold text-chart-2 min-w-fit">M (Monetary):</span>
                  <p className="text-muted-foreground text-xs">How much they spend (1=low value, 5=high value)</p>
                </div>
              </div>

              <div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
                <p className="text-xs text-foreground font-semibold mb-1">Score Range:</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>3-5: High Value • 6-9: Medium Value • 10-15: Low Value</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">Used to segment customers into strategic groups for targeted marketing</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
