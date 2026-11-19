import { cn } from "@/lib/utils"

/** Compact percentage bar — token colours only, width is a layout value. */
export function MiniBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className="h-full rounded-full bg-success" style={{ width: `${value}%` }} />
    </div>
  )
}
