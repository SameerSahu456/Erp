import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'
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
    <div className={cn('cpt-page-header', className)}>
      <div className="cpt-row" style={{ alignItems: 'flex-start', gap: 12 }}>
        <Link to={backHref} className="cpt-btn cpt-btn-ghost" style={{ padding: 6, borderRadius: 7, marginTop: 2 }}>
          <ArrowLeft className="size-4" />
        </Link>
        <div style={{ minWidth: 0 }}>
          <div className="cpt-row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <h1 className="cpt-page-title">{title}</h1>
            {status && <StatusBadge variant={status.variant}>{status.label}</StatusBadge>}
            {badges}
          </div>
          {subtitle && <div className="cpt-page-sub">{subtitle}</div>}
          {owner && (
            <div className="cpt-row" style={{ gap: 8, marginTop: 6 }}>
              <div className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{getInitials(owner.name)}</div>
              <span style={{ fontSize: 13 }}>{owner.name}</span>
              {owner.role && <span className="cpt-muted cpt-tiny">({owner.role})</span>}
            </div>
          )}
        </div>
      </div>
      {actions && <div className="cpt-row" style={{ gap: 8 }}>{actions}</div>}
    </div>
  )
}

export { EntityHeader, type EntityHeaderProps }
