import { recentActivity, getSegmentColor } from "@/lib/mock-data"
import { Clock } from "lucide-react"

export function ActivityPanel() {
  return (
    <div className="space-y-4">
      {recentActivity.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 rounded-lg border border-border bg-background/50 p-3 transition-colors hover:bg-accent/50"
        >
          <div
            className="mt-0.5 h-2 w-2 rounded-full"
            style={{ backgroundColor: getSegmentColor(activity.segment) }}
          />
          <div className="flex-1 space-y-1">
            <p className="text-sm text-foreground">
              <span className="font-medium">{activity.customerId}</span>{" "}
              <span className="text-muted-foreground">{activity.action}</span>
            </p>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${getSegmentColor(activity.segment)}20`,
                  color: getSegmentColor(activity.segment),
                }}
              >
                {activity.segment}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {activity.timestamp}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
