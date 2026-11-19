import { Inbox, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

interface EmptyStateAction {
  label: string
  onClick: () => void
}

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: EmptyStateAction
  className?: string
}

function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <Typography variant="subsection-title">{title}</Typography>
      {description && (
        <Typography variant="body" tone="muted" className="mt-1 max-w-sm">
          {description}
        </Typography>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  )
}

export { EmptyState, type EmptyStateAction }
