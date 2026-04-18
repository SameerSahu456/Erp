import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'

interface EntityHeaderProps {
  title: string
  subtitle?: string
  status?: { label: string; variant: StatusBadgeVariant }
  badges?: React.ReactNode
  owner?: { name: string; role?: string }
  backHref: string
  actions?: React.ReactNode
  className?: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function EntityHeader({
  title,
  subtitle,
  status,
  badges,
  owner,
  backHref,
  actions,
  className,
}: EntityHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link to={backHref} />}>
          <ArrowLeft />
        </Button>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
            {status && <StatusBadge variant={status.variant}>{status.label}</StatusBadge>}
            {badges}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {owner && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {getInitials(owner.name)}
              </div>
              <span className="text-sm">{owner.name}</span>
              {owner.role && (
                <span className="text-xs text-muted-foreground">({owner.role})</span>
              )}
            </div>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export { EntityHeader, type EntityHeaderProps }
