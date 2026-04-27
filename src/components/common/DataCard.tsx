import type { LucideIcon } from "lucide-react"
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface DataCardTrend {
  value: number
  isPositive: boolean
}

type DataCardAccent =
  | "primary"
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "violet"
  | "teal"

interface DataCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: DataCardTrend
  sub?: string
  accent?: DataCardAccent
  onClick?: () => void
  className?: string
}

/* Comprint ERP KPI card — premium */
function DataCard({
  label,
  value,
  icon: Icon,
  trend,
  sub,
  accent = "primary",
  onClick,
  className,
}: DataCardProps) {
  return (
    <div
      className={cn("cpt-kpi", onClick && "cursor-pointer", className)}
      data-accent={accent}
      onClick={onClick}
    >
      <div className="cpt-kpi-row">
        <div className="min-w-0">
          <div className="cpt-kpi-label">{label}</div>
          <div className="cpt-kpi-value">{value}</div>
        </div>
        {Icon && (
          <span className="cpt-kpi-icon" aria-hidden="true">
            <Icon className="size-[17px]" strokeWidth={2} />
          </span>
        )}
      </div>
      {(trend || sub) && (
        <div className="cpt-kpi-delta">
          {trend && (
            <span className={trend.isPositive ? "up" : "down"}>
              {trend.isPositive ? (
                <ArrowUpIcon className="inline size-[11px]" />
              ) : (
                <ArrowDownIcon className="inline size-[11px]" />
              )}
              {" "}
              {Math.abs(trend.value)}%
            </span>
          )}
          {sub && <span className="cpt-muted">{sub}</span>}
        </div>
      )}
    </div>
  )
}

function StatsRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("cpt-kpi-grid", className)}>{children}</div>
}

export { DataCard, StatsRow, type DataCardProps, type DataCardTrend, type DataCardAccent }
