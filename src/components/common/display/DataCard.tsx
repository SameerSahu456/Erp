import type { LucideIcon } from 'lucide-react'
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface DataCardTrend {
  value: number
  isPositive: boolean
}

type DataCardAccent =
  | 'primary'
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'violet'
  | 'teal'

export interface DataCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: DataCardTrend
  sub?: string
  accent?: DataCardAccent
  onClick?: () => void
  className?: string
}

function DataCard({
  label,
  value,
  icon: Icon,
  trend,
  sub,
  accent = 'primary',
  onClick,
  className,
}: DataCardProps) {
  return (
    <div
      className={cn('cpt-kpi', onClick && 'cursor-pointer', className)}
      data-accent={accent}
      onClick={onClick}
    >
      <div className="cpt-kpi-row">
        <div className="min-w-0">
          <div className="cpt-kpi-label">{label}</div>
          {/* title = the full value, since a long one is ellipsis-truncated to
              stay on one line and clear of the icon (see .cpt-kpi-value). */}
          <div className="cpt-kpi-value" title={String(value)}>
            {value}
          </div>
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
            <span className={trend.isPositive ? 'up' : 'down'}>
              {trend.isPositive ? (
                <ArrowUpIcon className="inline size-[11px]" />
              ) : (
                <ArrowDownIcon className="inline size-[11px]" />
              )}{' '}
              {Math.abs(trend.value)}%
            </span>
          )}
          {sub && <span className="cpt-muted">{sub}</span>}
        </div>
      )}
    </div>
  )
}

export { DataCard, type DataCardTrend, type DataCardAccent }
