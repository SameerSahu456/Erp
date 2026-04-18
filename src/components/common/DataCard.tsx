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

/* Comprint ERP KPI card */
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
          <p className="text-[12px] font-[550] text-[#667085]">{label}</p>
          <p className="text-[22px] font-[650] tracking-[-0.02em] num">{value}</p>
          {trend && (
            <div className="flex items-center gap-1.5 text-[12px] text-[#667085]">
              <span className={cn("flex items-center gap-0.5", trend.isPositive ? "text-[#067647]" : "text-[#B42318]")}>
                {trend.isPositive ? <ArrowUpIcon className="size-[11px]" /> : <ArrowDownIcon className="size-[11px]" />}
                {Math.abs(trend.value)}%
              </span>
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
