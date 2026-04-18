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
        "group/datacard",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold font-sans tracking-tight">{value}</p>
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md",
                trend.isPositive
                  ? "text-status-success-text bg-status-success-bg"
                  : "text-status-error-text bg-status-error-bg"
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
          <div className="rounded-lg bg-primary/8 p-2.5">
            <Icon className="size-5 text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { DataCard, type DataCardProps, type DataCardTrend }
