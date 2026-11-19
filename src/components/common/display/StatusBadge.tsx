import { cn } from '@/lib/utils'

const variantClass = {
  success: 'ok',
  warning: 'warn',
  error: 'err',
  info: 'info',
  neutral: '',
} as const

export type StatusBadgeVariant = keyof typeof variantClass

export interface StatusBadgeProps {
  variant: StatusBadgeVariant
  children: React.ReactNode
  className?: string
  showDot?: boolean
}

function StatusBadge({ variant, children, className, showDot = true }: StatusBadgeProps) {
  return (
    <span className={cn('cpt-badge', variantClass[variant], className)}>
      {showDot && <span className="bdot" />}
      {children}
    </span>
  )
}

export { StatusBadge }
