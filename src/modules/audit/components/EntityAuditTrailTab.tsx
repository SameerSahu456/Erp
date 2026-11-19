// Tiny adapters: drive the existing <AuditTrail> UI with live audit data.
// One adapter per entity kind so detail pages don't need to know about
// useEntityAuditTrail / auditEntryToActivity.
//
// The closed-lost `extraEntries` shim (a synthetic local entry when the
// page knows the deal/lead was just marked lost) continues to flow through
// as-is — it lives entirely in the CRM detail pages.

import { useMemo, useState } from "react"
import { ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ApiError } from "@/shared/api/envelope"
import { AuditTrail } from "@/modules/crm/components/shared/AuditTrail"
import type { Activity } from "@/modules/crm/types"
import { PAGINATION } from "@/shared/constants"
import { useScrollToHashTarget } from "@shared/notifications/use-scroll-to-hash-target"

import { AUDIT_STRINGS as A } from "../audit.strings"
import { auditEntryToActivity } from "../mappers/toActivity"
import {
  type AuditEntityKind,
  type AuditOrder,
  useEntityAuditTrail,
} from "../hooks/useEntityAuditTrail"

interface EntityAuditTrailTabProps {
  entity: AuditEntityKind
  entityId: string
  extraEntries?: Activity[]
  /** Show the oldest/newest toggle. Off by default so the lead and deal
   *  timelines keep the single newest-first reading they have today. */
  sortable?: boolean
}

export function EntityAuditTrailTab({
  entity,
  entityId,
  extraEntries = [],
  sortable = false,
}: EntityAuditTrailTabProps) {
  // Numbered pagination (Coding-guideline §16.7) — one page at a time, with
  // the shared `TablePagination` footer (mirrors Notes / Comments / Tasks).
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE)
  // Server-side: the timeline is paged, so flipping the order has to
  // re-fetch rather than reverse the page in hand (§16.7).
  const [order, setOrder] = useState<AuditOrder>("newest")

  const q = useEntityAuditTrail(entity, entityId, { page, pageSize, order })

  const entries = useMemo(
    () =>
      (q.data?.items ?? []).map((entry) =>
        auditEntryToActivity(entry, entity, entityId),
      ),
    [q.data, entity, entityId],
  )

  const total = q.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // Deep-link landing — identical mechanism + highlight UI to notification
  // clicks: a `#audit-<id>` hash (built by activityLogNavigation) scrolls the
  // matching row into view and flashes the shared ring. Page-walks numbered
  // pages toward the row when it isn't on the currently loaded page.
  useScrollToHashTarget({
    ready: entries.length,
    expectedPrefix: "audit",
    isFetching: q.isFetching,
    paginated: { page, totalPages, setPage },
  })

  const isForbidden =
    q.isError && q.error instanceof ApiError && q.error.statusCode === 403

  return (
    <>
      {sortable && (
        <div className="mb-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Page 1 on every flip: staying on page 3 of a reversed
              // timeline lands the reader somewhere arbitrary.
              setOrder((prev) => (prev === "newest" ? "oldest" : "newest"))
              setPage(1)
            }}
            aria-label={A.sortToggleLabel}
          >
            <ArrowUpDown className="size-4" />
            {order === "newest" ? A.newestFirst : A.oldestFirst}
          </Button>
        </div>
      )}
    <AuditTrail
      entityType={entity}
      // The server ordered this timeline — the UI never re-sorts it; only the
      // synthetic "just marked lost" row needs to know which end is newest.
      extraEntriesFirst={order === "newest"}

      entityId={entityId}
      entries={entries}
      extraEntries={extraEntries}
      isLoading={q.isLoading}
      isError={q.isError && !isForbidden}
      isForbidden={isForbidden}
      page={page}
      totalPages={totalPages}
      pageSize={pageSize}
      total={total}
      isFetching={q.isFetching}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size)
        setPage(1)
      }}
      onRetry={() => {
        void q.refetch()
      }}
    />
    </>
  )
}

export function LeadAuditTrailTab({
  leadId,
  extraEntries,
}: {
  leadId: string
  extraEntries?: Activity[]
}) {
  return <EntityAuditTrailTab entity="lead" entityId={leadId} extraEntries={extraEntries} />
}

export function DealAuditTrailTab({
  dealId,
  extraEntries,
}: {
  dealId: string
  extraEntries?: Activity[]
}) {
  return <EntityAuditTrailTab entity="deal" entityId={dealId} extraEntries={extraEntries} />
}
