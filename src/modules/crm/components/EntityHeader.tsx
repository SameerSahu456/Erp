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
  /**
   * When true, the header pins to the viewport top (just below the global Header)
   * with a horizontal bleed to the page edges, backdrop blur, and lift shadow.
   * Use on long detail pages where the actions bar should remain reachable.
   */
  sticky?: boolean
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
  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  'bg-rose-500/10 text-rose-700 dark:text-rose-400',
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
  sticky = false,
  className,
}: EntityHeaderProps) {
  const ownerList = owners ?? (owner ? [owner] : [])
  const goBack = useNavigateBack(backHref)

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        sticky
          ? 'sticky top-14 z-30 -mx-5 border-b border-border bg-card/90 px-5 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_16px_-6px_rgba(16,24,40,0.06)] backdrop-blur supports-[backdrop-filter]:bg-card/75 lg:-mx-7 lg:px-7'
          : 'mb-1',
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:-translate-y-px hover:border-primary/25 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1
              className={cn(
                'font-[650] leading-tight tracking-[-0.02em] text-foreground',
                sticky ? 'text-[18px]' : 'text-[22px]'
              )}
            >
              {title}
            </h1>
            {status && <StatusBadge variant={status.variant}>{status.label}</StatusBadge>}
            {badges}
          </div>
          {subtitle && !sticky && (
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
          {ownerList.length > 0 && !sticky && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex items-center -space-x-1.5">
                {ownerList.map((o, i) => (
                  <div
                    key={o.name}
                    className={cn(
                      'flex size-6 items-center justify-center rounded-full border-2 border-background text-[9px] font-semibold',
                      AVATAR_COLORS[i % AVATAR_COLORS.length]
                    )}
                    style={{ zIndex: ownerList.length - i }}
                    title={o.name}
                  >
                    {getInitials(o.name)}
                  </div>
                ))}
              </div>
              {ownerList.length === 1 ? (
                <span className="text-[13px] text-foreground">
                  {ownerList[0].name}
                  {ownerList[0].role && (
                    <span className="ml-1.5 text-[11.5px] text-muted-foreground">
                      · {ownerList[0].role}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-[13px] text-muted-foreground">
                  {ownerList.length} owners
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  )
}

export { EntityHeader, type EntityHeaderProps }
