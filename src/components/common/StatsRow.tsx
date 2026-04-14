import { cn } from "@/lib/utils"
import { DataCard, type DataCardProps } from "@/components/common/DataCard"

interface StatsRowProps {
  stats: DataCardProps[]
  className?: string
}

function StatsRow({ stats, className }: StatsRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {stats.map((stat, index) => (
        <DataCard key={index} {...stat} />
      ))}
    </div>
  )
}

export { StatsRow, type StatsRowProps }
