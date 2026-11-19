import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { TablePagination } from '@/components/common/tables/TablePagination'
import { PAGINATION } from '@/shared/constants'
import { mockActivities } from '../../data/activities'
import type { Activity } from '../../types'

import { FILTER_CONFIG, type FilterKey } from './auditTrailHelpers'
import { AuditEntry } from './AuditEntry'
import { CRM_SHARED_STRINGS } from './crm-shared.strings'

interface AuditTrailProps {
  /** Which entity this timeline belongs to. Widened past lead/deal so a
   *  sales order or a rental device can render the same timeline. */
  entityType: 'lead' | 'deal' | 'rental_device' | 'sales_order'
  /** Where the synthetic `extraEntries` row goes on page 1: first on a
   *  newest-first timeline (default), last on an oldest-first one. Entries are
   *  never re-sorted here — the API orders the whole timeline. */
  extraEntriesFirst?: boolean
  entityId: string
  extraEntries?: Activity[]
  /** When provided, replaces the mockActivities fallback. Legacy callers without this prop keep working. */
  entries?: Activity[]
  isLoading?: boolean
  isError?: boolean
  isForbidden?: boolean
  /** Numbered pagination (§16.7) — mirrors the Notes / Comments / Tasks tabs. */
  page?: number
  totalPages?: number
  pageSize?: number
  total?: number
  isFetching?: boolean
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  onRetry?: () => void
}

function AuditTrail({
  entityType,
  extraEntriesFirst = true,
  entityId,
  extraEntries = [],
  entries,
  isLoading = false,
  isError = false,
  isForbidden = false,
  page = 1,
  totalPages = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  total = 0,
  isFetching = false,
  onPageChange,
  onPageSizeChange,
  onRetry,
}: AuditTrailProps) {
  // v1: only "All" is active — backend has no action filter yet. The filter
  // chips are commented out below; re-enable them together with `setActiveFilter`.
  const [activeFilter] = useState<FilterKey>('all')
  // Per-row expand state for the "Show changes" affordance. Keyed by activity id.
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set())
  const toggleExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const baseEntries =
    entries ??
    mockActivities.filter((a) => a.entityType === entityType && a.entityId === entityId)
  // Entries keep the order the API sent (it orders the whole timeline, so a
  // client-side re-sort would only reorder this page). The synthetic
  // `extraEntries` shim (e.g. a just-marked-lost entry) is the newest row —
  // only on page 1 so it isn't repeated on every page under numbered pagination.
  const allEntries =
    page === 1
      ? extraEntriesFirst
        ? [...extraEntries, ...baseEntries]
        : [...baseEntries, ...extraEntries]
      : baseEntries

  const filtered =
    activeFilter === 'all'
      ? allEntries
      : allEntries.filter((a) => FILTER_CONFIG[activeFilter].types.includes(a.type))

  return (
    <div className="space-y-4">
      {/* Filter chips (All / Stage Changes / Assignments / Documents / Activities)
          are commented out — only "All" was ever enabled (no backend action
          filter yet). Restore this block when the backend supports filtering.
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_CONFIG) as FilterKey[]).map((key) => {
          const disabled = key !== 'all'
          return (
            <Button
              key={key}
              variant={activeFilter === key ? 'default' : 'secondary'}
              size="sm"
              disabled={disabled}
              title={disabled ? CRM_SHARED_STRINGS.auditTrail.filteringComingSoon : undefined}
              data-testid={`audit-chip-${key}`}
              onClick={() => {
                if (!disabled) setActiveFilter(key)
              }}
            >
              {FILTER_CONFIG[key].label}
            </Button>
          )
        })}
      </div>

      */}

      {/* Forbidden — surfaces the 403 from the audit-trail endpoint. */}
      {isForbidden && (
        <div className="rounded-lg border border-dashed p-8 text-center" data-testid="audit-forbidden">
          <Typography variant="body" tone="muted">
            {CRM_SHARED_STRINGS.auditTrail.forbidden}
          </Typography>
        </div>
      )}

      {/* Error — generic transient failure (network, 5xx). Forbidden takes precedence. */}
      {!isForbidden && isError && (
        <div className="rounded-lg border border-dashed p-8 text-center space-y-3" data-testid="audit-error">
          <Typography variant="body" tone="muted">
            {CRM_SHARED_STRINGS.auditTrail.loadError}
          </Typography>
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              {CRM_SHARED_STRINGS.auditTrail.retry}
            </Button>
          )}
        </div>
      )}

      {/* Loading skeleton — shown only on the first page load. */}
      {!isForbidden && !isError && isLoading && filtered.length === 0 && (
        <div
          className="relative space-y-4 pl-6"
          data-testid="audit-skeleton"
          role="status"
          aria-label={CRM_SHARED_STRINGS.auditTrail.loadingAriaLabel}
        >
          <div className="absolute top-0 bottom-0 left-[5px] w-0.5 bg-border" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="relative flex gap-3">
              <div className="absolute -left-6 top-1.5 size-3 rounded-full bg-muted" />
              <div className="min-w-0 flex-1 rounded-lg border bg-muted/30 p-1.5">
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-2 w-1/4 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      {!isForbidden && !isError && filtered.length > 0 ? (
        <div className="relative space-y-3 pl-6">
          {/* Vertical line */}
          <div className="absolute top-0 bottom-0 left-[5px] w-0.5 bg-border" />

          {filtered.map((activity) => (
            <AuditEntry
              key={activity.id}
              activity={activity}
              expanded={expandedRows.has(activity.id)}
              onToggleExpand={() => toggleExpanded(activity.id)}
            />
          ))}

          {/* Numbered pagination footer (§16.7) — shown only for live,
              server-paged data (onPageChange wired by EntityAuditTrailTab). */}
          {onPageChange && total > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              total={total}
              isFetching={isFetching}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          )}
        </div>
      ) : (
        !isForbidden &&
        !isError &&
        !isLoading && (
          <div className="rounded-lg border border-dashed p-8 text-center" data-testid="audit-empty">
            <Typography variant="body" tone="muted">
              {CRM_SHARED_STRINGS.auditTrail.empty}
            </Typography>
          </div>
        )
      )}
    </div>
  )
}

export { AuditTrail, type AuditTrailProps }
