"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { TrendingUp, Users, DollarSign, Smartphone, Laptop, Tv, Speaker, Filter } from "lucide-react"
import { KPICard } from "@/components/ui/kpi-card"
import { ChartCard } from "@/components/ui/chart-card"
import { RFMTooltip } from "@/components/ui/rfm-tooltip"
import { SegmentPieChart, InventoryAlertWidget } from "@/components/dashboard-charts"
import { fetchDashboardStats, fetchDashboardTopProducts, fetchInventory } from "@/lib/api"
import { formatCurrency, formatNumber, getSegmentColor } from "@/lib/mock-data"
import { useAuth } from "@/components/auth-context"
import { useCustomers } from "@/components/customer-context"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  { name: "All", icon: Filter },
  { name: "Smartphones", icon: Smartphone },
  { name: "Laptops", icon: Laptop },
  { name: "Electronics", icon: Tv },
  { name: "Audio", icon: Speaker },
]

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState("All")
  const [stats, setStats] = useState<{
    totalCustomers: number
    totalRevenue: number
    activeSegments: Array<{ name: string; value: number }>
  } | null>(null)
  const [inventory, setInventory] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<{ segment: string; products: Array<{ product: string; sales: number; count: number }> }[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { customers, isDataUpdated } = useCustomers()

  const loadData = async (category: string) => {
    setLoading(true)
    try {
      const [statsData, inventoryData, topProductsData] = await Promise.all([
        fetchDashboardStats(category),
        fetchInventory(),
        fetchDashboardTopProducts()
      ])

      if (statsData?.success) {
        setStats({
          totalCustomers: statsData.totalCustomers,
          totalRevenue: statsData.totalRevenue,
          activeSegments: statsData.activeSegments
        })
      }

      if (inventoryData?.success) setInventory(inventoryData.inventory)
      if (topProductsData?.success) setTopProducts(topProductsData.topProducts || [])
      if (Array.isArray(customers)) {
        const sorted = [...customers].sort((a, b) => (b.rfmScore ?? b.rfm_score ?? b.RFM_Score ?? 0) - (a.rfmScore ?? a.rfm_score ?? a.RFM_Score ?? 0)).slice(0, 5)
        setTopCustomers(sorted)
      }
    } catch (error) {
      console.error("Dashboard Load Error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/signin")
      } else {
        void loadData(activeCategory)
      }
    }
  }, [user, authLoading, router, activeCategory])

  useEffect(() => {
    if (!authLoading && user && isDataUpdated) {
      void loadData(activeCategory)
    }
  }, [isDataUpdated, authLoading, user, activeCategory])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  const segmentPieData = stats?.activeSegments.map((s, index) => ({
    name: s.name,
    count: s.value,
    color: getSegmentColor(s.name) || ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b"][index % 5],
  })) || []

  return (
    <div className="space-y-8 p-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
            {user?.shopName ? `${user.shopName} Dashboard` : "Analytics Overview"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {user?.ownerName && user?.shopName
              ? `${user.ownerName} • ${user.shopName}`
              : 'Real-time intelligence from your customer transactions'}
          </p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all shrink-0",
                activeCategory === cat.name
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              <cat.icon className="h-3.5 w-3.5" />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Total Customers"
          value={loading ? "..." : formatNumber(stats?.totalCustomers ?? 0)}
          change={activeCategory === 'All' ? "Across all categories" : `In ${activeCategory}`}
          changeType="neutral"
          icon={Users}
        />
        <KPICard
          title="Total Revenue"
          value={loading ? "..." : formatCurrency(stats?.totalRevenue ?? 0)}
          change="Real-time gross sales"
          changeType="positive"
          icon={DollarSign}
        />
        <KPICard
          title="Top Segment"
          value={loading ? "..." : (stats?.activeSegments[0]?.name || "N/A")}
          change="By customer count"
          changeType="positive"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <ChartCard
          title="Customer Segments"
          subtitle={activeCategory === 'All' ? "Full market distribution" : `Segments for ${activeCategory}`}
        >
          {loading ? (
            <div className="flex h-[300px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <SegmentPieChart data={segmentPieData} />
            </div>
          )}
        </ChartCard>

        <InventoryAlertWidget data={inventory} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <ChartCard title="Top Products per Segment" subtitle="Most popular items by segment">
          <div className="space-y-4">
            {topProducts.length ? topProducts.map((segmentData) => (
              <div key={segmentData.segment} className="rounded-2xl border border-border bg-secondary/70 p-4">
                <p className="text-sm font-semibold text-foreground">{segmentData.segment}</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {segmentData.products.map((product) => (
                    <div key={product.product} className="flex items-center justify-between gap-4">
                      <span>{product.product}</span>
                      <span>{formatCurrency(product.sales)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">Upload transaction data to see top performing products.</p>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Top Customers by RFM" subtitle="High-value customer profiles">
          <div className="space-y-4">
            {topCustomers.length ? topCustomers.map((customer) => (
              <div key={customer.CustomerID || customer.id || customer._id || customer.email} className="rounded-2xl border border-border bg-secondary/70 p-4">
                <p className="text-sm font-semibold text-foreground">{customer.customer_name || customer.name || customer.CustomerName || 'Customer'}</p>
                <p className="text-xs text-muted-foreground">
                  Segment: {customer.segment || 'Unknown'} · Score: {customer.rfm_score ?? customer.RFM_Score ?? 'N/A'}
                </p>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">Upload data to reveal your top customer segments.</p>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
