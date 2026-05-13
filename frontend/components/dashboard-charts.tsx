"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { AlertTriangle, Zap, TrendingUp } from "lucide-react"
import { segments, mockCategorySales, mockInventory, mockNotifications, getSegmentColor } from "@/lib/mock-data"
import { ChartCard } from "./ui/chart-card"

export function CategorySalesChart({
  data,
}: {
  data?: Array<{ category: string; sales: number }>
}) {
  const chartData = data && data.length > 0 ? data : mockCategorySales

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="category"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          axisLine={{ stroke: "hsl(var(--border))" }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          axisLine={{ stroke: "hsl(var(--border))" }}
          label={{ value: "Sales (₹)", angle: -90, position: "insideLeft" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--foreground))",
          }}
          formatter={(value: number) =>
            new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(value)
          }
        />
        <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function SegmentPieChart({
  data,
}: {
  data?: Array<{ name: string; count: number; color: string }>
}) {
  const pieData = data && data.length > 0 ? data : segments

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="count"
          nameKey="name"
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--foreground))",
          }}
          formatter={(value: number, name: string) => [`${value} customers`, name]}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => (
            <span style={{ color: "hsl(var(--foreground))", fontSize: "12px" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function InventoryAlertWidget({ data }: { data?: any[] }) {
  const inventory = data && data.length > 0 ? data : mockInventory
  const criticalItems = inventory.filter((item) => (item['In Process'] || 0) > (item['Delivered'] || 0))
  const warningItems = inventory.filter((item) => (item['In Process'] || 0) > 0 && (item['In Process'] || 0) <= (item['Delivered'] || 0))

  return (
    <ChartCard
      title="Inventory Alerts"
      subtitle={`${criticalItems.length} critical, ${warningItems.length} warning`}
    >
      <div className="space-y-3">
        {inventory.slice(0, 4).map((item, index) => {
          const status = (item['In Process'] || 0) > (item['Delivered'] || 0) ? "critical" : (item['In Process'] || 0) > 0 ? "warning" : "stable"
          const statusColor =
            status === "critical"
              ? "bg-red-500/10 border-red-500/20"
              : status === "warning"
                ? "bg-yellow-500/10 border-yellow-500/20"
                : "bg-green-500/10 border-green-500/20"
          const iconColor =
            status === "critical"
              ? "text-red-500"
              : status === "warning"
                ? "text-yellow-500"
                : "text-green-500"

          return (
            <div
              key={index}
              className={`flex items-center justify-between rounded-lg border p-3 ${statusColor}`}
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{item.product || item.name}</p>
                <p className={`text-xs font-semibold ${iconColor}`}>
                  {item['In Process'] || 0} Processing / {item.Total || item.stock} Total
                </p>
              </div>
              <AlertTriangle className={`h-5 w-5 ${iconColor}`} />
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}

export function NotificationFeed() {
  return (
    <ChartCard title="Live Notifications" subtitle={`${mockNotifications.length} recent updates`}>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {mockNotifications.map((notification) => {
          const priorityColor =
            notification.priority === "high"
              ? "border-l-red-500 bg-red-500/5"
              : notification.priority === "medium"
                ? "border-l-yellow-500 bg-yellow-500/5"
                : "border-l-blue-500 bg-blue-500/5"
          const iconBg =
            notification.type === "stock"
              ? "bg-orange-500/10 text-orange-500"
              : notification.type === "churn"
                ? "bg-red-500/10 text-red-500"
                : notification.type === "feedback"
                  ? "bg-yellow-500/10 text-yellow-500"
                  : "bg-green-500/10 text-green-500"

          return (
            <div
              key={notification.id}
              className={`border-l-2 rounded-lg p-3 ${priorityColor}`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-full p-2 ${iconBg}`}>
                  <Zap className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notification.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}
