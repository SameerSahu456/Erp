import { cn } from "@/lib/utils"

const variantStyles = {
  success: "bg-status-success-bg text-status-success-text",
  warning: "bg-status-warning-bg text-status-warning-text",
  error: "bg-status-error-bg text-status-error-text",
  info: "bg-status-info-bg text-status-info-text",
  neutral: "bg-muted text-muted-foreground",
  "red-cell": "bg-destructive/10 text-destructive",
} as const

type StatusBadgeVariant = keyof typeof variantStyles

interface StatusBadgeProps {
  variant: StatusBadgeVariant
  children: React.ReactNode
  className?: string
}

function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export { StatusBadge, type StatusBadgeVariant, type StatusBadgeProps }
