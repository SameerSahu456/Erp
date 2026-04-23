import { ArrowLeft } from 'lucide-react'

import { cn } from '@/lib/utils'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { useNavigateBack } from '@/hooks/use-navigate-back'

interface EntityHeaderProps {
  title: string
  subtitle?: string
  status?: { label: string; variant: StatusBadgeVariant }
  badges?: React.ReactNode
  /** Single owner (backward compat) */
  owner?: { name: string; role?: string }
  /** Multiple owners — shown as overlapping avatar group */
  owners?: { name: string; role?: string }[]
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

const AVATAR_COLORS = [
  'bg-primary/10 text-primary',
  'bg-emerald-500/10 text-emerald-600',
  'bg-amber-500/10 text-amber-600',
  'bg-violet-500/10 text-violet-600',
  'bg-rose-500/10 text-rose-600',
]

function EntityHeader({
  title,
  subtitle,
  status,
  badges,
  owner,
  owners,
  backHref,
  actions,
  className,
}: EntityHeaderProps) {
  // Normalize to array — prefer owners prop, fall back to single owner
  const ownerList = owners ?? (owner ? [owner] : [])
  const goBack = useNavigateBack(backHref)

  return (
    <div className={cn('cpt-page-header', className)}>
      <div className="cpt-row" style={{ alignItems: 'flex-start', gap: 12 }}>
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="cpt-btn cpt-btn-ghost"
          style={{ padding: 6, borderRadius: 7, marginTop: 2 }}
        >
          <ArrowLeft className="size-4" />
        </button>
        <div style={{ minWidth: 0 }}>
          <div className="cpt-row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <h1 className="cpt-page-title">{title}</h1>
            {status && <StatusBadge variant={status.variant}>{status.label}</StatusBadge>}
            {badges}
          </div>
          {subtitle && <div className="cpt-page-sub">{subtitle}</div>}
          {ownerList.length > 0 && (
            <div className="cpt-row" style={{ gap: 8, marginTop: 6, alignItems: 'center' }}>
              {/* Overlapping avatar group */}
              <div className="flex items-center -space-x-1.5">
                {ownerList.map((o, i) => (
                  <div
                    key={o.name}
                    className={cn(
                      'flex items-center justify-center rounded-full border-2 border-background font-medium',
                      AVATAR_COLORS[i % AVATAR_COLORS.length]
                    )}
                    style={{ width: 24, height: 24, fontSize: 9, zIndex: ownerList.length - i }}
                    title={o.name}
                  >
                    {getInitials(o.name)}
                  </div>
                ))}
              </div>
              {ownerList.length === 1 ? (
                <>
                  <span style={{ fontSize: 13 }}>{ownerList[0].name}</span>
                  {ownerList[0].role && <span className="cpt-muted cpt-tiny">({ownerList[0].role})</span>}
                </>
              ) : (
                <span style={{ fontSize: 13 }} className="text-muted-foreground">
                  {ownerList.length} owners
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {actions && <div className="cpt-row" style={{ gap: 8 }}>{actions}</div>}
    </div>
  )
}

export { EntityHeader, type EntityHeaderProps }
