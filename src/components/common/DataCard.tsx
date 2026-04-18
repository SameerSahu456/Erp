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

/* Metronic v9 style stat card */
function DataCard({ label, value, icon: Icon, trend, onClick, className }: DataCardProps) {
  return (
    <Card
      className={cn(
        "group/datacard",
        onClick && "cursor-pointer hover:border-primary/30",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="text-[22px] font-semibold font-sans tracking-tight leading-none">{value}</p>
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-semibold mt-1",
                trend.isPositive
                  ? "text-[#17c653]"
                  : "text-[#f8285a]"
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
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-2.5">
            <Icon className="size-5 text-gray-500 dark:text-gray-400" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { DataCard, type DataCardProps, type DataCardTrend }
