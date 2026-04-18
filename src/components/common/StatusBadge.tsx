import { cn } from "@/lib/utils"

/* Metronic v9 soft badge colors */
const variantStyles = {
  success: "bg-[#dfffea] text-[#17c653] dark:bg-[#17c653]/15 dark:text-[#5bdb82]",
  warning: "bg-[#fff8dd] text-[#f6b100] dark:bg-[#f6b100]/15 dark:text-[#f6c744]",
  error: "bg-[#ffeef3] text-[#f8285a] dark:bg-[#f8285a]/15 dark:text-[#ff6b8a]",
  info: "bg-[#f1f0ff] text-[#7239ea] dark:bg-[#7239ea]/15 dark:text-[#9b6df0]",
  neutral: "bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400",
  "red-cell": "bg-[#ffeef3] text-[#f8285a] dark:bg-[#f8285a]/15 dark:text-[#ff6b8a]",
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
        "inline-flex items-center gap-1 rounded-md px-2 py-[3px] text-[11px] font-semibold leading-none tracking-wide",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export { StatusBadge, type StatusBadgeVariant, type StatusBadgeProps }
