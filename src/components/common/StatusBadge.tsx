import { cn } from "@/lib/utils"

/* Comprint ERP badge — pill with dot indicator */
const variantClass = {
  success: "ok",
  warning: "warn",
  error: "err",
  info: "info",
  neutral: "",
  "red-cell": "err",
} as const

type StatusBadgeVariant = keyof typeof variantClass

interface StatusBadgeProps {
  variant: StatusBadgeVariant
  children: React.ReactNode
  className?: string
  showDot?: boolean
}

function StatusBadge({ variant, children, className, showDot = true }: StatusBadgeProps) {
  return (
    <span className={cn("cpt-badge", variantClass[variant], className)}>
      {showDot && <span className="bdot" />}
      {children}
    </span>
  )
}

export { StatusBadge, type StatusBadgeVariant, type StatusBadgeProps }
