import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs'

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  status?: { label: string; variant: StatusBadgeVariant }
  badges?: ReactNode
  /** When provided, shows a back-arrow button. */
  backHref?: string
  /** Right-aligned actions (buttons, filters, view toggles). */
  actions?: ReactNode
  /** Content rendered below the title row but above any page content. */
  meta?: ReactNode
  className?: string
  /** Tighten the bottom spacing — for pages that own their own spacing. */
  compact?: boolean
}

function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  status,
  badges,
  backHref,
  actions,
  meta,
  className,
  compact = false,
}: PageHeaderProps) {
  const goBack = useNavigateBack(backHref ?? '/')

  return (
    <header
      className={cn(
        'flex flex-col gap-3',
        !compact && 'mb-1',
        className
      )}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} />
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {backHref && (
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-[650] leading-tight tracking-tight text-foreground">
                {title}
              </h1>
              {status && (
                <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
              )}
              {badges}
            </div>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
            {meta && <div className="mt-2">{meta}</div>}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}

export { PageHeader, type PageHeaderProps }
