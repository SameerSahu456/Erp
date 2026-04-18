import { cn } from "@/lib/utils"

/* Comprint ERP status badges — pill shape, semantic colors */
const variantStyles = {
  success: "bg-[#ECFDF3] text-[#067647]",
  warning: "bg-[#FFFAEB] text-[#B54708]",
  error: "bg-[#FEF3F2] text-[#B42318]",
  info: "bg-[#EFF4FF] text-[#175CD3]",
  neutral: "bg-[#EEF0F3] text-[#344054]",
  "red-cell": "bg-[#FEF3F2] text-[#B42318]",
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
        "inline-flex items-center gap-[5px] rounded-full px-2 py-[2px] text-[11.5px] font-[550] leading-[1.6] whitespace-nowrap",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export { StatusBadge, type StatusBadgeVariant, type StatusBadgeProps }
