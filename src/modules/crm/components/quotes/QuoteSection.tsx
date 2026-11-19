import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Plus, X } from "lucide-react"

import { OverflowPillList } from "@/components/common/display/OverflowPillList"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Typography } from "@/components/ui/typography"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TablePagination } from "@/components/common/tables/TablePagination"
import { UnsavedChangesDialog } from "@/components/common/dialogs/UnsavedChangesDialog"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"
import { formatINR, formatINRCompact } from "@/lib/currency"
import { PAGINATION } from "@/shared/constants"
import { useMemoryState, useUrlPagination } from "@/shared/hooks"
import { formatIST, formatIST_date } from "@shared/lib/date"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { usePermission } from "@shared/rbac"

import { crmCan } from "../../permissions"
import type { QuotableType, QuoteListItemWire, QuoteStatus } from "../../api"
import {
  QUOTE_FILTER_STATUSES,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_VARIANT,
} from "../../constants/quote-status"
import {
  useQuote,
  useQuotes,
  useVersionQuote,
} from "../../hooks/quotes/useQuotes"
import { CellTooltip, HeadTooltip } from "../shared/CellTooltip"
import { CrmListFilterPanel } from "../shared/CrmListFilterPanel"
import { EmbeddedEmptyRow } from "../shared/EmbeddedEmptyRow"
import { EmbeddedFilterLayout } from "../shared/EmbeddedFilterLayout"
import {
  EmbeddedDateRangeFilter,
  EmbeddedSelectFilter,
  EmbeddedListToolbar,
} from "../shared/EmbeddedListToolbar"
import { useQuoteTabFilters } from "../../hooks/quotes/useQuoteTabFilters"
import { UserNamesCell } from "../shared/UserNamesCell"
import { QuoteBuilderPanel } from "./QuoteBuilderPanel"
import { QuoteRowActions } from "./QuoteRowActions"
import { QUOTES_STRINGS as S } from "./quotes.strings"

export interface QuoteSectionProps {
  /** 'lead' | 'deal' | 'account' — surfaces the quotable polymorphism to
   *  the API. Lead, Deal, and Account detail pages all share this section. */
  quotableType: QuotableType
  /** UUID of the lead or deal whose quotes we're scoping to. */
  quotableId: string
  /** Optional account context — forwarded to the Quote create page so the
   *  builder can attach the account by default. */
  accountId?: string
  /** Pre-navigation gate for "Convert to Sales Order". Return false to block
   *  the conversion (after showing your own toast) — the user stays on this
   *  page. The lead detail page uses it to enforce the close-won rules
   *  (stage past New/Contacted + Type set) at the CLICK, so a blocked lead
   *  never bounces through the wizard route. */
  onBeforeConvertToSO?: () => boolean
  /** View-only access (user reached the lead/deal only via an @mention):
   *  hides every write affordance. Defaults to false. */
  readOnly?: boolean
  /** The parent deal is Closed Won: no new quotes and no Convert to Sales
   *  Order (the API rejects both). Existing quotes stay viewable. */
  parentClosedWon?: boolean
}

export function QuoteSection({
  quotableType,
  quotableId,
  accountId,
  onBeforeConvertToSO,
  readOnly = false,
  parentClosedWon = false,
}: QuoteSectionProps) {
  const navigate = useNavigate()

  // Amend is keyed by `amendingId` instead of a mode flag because multiple
  // quote chains can coexist on the same lead/deal — only one can be amended
  // at a time, but which one is determined per-card.
  const [amendingId, setAmendingId] = useState<string | null>(null)
  const [panelDirty, setPanelDirty] = useState(false)

  const guard = useUnsavedChangesGuard({
    isDirty: panelDirty,
    onDiscard: () => {
      setPanelDirty(false)
      setAmendingId(null)
    },
  })

  function attemptExitAmend() {
    guard.attempt(() => {
      setPanelDirty(false)
      setAmendingId(null)
    })
  }

  function handleNewQuote() {
    const params = new URLSearchParams()
    if (quotableType === "lead") params.set("leadId", quotableId)
    else if (quotableType === "deal") params.set("dealId", quotableId)
    if (accountId) params.set("accountId", accountId)
    navigate(`/crm/quotes/new?${params.toString()}`)
  }

  // Numbered pagination (Coding-guideline §16.7) — one page at a time via
  // the paged `useQuotes` query plus the shared `TablePagination` footer.
  // Page + size live in the URL (`qt_page` / `qt_size`) next to the tab's filters
  // (`qt_*`), so a refresh, a shared link and a trip into a quote and back all keep
  // them; a filter change drops `qt_page` (page 1).
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    sizeKey: "qt_size",
    pageKey: "qt_page",
    defaultSize: PAGINATION.DEFAULT_PAGE_SIZE,
  })

  // Search + filters (shared toolbar), URL-backed.
  const filters = useQuoteTabFilters()

  // Starts open when a filter is already in the URL (refresh / shared link), then
  // stays as the user left it across detail round-trips.
  const [filtersOpen, setFiltersOpen] = useMemoryState(
    `crm:tab:quotes:${quotableType}:${quotableId}:open`,
    () => filters.asideActiveCount > 0,
  )

  const listQuery = useQuotes({
    quotable_type: quotableType,
    quotable_id: quotableId,
    sort: "-created_at",
    page,
    page_size: pageSize,
    ...filters.queryParams,
  })
  const versionMut = useVersionQuote()

  const items = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data?.items],
  )
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // Quote create is gated on `crm:manage`/`crm:quote_write` server-side. Hide
  // the "Create Quote" affordance when the user lacks it so they can't click
  // into a guaranteed 403. `can()` grants superusers via the Layer-2 bypass.
  const { can } = usePermission()
  // Also gates the row-level Convert to SO / Amend actions (both mutate).
  const canWriteQuote = can(crmCan.writeQuote) && !readOnly
  const canCreateQuote = canWriteQuote && !parentClosedWon
  // Quotes (and the sales orders drawn from them) are only started from a Lead
  // or a Deal — an Account's tab lists its quotes but never creates or converts.
  const isAccountSection = quotableType === "account"
  const canStartQuote = canCreateQuote && !isAccountSection

  const isLoading = listQuery.isLoading && items.length === 0
  const showAddButton = amendingId === null && canStartQuote

  const amendingDetailQuery = useQuote(amendingId ?? undefined, {
    enabled: amendingId !== null,
  })
  const amendingDetail = amendingDetailQuery.data

  function handleAmend(quoteId: string) {
    setAmendingId(quoteId)
  }

  function exitAmend() {
    setAmendingId(null)
  }

  // The quotable_type wire value (lowercase 'lead' | 'deal' | 'account') is
  // also the lowercase noun used in this section's sentence copy — no separate
  // label map needed.
  const sectionLabel = quotableType

  // A load failure (esp. a 403) owns the list area — but a viewer who can
  // create (has quote write without read) still gets the "Create Quote" button,
  // so being unable to view existing quotes doesn't also hide the create action.
  if (listQuery.isError) {
    return (
      <div className="space-y-4">
        {canStartQuote && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleNewQuote}>
              <Plus className="size-3.5" />
              Create Quote
            </Button>
          </div>
        )}
        <LoadErrorState
          error={listQuery.error}
          fallback={S.section.loadError("")}
        />
      </div>
    )
  }

  return (
    <EmbeddedFilterLayout
      open={filtersOpen}
      onClose={() => setFiltersOpen(false)}
      activeFilterCount={filters.asideActiveCount}
      aside={
        <CrmListFilterPanel
          selects={[]}
          createdBy={{
            label: S.section.filters.createdBy,
            value: filters.createdBy,
            onChange: filters.setCreatedBy,
          }}
          userMultiSelects={[
            {
              key: "approvedBy",
              label: S.section.filters.approvedBy,
              value: filters.approvedBy,
              onChange: filters.setApprovedBy,
            },
          ]}
          categoryOem={{
            categories: filters.categories,
            onCategoriesChange: filters.setCategories,
            oems: filters.oems,
            onOemsChange: filters.setOems,
          }}
          valueRange={{
            label: S.section.filters.total,
            value: filters.total,
            onChange: filters.setTotal,
          }}
          activeFilterCount={filters.asideActiveCount}
          onResetAll={filters.resetAside}
        />
      }
    >
      {/* The amending notice only shows while amending; the Create / Cancel
          buttons live on the toolbar row so the tab's top spacing matches the
          Deals and Sales Orders tabs. */}
      {amendingId !== null && (
        <Typography variant="body" tone="muted" asChild>
          <p>{S.section.amending(sectionLabel)}</p>
        </Typography>
      )}

      {/* ── Search + filters (shared with the Deals / Sales Orders tabs) ──
          Always shown — an empty tab keeps its filters and shows the empty state below. */}
      {(
        <EmbeddedListToolbar
          search={filters.search}
          onSearchChange={filters.setSearch}
          searchPlaceholder={S.section.filters.searchPlaceholder}
          asideOpen={filtersOpen}
          onToggleAside={() => setFiltersOpen((v) => !v)}
          asideActiveCount={filters.asideActiveCount}
          onClearAside={filters.resetAside}
          actions={
            <>
              {showAddButton && (
                <Button variant="outline" size="sm" className="h-9" onClick={handleNewQuote}>
                  <Plus className="size-3.5" />
                  {S.section.createQuote}
                </Button>
              )}
              {amendingId !== null && (
                <Button size="sm" variant="ghost" className="h-9" onClick={attemptExitAmend}>
                  <X className="size-4" />
                  {S.section.cancel}
                </Button>
              )}
            </>
          }
        >
          <EmbeddedDateRangeFilter
            label={S.section.filters.createdOn}
            value={filters.createdOn}
            onChange={filters.setCreatedOn}
          />
          {/* Single-select, same as the Quotes list page's Status filter. The URL
              keeps its list format (`qt_status`), so this is one value or none. */}
          <EmbeddedSelectFilter
            label={S.section.filters.status}
            allLabel={S.list.filters.statusAll}
            value={filters.statuses[0] ?? ""}
            options={QUOTE_STATUS_OPTIONS}
            onChange={(next) => filters.setStatuses(next ? [next as QuoteStatus] : [])}
          />
        </EmbeddedListToolbar>
      )}

      {/* ── Loading skeleton ──────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      )}

      {/* ── Table list with numbered pagination ───────────────────── */}
      {!isLoading && amendingId === null && (
        <div>
          {/* Same as the Accounts list: columns size to their content (even gaps, no ellipsis),
              and a table wider than its card scrolls sideways inside it. */}
          <Table className="min-w-full whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead><HeadTooltip label={S.section.columns.quoteNumber} /></TableHead>
                <TableHead><HeadTooltip label={S.section.columns.status} /></TableHead>
                <TableHead className="pr-6 text-right"><HeadTooltip label={S.section.columns.total} /></TableHead>
                <TableHead><HeadTooltip label={S.section.columns.createdOn} /></TableHead>
                <TableHead><HeadTooltip label={S.section.columns.createdBy} /></TableHead>
                <TableHead><HeadTooltip label={S.section.columns.approvedBy} /></TableHead>
                <TableHead><HeadTooltip label={S.section.columns.categories} /></TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <EmbeddedEmptyRow
                  colSpan={8}
                  filtered={filters.hasActive}
                  emptyTitle={S.section.emptyTitle(sectionLabel)}
                  onClearFilters={filters.clearAll}
                />
              ) : items.map((quote) => (
                <QuoteRow
                  key={quote.id}
                  quote={quote}
                  onAmend={handleAmend}
                  versionMut={versionMut}
                  onBeforeConvertToSO={onBeforeConvertToSO}
                  // Per-row too: a quote seen only through a mention is
                  // read-only even if the tab itself isn't.
                  canWrite={canWriteQuote && quote.access_level !== "view"}
                  canConvert={!isAccountSection && !parentClosedWon}
                />
              ))}
            </TableBody>
          </Table>
          {total > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              total={total}
              isFetching={listQuery.isFetching}
              onPageChange={setPage}
              // setPageSize also drops the page key in the same URL update; a follow-up
              // setPage(1) would read the stale URL and undo the size change.
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      )}

      {/* ── Inline amend panel ────────────────────────────────────── */}
      {amendingId !== null && amendingDetail && (
        <QuoteBuilderPanel
          key={`amend-${amendingDetail.id}`}
          mode="embedded"
          existing={amendingDetail}
          amendMode
          onDirtyChange={setPanelDirty}
          onCancelAmend={attemptExitAmend}
          onSaved={() => {
            setPanelDirty(false)
            exitAmend()
          }}
          onCancel={attemptExitAmend}
        />
      )}

      <UnsavedChangesDialog
        open={guard.dialogOpen}
        onOpenChange={guard.onDialogOpenChange}
        onConfirm={guard.onConfirmDiscard}
      />
    </EmbeddedFilterLayout>
  )
}

// Statuses the tab's filter offers (retired Sent / Accepted excluded) — the
// labels come from the domain map.
const QUOTE_STATUS_OPTIONS = QUOTE_FILTER_STATUSES.map((value) => ({
  value,
  label: QUOTE_STATUS_LABELS[value],
}))

interface QuoteRowProps {
  quote: QuoteListItemWire
  onAmend: (quoteId: string) => void
  versionMut: ReturnType<typeof useVersionQuote>
  /** See QuoteSectionProps.onBeforeConvertToSO. */
  onBeforeConvertToSO?: () => boolean
  /** False hides the mutating row actions (Convert to SO / Amend). */
  canWrite: boolean
  /** False hides Convert to SO — an Account's tab never starts a sales order,
   *  and a Closed Won parent deal accepts no new ones. */
  canConvert: boolean
}

function QuoteRow({
  quote,
  onAmend,
  versionMut,
  onBeforeConvertToSO,
  canWrite,
  canConvert,
}: QuoteRowProps) {
  const navigate = useNavigate()

  function goToDetail() {
    navigate(`/crm/quotes/${quote.id}`)
  }

  function handleConvertToSO() {
    // The host page can veto the conversion (e.g. the lead detail page blocks
    // it — with a toast — until the lead is past New/Contacted with a Type).
    // Blocked = stay on this page; no navigation at all.
    if (onBeforeConvertToSO && !onBeforeConvertToSO()) return
    // Lead / Deal quotes route through the dedicated ClosedWonPage so the
    // cascade UI (account inputs, compliance docs, address picker) runs
    // exactly as it does from the Leads/Deals list "Close Won" action. The
    // `quoteId` deep-link pre-selects this quote on the SO step.
    // Account quotes have no cascade — they stay on the standalone form.
    if (quote.quotable_type === "lead") {
      navigate(`/crm/leads/${quote.quotable_id}/close-won?type=lead&quoteId=${quote.id}`)
      return
    }
    if (quote.quotable_type === "deal") {
      navigate(`/crm/deals/${quote.quotable_id}/close-won?type=deal&quoteId=${quote.id}`)
      return
    }
    navigate(`/crm/sales-orders/new?quoteId=${quote.id}`)
  }

  return (
    <TableRow
      className="cursor-pointer"
      onClick={goToDetail}
    >
      <TableCell>
        <div className="flex min-w-0 items-center gap-2">
          <CellTooltip text={quote.quote_number} className="truncate">
            <Link
              to={`/crm/quotes/${quote.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium text-primary hover:underline"
            >
              {quote.quote_number}
            </Link>
          </CellTooltip>
          <Badge
            variant="outline"
            className="shrink-0 px-1.5 py-0 text-[10px] font-medium"
          >
            {S.versionPrefix}{quote.version_number}
          </Badge>
          {/* Label badges (e.g. SALES) are hidden for now — restore by rendering
              `quote.labels` as outline Badges here. */}
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge variant={QUOTE_STATUS_VARIANT[quote.status] ?? "neutral"} className="max-w-full">
          <CellTooltip
            text={QUOTE_STATUS_LABELS[quote.status] ?? quote.status}
            className="truncate"
          >
            {QUOTE_STATUS_LABELS[quote.status] ?? quote.status}
          </CellTooltip>
        </StatusBadge>
      </TableCell>
      <TableCell className="pr-6 text-right font-semibold tabular-nums">
        {/* Hover shows the exact amount to the paisa. */}
        <CellTooltip text={formatINR(quote.grand_total ?? 0)} className="truncate">
          {formatINRCompact(quote.grand_total ?? 0, { decimals: true })}
        </CellTooltip>
      </TableCell>
      <TableCell>
        <CellTooltip text={formatIST(quote.created_at)} className="truncate">
          {formatIST_date(quote.created_at)}
        </CellTooltip>
      </TableCell>
      <TableCell>
        <UserNamesCell users={quote.created_by_user ? [quote.created_by_user] : []} />
      </TableCell>
      <TableCell>
        <OverflowPillList
          items={quote.approved_by_users ?? []}
          getItemKey={(u) => u.id}
          getItemLabel={(u) => u.name ?? "—"}
          summaryLabel={S.section.approvedByPill.summaryLabel}
          hoverTitle={S.section.approvedByPill.hoverTitle}
        />
      </TableCell>
      <TableCell>
        <OverflowPillList
          items={quote.categories ?? []}
          getItemKey={(category) => category}
          getItemLabel={(category) => category}
          summaryLabel={S.section.categoriesPill.summaryLabel}
          hoverTitle={S.section.categoriesPill.hoverTitle}
        />
      </TableCell>
      <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
        <QuoteRowActions
          quoteId={quote.id}
          quoteNumber={quote.quote_number}
          versionNumber={quote.version_number}
          status={quote.status}
          isLatest={quote.is_latest_quote}
          onAmended={(newId) => navigate(`/crm/quotes/${newId}/edit`)}
          onAmendInline={onAmend}
          onConvertToSO={canWrite && canConvert ? handleConvertToSO : undefined}
          canAmend={canWrite}
          versionMut={versionMut}
        />
      </TableCell>
    </TableRow>
  )
}
