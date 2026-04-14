import type { LucideIcon } from "lucide-react"
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface DataCardTrend {
  value: number
  isPositive: boolean
}

interface DataCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: DataCardTrend
  onClick?: () => void
  className?: string
}

function DataCard({ label, value, icon: Icon, trend, onClick, className }: DataCardProps) {
  return (
    <Card
      className={cn(
        onClick && "cursor-pointer transition-shadow hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold font-sans">{value}</p>
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend.isPositive
                  ? "text-status-success-text"
                  : "text-status-error-text"
              )}
            >
              {trend.isPositive ? (
                <ArrowUpIcon className="size-3" />
              ) : (
                <ArrowDownIcon className="size-3" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="rounded-md bg-muted p-2">
            <Icon className="size-5 text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { DataCard, type DataCardProps, type DataCardTrend }
