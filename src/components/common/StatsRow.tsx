import { cn } from "@/lib/utils"
import { DataCard, type DataCardProps } from "@/components/common/DataCard"

export interface StatCardData extends DataCardProps {}

interface StatsRowProps {
  stats: DataCardProps[]
  className?: string
}

function StatsRow({ stats, className }: StatsRowProps) {
  return (
    <div className={cn("cpt-kpi-grid", className)}>
      {stats.map((stat, index) => (
        <DataCard key={index} {...stat} />
      ))}
    </div>
  )
}

export { StatsRow, type StatsRowProps }
