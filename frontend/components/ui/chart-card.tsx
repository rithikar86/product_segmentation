import { cn } from "@/lib/utils"

interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

export function ChartCard({ title, subtitle, children, className, action }: ChartCardProps) {
  return (
    <div className={cn("min-w-0 overflow-hidden rounded-xl border border-border bg-card p-6", className)}>
      <div className="mb-4 flex items-start justify-between min-w-0">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
