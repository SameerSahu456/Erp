import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Typography } from "@/components/ui/typography"
import { TablePagination } from "@/components/common/tables/TablePagination"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { ClampedText } from "@/components/common/display/ClampedText"
import { formatINRCompact } from "@/lib/currency"
import { stripHtml } from "@/lib/utils"
import { PAGINATION } from "@/shared/constants"
import { formatIST_date } from "@shared/lib/date"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { usePermission } from "@shared/rbac"

import { crmCan } from "../../permissions"
import {
  MATERIAL_INQUIRY_STATUS_LABELS,
  MATERIAL_INQUIRY_STATUS_VARIANT,
} from "../../constants/material-inquiry-status"
import { useMaterialInquiries } from "../../hooks/material-inquiries/useMaterialInquiries"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

type LinkedTo = "lead" | "deal"

export interface MaterialInquirySectionProps {
  /** Which detail page is hosting this list — drives the API filter
   *  (`?lead_id=` vs `?deal_id=`) and the create-link query string. */
  linkedTo: LinkedTo
  /** UUID of the lead or deal whose MIs we're scoping to. */
  linkedId: string
  /** View-only access (user reached the lead/deal only via an @mention):
   *  hides every write affordance. Defaults to false. */
  readOnly?: boolean
}

// Embedded "Material Inquiries" panel for Lead and Deal detail pages.
// Mirrors `QuoteSection` — infinite-scroll list scoped by lead_id/deal_id,
// scroll-to-load-more, hero empty state with a "Create Inquiry" CTA. The
// detail/edit/submit/close flows live on the dedicated MI pages, so this
// section only owns list + create-link.
export function MaterialInquirySection({
  linkedTo,
  linkedId,
  readOnly = false,
}: MaterialInquirySectionProps) {
  // Numbered pagination (Coding-guideline §16.7) — one page at a time via
  // the paged `useMaterialInquiries` query plus the shared `TablePagination`
  // footer.
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE)

  const listQuery = useMaterialInquiries({
    [linkedTo === "lead" ? "lead_id" : "deal_id"]: linkedId,
    sort: "-created_at",
    page,
    page_size: pageSize,
  } as Parameters<typeof useMaterialInquiries>[0])

  const items = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data?.items],
  )
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // MI create is gated on `crm:manage`/`crm:mi_write` server-side. Hide the
  // create affordance when the user lacks it so they can't click into a
  // guaranteed 403. `can()` grants superusers via the Layer-2 bypass.
  const { can } = usePermission()
  const canCreateMi = can(crmCan.writeMi) && !readOnly

  const isLoading = listQuery.isLoading && items.length === 0
  const isEmpty = !isLoading && items.length === 0
  const sectionLabel =
    linkedTo === "lead" ? S.section.linkedNoun.lead : S.section.linkedNoun.deal
  const createHref = `/crm/material-inquiries/new?${linkedTo}Id=${linkedId}`

  // A load failure (esp. a 403) owns the list area — but a viewer who can
  // create (has MI write without read) still gets the create button, so being
  // unable to view existing inquiries doesn't also hide the create action.
  if (listQuery.isError) {
    return (
      <div className="space-y-4">
        {canCreateMi && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" render={<Link to={createHref} />}>
              <Plus className="size-3.5" data-icon="inline-start" />
              {S.section.create}
            </Button>
          </div>
        )}
        <LoadErrorState
          error={listQuery.error}
          fallback={S.section.loadErrorPrefix}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Header — erp-demo style: a single right-aligned create
          button, hidden when the user lacks MI write. */}
      {canCreateMi && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" render={<Link to={createHref} />}>
            <Plus className="size-3.5" data-icon="inline-start" />
            {S.section.create}
          </Button>
        </div>
      )}

      {/* ── Loading skeleton ────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {/* ── Empty hero (mirrors erp-demo Lead/Deal Material Inquiries tab) ── */}
      {isEmpty && (
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-12 text-center">
          {/* The "+" badge + create hint only invite creation when the
              viewer can actually create — a read-only user just sees the
              "no inquiries" title. */}
          {canCreateMi && (
            <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.04)]">
              <Plus className="size-4" />
            </div>
          )}
          <p className="text-[13px] font-medium text-foreground">
            {S.section.empty(sectionLabel)}
          </p>
          {canCreateMi && (
            <Typography variant="helper" asChild>
              <p>{S.section.emptyHelper}</p>
            </Typography>
          )}
        </div>
      )}

      {/* ── List with numbered pagination ──────────────────────── */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((mi) => (
            <Link
              key={mi.id}
              to={`/crm/material-inquiries/${mi.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Typography
                    variant="body-strong"
                    tone="primary"
                    className="hover:underline"
                    asChild
                  >
                    <span>{mi.enquiry_number}</span>
                  </Typography>
                  <StatusBadge variant={MATERIAL_INQUIRY_STATUS_VARIANT[mi.status] ?? "neutral"}>
                    {MATERIAL_INQUIRY_STATUS_LABELS[mi.status] ?? mi.status}
                  </StatusBadge>
                </div>
                {mi.description && (
                  <ClampedText text={stripHtml(mi.description)} lines={2} />
                )}
              </div>
              <div className="shrink-0 text-right">
                {mi.client_budget != null && mi.client_budget > 0 && (
                  <Typography variant="body-strong" numeric>
                    {formatINRCompact(mi.client_budget, { decimals: true })}
                  </Typography>
                )}
                <Typography variant="helper" asChild>
                  <p>{S.section.createdAt(formatIST_date(mi.created_at))}</p>
                </Typography>
              </div>
            </Link>
          ))}
          {total > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              total={total}
              isFetching={listQuery.isFetching}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
