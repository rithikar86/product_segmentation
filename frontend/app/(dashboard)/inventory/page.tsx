"use client"

import { useState, useEffect } from "react"
import { ChartCard } from "@/components/ui/chart-card"
import { Boxes, PackageCheck, Truck, Loader2 } from "lucide-react"
import { fetchInventory } from "@/lib/api"

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadInventory() {
      try {
        const response = await fetchInventory()
        if (response?.success) {
          setInventory(response.inventory)
        }
      } catch (error) {
        console.error("Failed to load inventory:", error)
      } finally {
        setLoading(false)
      }
    }
    loadInventory()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading inventory data...</p>
      </div>
    )
  }

  if (!inventory || inventory.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Inventory Management</h2>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Boxes className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Please Upload Data</h3>
          <p className="text-muted-foreground mt-2">
            No inventory records found. Upload your Electronic Shop Sales Dataset to see dynamic inventory tracking.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Inventory Management</h2>
      
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 text-sky-400 mb-2">
            <Boxes className="h-5 w-5" />
            <span className="text-sm font-medium">Total Products</span>
          </div>
          <p className="text-2xl font-bold">{inventory.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 text-orange-400 mb-2">
            <Loader2 className="h-5 w-5" />
            <span className="text-sm font-medium">In Process</span>
          </div>
          <p className="text-2xl font-bold">
            {inventory.reduce((acc, item) => acc + (item['In Process'] || 0), 0)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 text-emerald-400 mb-2">
            <PackageCheck className="h-5 w-5" />
            <span className="text-sm font-medium">Delivered</span>
          </div>
          <p className="text-2xl font-bold">
            {inventory.reduce((acc, item) => acc + (item['Delivered'] || 0), 0)}
          </p>
        </div>
      </div>

      <ChartCard title="Product Inventory Status" subtitle="Live tracking of order statuses by product">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Product Name</th>
                <th className="px-4 py-3 text-center font-semibold">In Process</th>
                <th className="px-4 py-3 text-center font-semibold">Delivered</th>
                <th className="px-4 py-3 text-center font-semibold">Total Orders</th>
                <th className="px-4 py-3 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inventory.map((item, index) => (
                <tr key={index} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.product}</td>
                  <td className="px-4 py-3 text-center text-orange-400">{item['In Process']}</td>
                  <td className="px-4 py-3 text-center text-emerald-400">{item['Delivered']}</td>
                  <td className="px-4 py-3 text-center font-bold">{item.Total}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
                      item['In Process'] > item['Delivered'] ? "bg-orange-500/10 text-orange-500" : "bg-emerald-500/10 text-emerald-500"
                    }`}>
                      {item['In Process'] > 0 ? "PROCESSING" : "COMPLETED"}
                    </span>
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
