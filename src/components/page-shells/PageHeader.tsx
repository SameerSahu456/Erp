import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import { CopyableText } from '@/components/common/display/CopyableText'
import { Typography } from '@/components/ui/typography'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs'
import { PAGE_SHELLS_STRINGS } from './page-shells.strings'

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  status?: { label: string; variant: StatusBadgeVariant }
  badges?: ReactNode
  /** When provided, shows a back-arrow button. */
  backHref?: string
  /**
   * Override the back-arrow click handler. When omitted, the arrow calls
   * `useNavigateBack(backHref)`. FormPageShell passes a guarded version so
   * the back arrow respects the unsaved-changes prompt.
   */
  onBack?: () => void
  /** Right-aligned actions (buttons, filters, view toggles). */
  actions?: ReactNode
  /** Content rendered below the title row but above any page content. */
  meta?: ReactNode
  className?: string
  /** Tighten the bottom spacing — for pages that own their own spacing. */
  compact?: boolean
  /**
   * Render the title as a click-to-copy reference (PAGE-UI §2) — plain text
   * that copies to the clipboard on click with a "Copied" toast. On by default
   * for detail pages (their title is a record number); off for list titles.
   */
  titleCopyable?: boolean
  /**
   * Vertical anchor of the back arrow (PAGE-UI §0 rule 2).
   * - `"title"`: the arrow is centered on the heading line only and sized to
   *   match it (`size-7` ≈ the `page-title` line box), so it never dips toward
   *   the subtitle.
   * - `"block"`: the legacy 32px arrow centered against the whole title +
   *   subtitle block.
   *
   * Default when omitted: `"title"` on every module EXCEPT CRM (`/crm/*`), which
   * keeps `"block"` — CRM's header chrome is maintained separately. Pass an
   * explicit value to override the per-path default either way.
   */
  backAlign?: 'block' | 'title'
}

function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  status,
  badges,
  backHref,
  onBack,
  actions,
  meta,
  className,
  compact = false,
  titleCopyable = false,
  backAlign,
}: PageHeaderProps) {
  const navigateBack = useNavigateBack(backHref ?? '/')
  const goBack = onBack ?? navigateBack

  // Breadcrumbs are intentionally hidden across the CRM module — the
  // sidebar + back-arrow already convey location there. Other modules
  // (IMS, WMS, Procurement, …) keep their breadcrumb trail.
  const { pathname } = useLocation()
  const isCrm = pathname.startsWith('/crm')
  const showBreadcrumbs = !isCrm

  // Back-arrow alignment (PAGE-UI §0 rule 2) defaults to "title" app-wide, but
  // CRM keeps its legacy block-centered arrow (its header chrome is maintained
  // separately). An explicit `backAlign` prop always wins. Only engages when a
  // back arrow is actually shown — pages without one keep the block-centered
  // row so their header layout is unchanged.
  const resolvedBackAlign = backAlign ?? (isCrm ? 'block' : 'title')
  const alignBackToTitle = resolvedBackAlign === 'title' && Boolean(backHref)

  return (
    <header
      className={cn(
        'flex flex-col gap-2.5',
        !compact && 'mb-0.5',
        className
      )}
    >
      {showBreadcrumbs && breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} />
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* `min-h-8` = the back button's height, reserved even when the button
            is absent — so pages with and without a back arrow have IDENTICAL
            header heights and content doesn't shift down across a drill-in.
            `backAlign="title"` top-aligns the row so the arrow (sized to the
            heading line) sits centered on the title only, not the whole
            title+subtitle block. */}
        <div
          className={cn(
            'flex min-h-8 min-w-0 gap-3 mb-1',
            alignBackToTitle ? 'items-start' : 'items-center'
          )}
        >
          {backHref && (
            <button
              type="button"
              onClick={goBack}
              aria-label={PAGE_SHELLS_STRINGS.pageHeader.goBackAriaLabel}
              className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.04)] transition-all hover:-translate-y-px hover:border-primary/25 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                // In "title" mode the arrow matches the page-title line box
                // (~27.5px) so it reads as part of the heading; otherwise the
                // historical 32px control.
                alignBackToTitle ? 'size-7' : 'size-8'
              )}
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              {titleCopyable ? (
                <Typography variant="page-title" asChild>
                  <CopyableText value={title}>{title}</CopyableText>
                </Typography>
              ) : (
                <Typography variant="page-title">{title}</Typography>
              )}
              {status && (
                <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
              )}
              {badges}
            </div>
            {subtitle && (
              <Typography variant="page-subtitle" className="mt-1.5">
                {subtitle}
              </Typography>
            )}
            {meta && <div className="mt-2.5">{meta}</div>}
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
