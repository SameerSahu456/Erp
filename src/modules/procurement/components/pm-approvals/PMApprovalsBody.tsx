import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePersistedState } from '@/hooks/use-persisted-state'
import { PAGINATION } from '@/shared/constants'
import { useUrlPagination } from '@shared/hooks'
import { ShoppingCart, Search, Monitor, Receipt, ArchiveRestore, Replace, ClipboardList } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { ListPageShell } from '@/components/page-shells/ListPageShell'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { TruncatedText } from '@/components/common/display/TruncatedText'
import { StatsRow, type StatCardData } from '@/components/common/display/StatsRow'
import { type ColumnDef, type CellFormatter, type ToolbarFilter } from '@/components/common/tables/BusinessMetricsTable'
// `usePOs` / `actOnPO` are gone with the mock PO tab — the PO queue is now the
// live <RealPoApprovalsTab/> below.
import { formatCurrency, formatDate } from '../../pm-approvals-shared'
import { RealPoApprovalsTab } from './RealPoApprovalsTab'
import { PO_SORT, PO_SORT_KEYS } from './pm-queue-sort'
import { PmQueueTable } from './PmQueueTable'
import { AccountMultiFilter, UserMultiFilter } from './QueueFilters'
import {
  toSortParam,
  usePmQueueFilters,
  type PmQueueFilters,
} from '../../hooks/pm-approvals/usePmQueueFilters'
import { AccountLink, RecordLink } from './RecordLink'
import type { DemoRequestListItemWire, SalesOrderListItemWire } from '@modules/crm'
import { rentalsCan } from '@modules/rentals'
import { RentalOrderTag } from '@modules/wms'
import { useMyPoApprovals } from '../../hooks/purchase-orders/usePurchaseOrders'
import { PURCHASE_ORDER_PAGE_SIZE } from '../../constants'
import { PM_APPROVALS_STRINGS } from './pm-approvals.strings'

const S = PM_APPROVALS_STRINGS
import { usePermission } from '@shared/rbac'
import { useAuth } from '@shared/auth/use-auth'
import { crmCanAll } from '@/modules/crm/permissions'
import { procurementCan } from '../../permissions'
import { useMyPMQueue } from '../../hooks/pm-approvals/useMIResponses'
import {
  // SalesOrderApprovalRow, — inline-expand SO row is commented out below
  SO_STATUS_LABELS,
  SO_STATUS_VARIANT,
  useMyPendingSalesOrders,
  usePendingDemoRequestsForPM,
  useApproveReplacementItems,
  useDecideSalesReturnRequestItems,
  useRejectReplacementItem,
  useReplacementRequestsPendingPM,
  useSalesReturnRequestsPendingPM,
  useMyPendingQuotes,
  QUOTE_APPROVALS_STRINGS,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_VARIANT,
  type QuoteApprovalPendingQuoteWire,
} from '@modules/crm'
// Two string bundles meet in this file: `S` is the pm-approvals-local bundle
// (dev's, backs the SO queue headers) and `SHARED` is the one the sales-return
// and replacement queues share with `pm-approvals-shared.tsx`. Distinct names
// because both define a `tabs` key.
import { PM_APPROVALS_SHARED_STRINGS as SHARED } from '../../pm-approvals-shared.strings'

export type ApprovalTab = 'mi' | 'so' | 'pr' | 'po' | 'demo' | 'quote' | 'sret' | 'rr'

// One default size for every queue (§16.6); each tab's pager lets the user
// change it via the shared TablePagination rows-per-page select.
const PM_APPROVALS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

// URL page-number keys, one per server-paged tab (the PO tab owns `po_page`).
// Cleared together on a deliberate tab switch — same as the Accounts tabs.
const PAGE_KEYS = ['mi_page', 'so_page', 'po_page', 'quote_page', 'sret_page', 'rr_page', 'demo_page'] as const

// ── Material Inquiry queue ──
const MI_COLUMNS: ColumnDef[] = [
  { key: 'enquiry_number', label: S.miQueue.columns.inquiry, width: '200px' },
  { key: 'company_name', label: S.miQueue.columns.customer },
  { key: 'items_with_pending', label: S.miQueue.columns.items, align: 'right' },
  { key: 'pending_response_count', label: S.miQueue.columns.pending, align: 'right' },
  { key: 'oldest_pending_at', label: S.miQueue.columns.oldestPending },
  { key: 'created_by_name', label: S.miQueue.columns.createdBy },
  { key: 'created_at', label: S.miQueue.columns.createdAt },
]

const miCellFormatter: CellFormatter = (_value, key, row) => {
  if (key === 'enquiry_number') {
    return {
      display: (
        <RecordLink to={`/crm/material-inquiries/${row.id as string}`}>
          {String(row.enquiry_number)}
        </RecordLink>
      ),
    }
  }
  if (key === 'company_name') return { display: (row.company_name as string | null) ?? '—' }
  if (key === 'oldest_pending_at') return { display: formatDate(row.oldest_pending_at as string) }
  if (key === 'created_by_name') return { display: (row.created_by_name as string | null) ?? '—' }
  if (key === 'created_at') return { display: formatDate(row.created_at as string) }
  return null
}

// ── Server sort: table column key → the endpoint's allow-listed `sort` field.
// Only these columns are clickable; the URL `<tab>_sort` is validated against
// the same keys (§11.1).
const SO_SORT: Record<string, string> = {
  order_number: 'order_number',
  account_name: 'account_name',
  grand_total: 'grand_total',
  submitted_at: 'submitted_at',
}
const SRET_SORT: Record<string, string> = {
  request_number: 'request_number',
  order_number: 'order_number',
  account_name: 'account_name',
  created_at: 'created_at',
  pending_lines: 'awaiting',
}
const RR_SORT: Record<string, string> = {
  request_number: 'request_number',
  created_at: 'created_at',
}
const DEMO_SORT: Record<string, string> = {
  demo_number: 'demo_number',
  account_name: 'account_name',
  created_at: 'created_at',
  expected_return_date: 'expected_return_date',
}
const SO_SORT_KEYS = Object.keys(SO_SORT)
const SRET_SORT_KEYS = Object.keys(SRET_SORT)
const RR_SORT_KEYS = Object.keys(RR_SORT)
const DEMO_SORT_KEYS = Object.keys(DEMO_SORT)

// ── Quote queue ──
// Mirrors the SO queue (QUOTE-APPR-T11 — same shade / shape for parallel
// statuses). Flat row per quote; per-line approve/reject lives on the quote
// detail page, so the queue only surfaces the pending counts and status.
const QUOTE_COLUMNS: ColumnDef[] = [
  // Width matches SO (`SO-YYYY-...` fits full in 200px — no truncation).
  { key: 'quote_number', label: QUOTE_APPROVALS_STRINGS.columns.quote, width: '200px' },
  { key: 'account_name', label: QUOTE_APPROVALS_STRINGS.columns.account, width: '220px' },
  { key: 'submitted_by_name', label: QUOTE_APPROVALS_STRINGS.columns.submittedBy, width: '160px' },
  // Pending items (mine of total) — same role as SRet's `pending_lines`.
  { key: 'eligible_items_count', label: QUOTE_APPROVALS_STRINGS.columns.item, align: 'right' },
  { key: 'updated_at', label: S.soQueue.columns.submittedAt },
  // Capped at the column: longer "Pending Approval" / "Partially Approved"
  // badges ellipsize instead of overlapping the next column (mirrors SO).
  { key: 'status', label: QUOTE_APPROVALS_STRINGS.columns.status, width: '200px' },
]

const quoteCellFormatter: CellFormatter = (_value, key, row) => {
  const q = row as unknown as QuoteApprovalPendingQuoteWire
  if (key === 'quote_number') {
    return { display: <RecordLink to={`/crm/quotes/${q.quote_id}`}>{q.quote_number}</RecordLink> }
  }
  if (key === 'account_name') {
    if (!q.account_name) return { display: '—' }
    if (q.account_id) {
      return { display: <AccountLink accountId={q.account_id}>{q.account_name}</AccountLink> }
    }
    if (q.quotable_type === 'lead' && q.quotable_id) {
      return { display: <RecordLink to={`/crm/leads/${q.quotable_id}`}>{q.account_name}</RecordLink> }
    }
    return { display: q.account_name }
  }
  if (key === 'submitted_by_name') return { display: q.submitted_by_name ?? '—' }
  if (key === 'status') {
    const status = q.status as keyof typeof QUOTE_STATUS_VARIANT
    return {
      display: (
        <StatusBadge variant={QUOTE_STATUS_VARIANT[status] ?? 'neutral'} className="max-w-full">
          <TruncatedText
            value={QUOTE_STATUS_LABELS[status] ?? q.status}
            className="min-w-0 max-w-full"
          />
        </StatusBadge>
      ),
    }
  }
  if (key === 'eligible_items_count') {
    return { display: `${q.eligible_items_count}/${q.total_pending_items}` }
  }
  if (key === 'updated_at') return { display: formatDate(q.updated_at) }
  return null
}

// ── Sales Order queue ──
// Plain rows — the inline expand-to-approve-lines panel is commented out
// (see the SO tab below); approvals happen on the SO detail page.
const SO_COLUMNS: ColumnDef[] = [
  // Wide enough for a full SO-YYYY-MM-DD-NNNNN — never truncated (L-1).
  { key: 'order_number', label: S.soQueue.columns.order, width: '200px', sortable: true },
  { key: 'account_name', label: S.soQueue.columns.account, width: '220px', sortable: true },
  { key: 'created_by', label: S.soQueue.columns.createdBy },
  { key: 'submitted_by', label: S.soQueue.columns.submittedBy },
  { key: 'submitted_at', label: S.soQueue.columns.submittedAt, sortable: true },
  // Fixed so today's widest badge ("Partially Approved" / "Pending PM
  // Approval") fits in full; anything longer ellipsizes in the cell.
  { key: 'status', label: S.soQueue.columns.status, width: '200px' },
  { key: 'grand_total', label: S.soQueue.columns.total, align: 'right', sortable: true },
]

const soCellFormatter: CellFormatter = (_value, key, row) => {
  const so = row as unknown as SalesOrderListItemWire
  if (key === 'order_number') {
    return { display: <RecordLink to={`/crm/sales-orders/${so.id}`}>{so.order_number}</RecordLink> }
  }
  if (key === 'account_name') {
    return {
      display: so.account_name ? (
        <AccountLink accountId={so.account_id}>{so.account_name}</AccountLink>
      ) : '—',
    }
  }
  if (key === 'created_by') return { display: so.created_by_detail?.name ?? '—' }
  if (key === 'submitted_by') return { display: so.submitted_by_detail?.name ?? '—' }
  if (key === 'submitted_at') return { display: so.submitted_at ? formatDate(so.submitted_at) : '—' }
  if (key === 'status') {
    return {
      display: (
        // Capped at the column: a status longer than the 200px column
        // ellipsizes (full label in the tooltip) instead of overlapping Total.
        <StatusBadge variant={SO_STATUS_VARIANT[so.status] ?? 'neutral'} className="max-w-full">
          <TruncatedText
            value={SO_STATUS_LABELS[so.status] ?? so.status}
            className="min-w-0 max-w-full"
          />
        </StatusBadge>
      ),
    }
  }
  if (key === 'grand_total') return { display: formatCurrency(Number(so.grand_total)) }
  return null
}

/** One tab's search box + filter controls → PmQueueTable's toolbar props. */
function queueToolbar(
  f: PmQueueFilters,
  placeholder: string,
  opts: {
    accounts?: boolean
    users?: boolean
    /** User filter placeholder — "Created by" / "Requested by" / "Users". */
    usersLabel?: string
    /** Date-range picker placeholder — "Created Date" / "Submitted Date". */
    dateLabel?: string
  } = {},
) {
  const toolbarFilters: ToolbarFilter[] = []
  if (opts.accounts) {
    toolbarFilters.push({
      key: 'account',
      label: S.queueFilters.accountFilterLabel,
      value: f.accountIds.join(','),
      options: [],
      render: () => <AccountMultiFilter value={f.accountIds} onChange={f.setAccountIds} />,
    })
  }
  if (opts.users) {
    toolbarFilters.push({
      key: 'user',
      label: S.queueFilters.userFilterLabel,
      value: f.userIds.join(','),
      options: [],
      render: () => (
        <UserMultiFilter value={f.userIds} onChange={f.setUserIds} placeholder={opts.usersLabel} />
      ),
    })
  }
  return {
    search: { value: f.searchInput, onChange: f.setSearch, placeholder },
    dateRange: opts.dateLabel
      ? { value: f.dateRange, onChange: f.setDateRange, placeholder: opts.dateLabel }
      : undefined,
    toolbarFilters,
    onClearFilters: f.clear,
    filtersActive: f.active,
  }
}

/** URL pager + result total → the pager shape PmQueueTable takes. */
function toPager(
  pager: { page: number; pageSize: number; setPage: (n: number) => void; setPageSize: (n: number) => void },
  total: number,
  isFetching: boolean,
) {
  return { ...pager, total, isFetching }
}

export function PMApprovalsBody() {
  const navigate = useNavigate()
  const { can, isSuperuser } = usePermission()
  const { user } = useAuth()
  const currentUserId = user?.id
  // Per-tab gating — backend gates the corresponding approve endpoint on
  // each finer code, so hide tabs the user can't act on. A user may hold
  // only one of these (e.g. APM has `crm:mi_approve` + `crm:dr_approve`
  // but not `procurement:approve`), so we route them to their first
  // accessible tab on mount.
  // Approve bundles require BOTH the approve code AND the read code —
  // can't responsibly approve what you can't see. `crmCanAll.approveX`
  // is an AND-of-OR-bundles where each inner array is an OR-bundle of
  // (broad-OR-finer) codes.
  const canApproveMi = crmCanAll.approveMi.every((bundle) => can([...bundle]))
  // A `rentals:rate_change_approve` holder decides rental rate changes in
  // this tab (the server scopes their queue to those lines).
  const canApproveSo =
    crmCanAll.approveSo.every((bundle) => can([...bundle])) ||
    can([...rentalsCan.approveRateChange])
  const canApproveDr = crmCanAll.approveDr.every((bundle) => can([...bundle]))
  // Procurement — accept EITHER the fine `procurement:po_approve` or the legacy
  // umbrella `procurement:approve`. Backend OR-lists both on every PO approve
  // endpoint (see procurement-permissions-fe.md §Endpoints → PO), so users on
  // either code should see the PR/PO tab in this aggregate inbox.
  const canApproveProc = can([...procurementCan.approvePo])
  // A sales-return decision is gated on crm:manage plus the per-line
  // assigned-PM check the server enforces; the queue is already scoped
  // server-side, so the tab only needs the endpoint permission.
  const canApproveSret = can([...crmCanAll.approveSo[0]!])
  const canApproveQuote = crmCanAll.approveQuote.every((bundle) => can([...bundle]))

  // Active tab — controlled (which queue table renders). Every permitted
  // queue loads on page open so all tab counts show; persisted so a hard
  // refresh lands you back on whichever queue you were working in.
  const [activeTab, setActiveTab] = usePersistedState<ApprovalTab>(
    'procurement-pm-approvals:tab',
    'mi',
  )

  // Tabs the user can actually open, in display order. Drives both the
  // default-tab routing below and the per-query `enabled` gating (so a queue
  // request never fires for a tab the user can't see).
  const accessibleTabs = useMemo<ApprovalTab[]>(() => {
    const tabs: ApprovalTab[] = []
    if (canApproveMi) tabs.push('mi')
    if (canApproveSo) tabs.push('so')
    // 'pr' stays out — the Purchase Request queue code was removed, not just hidden.
    if (canApproveProc) tabs.push('po')
    if (canApproveDr) tabs.push('demo')
    // Sales returns ride the same crm:manage gate the decide endpoint uses.
    if (canApproveSret) tabs.push('sret')
    // Replacements ride the same gate as sales returns.
    if (canApproveSret) tabs.push('rr')
    if (canApproveQuote) tabs.push('quote')
    return tabs
  }, [canApproveMi, canApproveSo, canApproveProc, canApproveDr, canApproveSret, canApproveQuote])

  // The persisted/default tab is 'mi', but a user without MI access must not
  // land (or stay) there — route them to their first accessible tab. Runs
  // when permissions resolve or the accessible set changes.
  useEffect(() => {
    if (accessibleTabs.length > 0 && !accessibleTabs.includes(activeTab)) {
      setActiveTab(accessibleTabs[0]!)
    }
  }, [accessibleTabs, activeTab, setActiveTab])

  // Queue pagination (1-indexed) — URL-backed per tab, like the Accounts
  // tabs, so a detail round-trip (browser back) restores the page and size.
  const miPager = useUrlPagination({ pageKey: 'mi_page', sizeKey: 'mi_size', defaultSize: PM_APPROVALS_PAGE_SIZE })
  const soPager = useUrlPagination({ pageKey: 'so_page', sizeKey: 'so_size', defaultSize: PM_APPROVALS_PAGE_SIZE })
  const quotePager = useUrlPagination({ pageKey: 'quote_page', sizeKey: 'quote_size', defaultSize: PM_APPROVALS_PAGE_SIZE })
  const demoPager = useUrlPagination({ pageKey: 'demo_page', sizeKey: 'demo_size', defaultSize: PM_APPROVALS_PAGE_SIZE })
  const sretPager = useUrlPagination({ pageKey: 'sret_page', sizeKey: 'sret_size', defaultSize: PM_APPROVALS_PAGE_SIZE })
  const rrPager = useUrlPagination({ pageKey: 'rr_page', sizeKey: 'rr_size', defaultSize: PM_APPROVALS_PAGE_SIZE })
  // Per-tab search + filters (URL-backed under each tab's own keys; any change
  // resets that tab's page). The PO tab owns its own (`po`) in RealPoApprovalsTab.
  const miFilters = usePmQueueFilters('mi')
  const soFilters = usePmQueueFilters('so', SO_SORT_KEYS)
  const sretFilters = usePmQueueFilters('sret', SRET_SORT_KEYS)
  const rrFilters = usePmQueueFilters('rr', RR_SORT_KEYS)
  const demoFilters = usePmQueueFilters('demo', DEMO_SORT_KEYS)
  // Reject needs a reason, so it goes through a dialog; approve is one click.
  const [sretRejecting, setSretRejecting] = useState<string | null>(null)
  const [sretRejectReason, setSretRejectReason] = useState('')
  const [rrRejecting, setRrRejecting] = useState<string | null>(null)
  const [rrRejectReason, setRrRejectReason] = useState('')
  const [, setSearchParams] = useSearchParams()
  // A deliberate tab click starts the new queue on page 1 (every tab's page
  // key is cleared in one URL write); page sizes are kept.
  function handleTabChange(next: ApprovalTab) {
    setActiveTab(next)
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        for (const key of PAGE_KEYS) params.delete(key)
        return params
      },
      { replace: true },
    )
  }

  // Material Inquiries: live API, lazy, grouped-per-inquiry and
  // server-paginated by the same (page, pageSize) shape as Sales Orders.
  const miPage = { page: miPager.page, page_size: miPager.pageSize }
  const miQueueQuery = useMyPMQueue(
    // No account filter on MI (removed per request) — search only.
    {
      ...miPage,
      search: miFilters.search || undefined,
      user_id: miFilters.userIds,
      date_from: miFilters.dateFrom,
      date_to: miFilters.dateTo,
    },
    // Fires on page load (not only when the tab is open) so the tab badge and
    // stat card show the real count up front — same as the PO queue. Gated on
    // permission so a user who can't see the tab never calls it.
    { enabled: canApproveMi },
  )
  const miQueue = miQueueQuery.data?.items ?? []
  const miQueueTotal = miQueueQuery.data?.total ?? 0
  // Tab badge + stat card follow the tab's search / filters (the filtered total).
  const miBadge = miQueueTotal
  // Sales Orders — the caller's PERSONAL approver queue via
  // `GET /crm/sales-orders/me/pending` (SOs where this user is the approver on
  // ≥1 Pending line and the header is Submitted/PartiallyApproved). Scoped
  // server-side, so the count + rows reflect "needs me", not every in-flight
  // SO in the org. Server-paginated by (page, pageSize).
  const soPendingQuery = useMyPendingSalesOrders({
    // Loads up front for the tab badge + stat card (like PO); permission-gated.
    enabled: canApproveSo,
    page: soPager.page,
    pageSize: soPager.pageSize,
    search: soFilters.search,
    accountIds: soFilters.accountIds,
    userIds: soFilters.userIds,
    // SO's date range is on submitted_at.
    dateFrom: soFilters.dateFrom,
    dateTo: soFilters.dateTo,
    sort: toSortParam(soFilters.sort, SO_SORT),
  })
  const soPendingItems = soPendingQuery.items
  const soPendingTotal = soPendingQuery.total
  const soBadge = soPendingTotal
  // PO-approval count for the tab badge + stat, derived from the SAME page-1
  // query the PO tab's <RealPoApprovalsTab/> runs (identical queryKey → one
  // shared request, deduped by TanStack). This replaces the former dedicated
  // page_size:1 count query, so the badge no longer fires a second request that
  // duplicated the list's own `total`.
  // Gated like the tab itself — a user without procurement:approve would
  // otherwise fire a 403 just to count a queue they can't open.
  // Carries the PO tab's toolbar search (`po_q`, owned by RealPoApprovalsTab)
  // so the badge follows it like every other tab's.
  const poFilters = usePmQueueFilters('po', PO_SORT_KEYS)
  const realPoApprovals = useMyPoApprovals(
    {
      page: 1,
      page_size: PURCHASE_ORDER_PAGE_SIZE,
      search: poFilters.search || undefined,
      user_id: poFilters.userIds,
      date_from: poFilters.dateFrom,
      date_to: poFilters.dateTo,
      // Same sort as the tab → identical queryKey → one shared request.
      sort: toSortParam(poFilters.sort, PO_SORT),
    },
    { enabled: canApproveProc },
  )
  const realPoApprovalCount = realPoApprovals.data?.total ?? 0
  // Server-paginated + filtered (the endpoint used to return the whole queue,
  // which this page windowed client-side).
  const demoPage = { page: demoPager.page, page_size: demoPager.pageSize }
  const demoQueueQuery = usePendingDemoRequestsForPM(
    {
      ...demoPage,
      search: demoFilters.search || undefined,
      account_id: demoFilters.accountIds,
      // Demo's user filter is the requester (requested_by).
      user_id: demoFilters.userIds,
      date_from: demoFilters.dateFrom,
      date_to: demoFilters.dateTo,
      sort: toSortParam(demoFilters.sort, DEMO_SORT),
    },
    // Loads up front for the tab badge + stat card (like PO); permission-gated.
    { enabled: canApproveDr },
  )
  // Sales returns — scoped server-side to lines this PM may decide, so
  // every row is actionable rather than merely visible.
  const sretPage = { page: sretPager.page, page_size: sretPager.pageSize }
  const sretQueueQuery = useSalesReturnRequestsPendingPM(
    {
      ...sretPage,
      search: sretFilters.search || undefined,
      account_id: sretFilters.accountIds,
      user_id: sretFilters.userIds,
      date_from: sretFilters.dateFrom,
      date_to: sretFilters.dateTo,
      sort: toSortParam(sretFilters.sort, SRET_SORT),
    },
    // Loads up front for the tab badge + stat card (like PO); permission-gated.
    { enabled: canApproveSret },
  )
  const sretRows = sretQueueQuery.data?.items ?? []
  const sretTotal = sretQueueQuery.data?.total ?? 0
  const sretBadge = sretTotal
  const sretDecide = useDecideSalesReturnRequestItems()

  /**
   * Lines on a queued request this user may actually decide.
   *
   * The queue is already scoped server-side, but a request can mix lines
   * owned by different PMs — only the ones assigned to this user (or
   * unassigned) are theirs to act on.
   */
  const sretMyLines = (row: (typeof sretRows)[number]) =>
    (row.items ?? []).filter(
      (i) =>
        i.approval_status === 'pending' &&
        // Mirrors the backend's _validate_actor_may_decide: a superuser may
        // decide any line, a PM their own or an unassigned one.
        (isSuperuser || i.product_manager_id == null || i.product_manager_id === currentUserId),
    )

  const decideSret = (
    row: (typeof sretRows)[number],
    decision: 'approved' | 'rejected',
    reason?: string,
  ) => {
    const lines = sretMyLines(row)
    if (lines.length === 0) return
    // One batch call — the header status is a rollup, so N calls would roll
    // it up against a half-applied decision.
    sretDecide.mutate({
      sretId: row.id,
      body: {
        decisions: lines.map((i) => ({
          item_id: i.id,
          decision,
          ...(decision === 'rejected' ? { rejection_reason: reason } : {}),
        })),
      },
    })
  }

  // Replacements — same server-side scoping as sales returns.
  const rrPage = { page: rrPager.page, page_size: rrPager.pageSize }
  const rrQueueQuery = useReplacementRequestsPendingPM(
    {
      ...rrPage,
      search: rrFilters.search || undefined,
      user_id: rrFilters.userIds,
      date_from: rrFilters.dateFrom,
      date_to: rrFilters.dateTo,
      sort: toSortParam(rrFilters.sort, RR_SORT),
    },
    // Loads up front for the tab badge + stat card (like PO); permission-gated.
    { enabled: canApproveSret },
  )
  const rrRows = rrQueueQuery.data?.items ?? []
  const rrTotal = rrQueueQuery.data?.total ?? 0
  const rrBadge = rrTotal
  const rrApprove = useApproveReplacementItems()
  const rrReject = useRejectReplacementItem()

  const rrMyLines = (row: (typeof rrRows)[number]) =>
    (row.items ?? []).filter(
      (i) =>
        i.approval_status === 'pending' &&
        // Same rule as sales returns — superuser, own, or unassigned lines.
        (isSuperuser || i.product_manager_id == null || i.product_manager_id === currentUserId),
    )

  // Quotes — personal approver queue (`GET /crm/quotes/approvals/pending`).
  // Loads up front so the tab badge + stat card show the real count. Hook
  // doesn't yet accept filters/sort, so the queue table runs without a toolbar.
  const quoteQueueQuery = useMyPendingQuotes({
    enabled: canApproveQuote,
    page: quotePager.page,
    pageSize: quotePager.pageSize,
  })
  const quoteBadge = quoteQueueQuery.total

  // ── PO rows ──

  // Purchase Request queue is still mock — placeholder count until the
  // backend endpoint ships.
  const pendingPRItemsCount = 0

  // ── Demo Request rows ──
  const myDemos = demoQueueQuery.data?.items ?? []
  const pendingDemosCount = demoQueueQuery.data?.total ?? 0
  const demoBadge = pendingDemosCount

  // One stat card per tab the user can actually open — same permission gates
  // and same order as the tab strip below, so the summary row never shows
  // fewer (or more) cards than tabs. Sales Return + Replacement were the two
  // queues that had a tab but no card.
  const stats: StatCardData[] = [
    ...(canApproveMi ? [{ label: S.stats.miInquiries, value: miBadge, icon: Search, accent: 'info' as const }] : []),
    ...(canApproveSo ? [{ label: S.stats.salesOrders, value: soBadge, icon: ShoppingCart, accent: 'violet' as const }] : []),
    // PR stat card — commented out with the Purchase Request tab.
    // ...(canApproveProc ? [{ label: S.stats.prItems, value: pendingPRItemsCount, icon: FileText, accent: 'warning' as const }] : []),
    ...(canApproveProc ? [{ label: S.stats.purchaseOrders, value: realPoApprovalCount, icon: ClipboardList, accent: 'primary' as const }] : []),
    ...(canApproveSret ? [{ label: S.stats.salesReturns, value: sretBadge, icon: ArchiveRestore, accent: 'danger' as const }] : []),
    ...(canApproveSret ? [{ label: S.stats.replacements, value: rrBadge, icon: Replace, accent: 'success' as const }] : []),
    ...(canApproveDr ? [{ label: S.stats.demoRequests, value: demoBadge, icon: Monitor, accent: 'teal' as const }] : []),
    ...(canApproveQuote ? [{ label: QUOTE_APPROVALS_STRINGS.tab.label, value: quoteBadge, icon: Receipt, accent: 'warning' as const }] : []),
  ]

  // Sales-Return + Replacement queues. `pending_lines` / `actions` are
  // synthetic column keys the formatter fills — the latter carries the inline
  // approve/reject buttons (PmQueueTable stops their clicks reaching the row).
  const sretColumns: ColumnDef[] = [
    { key: 'request_number', label: SHARED.salesReturn.columns.request, width: '220px', sortable: true },
    { key: 'order_number', label: SHARED.salesReturn.columns.order, width: '200px', sortable: true },
    { key: 'account_name', label: SHARED.salesReturn.columns.customer, width: '220px', sortable: true },
    { key: 'created_by_name', label: SHARED.salesReturn.columns.createdBy },
    { key: 'pending_lines', label: SHARED.salesReturn.columns.pendingLines, align: 'right', sortable: true },
    { key: 'created_at', label: SHARED.salesReturn.columns.raised, sortable: true },
    // Decision column (Approve / Reject) — commented out; decide on the detail page.
    // { key: 'actions', label: SHARED.salesReturn.columns.actions, align: 'right' },
  ]
  const sretCellFormatter: CellFormatter = (_v, key, row) => {
    const r = row as unknown as (typeof sretRows)[number]
    if (key === 'request_number') {
      return { display: <RecordLink to={`/wms/sales-returns/${r.id}`}>{r.request_number}</RecordLink> }
    }
    if (key === 'order_number') {
      return {
        display: r.order_number ? (
          <RecordLink to={r.entity_type === 'sales_orders' ? `/crm/sales-orders/${r.entity_id}` : null}>
            {r.order_number}
          </RecordLink>
        ) : '—',
      }
    }
    if (key === 'account_name') {
      return {
        display: r.account_name ? (
          <AccountLink accountId={r.account_id}>{r.account_name}</AccountLink>
        ) : '—',
      }
    }
    if (key === 'created_by_name') return { display: r.created_by_name ?? '—' }
    if (key === 'created_at') return { display: formatDate(r.created_at) }
    if (key === 'pending_lines') {
      return {
        display: (r.items ?? []).filter((i) => i.approval_status === 'pending').length,
      }
    }
    // Decision (Approve / Reject) buttons — commented out with the Decision column.
    // if (key === 'actions') {
    //   const myLines = sretMyLines(r).length
    //   return {
    //     display: (
    //       <DecisionActions
    //         disabled={sretDecide.isPending || myLines === 0}
    //         approveLabel={SHARED.salesReturn.approve}
    //         approveTitle={SHARED.salesReturn.approveAllHint(myLines)}
    //         rejectLabel={SHARED.salesReturn.reject}
    //         onApprove={() => decideSret(r, 'approved')}
    //         onReject={() => {
    //           setSretRejectReason('')
    //           setSretRejecting(r.id)
    //         }}
    //       />
    //     ),
    //   }
    // }
    return null
  }

  const rrColumns: ColumnDef[] = [
    { key: 'request_number', label: SHARED.replacement.columns.request, width: '200px', sortable: true },
    { key: 'reason', label: SHARED.replacement.columns.reason },
    { key: 'created_by_name', label: SHARED.replacement.columns.createdBy },
    { key: 'pending_lines', label: SHARED.replacement.columns.pendingLines, align: 'right' },
    { key: 'created_at', label: SHARED.replacement.columns.raised, sortable: true },
    // Decision column (Approve / Reject) — commented out; decide on the detail page.
    // { key: 'actions', label: SHARED.replacement.columns.actions, align: 'right' },
  ]
  const rrCellFormatter: CellFormatter = (_v, key, row) => {
    const r = row as unknown as (typeof rrRows)[number]
    if (key === 'request_number') {
      // "Rental" marks a request the rental manager decides, not a category PM.
      return {
        display: (
          <span className="flex min-w-0 items-center gap-1.5">
            <RecordLink to={`/wms/replacements/${r.id}`}>{r.request_number}</RecordLink>
            <RentalOrderTag isRental={r.is_rental_order} />
          </span>
        ),
      }
    }
    if (key === 'created_at') return { display: formatDate(r.created_at) }
    if (key === 'created_by_name') return { display: r.created_by_name ?? '—' }
    if (key === 'pending_lines') {
      // "mine/total" units, e.g. 1/2 — legacy lines can carry quantity > 1,
      // so both sides count units, not lines. A string, so the cell tooltip
      // still works.
      const units = (lines: { quantity?: number | null }[]) =>
        lines.reduce((n, l) => n + (l.quantity ?? 1), 0)
      return {
        display: SHARED.replacement.columns.awaitingOfTotal(
          units(rrMyLines(r)),
          units(r.items ?? []),
        ),
      }
    }
    if (key === 'actions') {
      const myLines = rrMyLines(r).length
      return {
        display: (
          <DecisionActions
            disabled={rrApprove.isPending || rrReject.isPending || myLines === 0}
            approveLabel={SHARED.replacement.approve}
            approveTitle={SHARED.replacement.approveAllHint(myLines)}
            rejectLabel={SHARED.replacement.reject}
            onApprove={() => rrApprove.mutate({ rrId: r.id, itemIds: rrMyLines(r).map((i) => i.id) })}
            onReject={() => {
              setRrRejectReason('')
              setRrRejecting(r.id)
            }}
          />
        ),
      }
    }
    return null
  }

  // Tab strip — same order and permission gates as the stat cards above.
  // `loaded` = the tab's query has answered at least once, so the badge shows
  // its real count — including 0 when a search / filter matches nothing —
  // but never flashes a "0" during the very first load.
  const allTabItems: { id: ApprovalTab; label: string; count: number; loaded: boolean }[] = [
    { id: 'mi', label: S.tabs.materialInquiry, count: miBadge, loaded: miQueueQuery.data !== undefined },
    { id: 'so', label: S.tabs.salesOrder, count: soBadge, loaded: !soPendingQuery.isLoading },
    // Purchase Request tab — commented out (PRs are still mock data).
    // { id: 'pr', label: S.tabs.purchaseRequest, count: pendingPRItemsCount },
    { id: 'po', label: S.tabs.purchaseOrder, count: realPoApprovalCount, loaded: realPoApprovals.data !== undefined },
    { id: 'sret', label: SHARED.tabs.salesReturn, count: sretBadge, loaded: sretQueueQuery.data !== undefined },
    { id: 'rr', label: SHARED.tabs.replacement, count: rrBadge, loaded: rrQueueQuery.data !== undefined },
    { id: 'demo', label: S.tabs.demoRequest, count: demoBadge, loaded: demoQueueQuery.data !== undefined },
    { id: 'quote', label: QUOTE_APPROVALS_STRINGS.tab.label, count: quoteBadge, loaded: !quoteQueueQuery.isLoading },
  ]
  const tabItems = allTabItems.filter((t) => accessibleTabs.includes(t.id))

  return (
    <ListPageShell
      title={S.page.title}
      subtitle={S.page.subtitle}
      // mb-0!: the shell's gap already spaces stats → tabs; the grid's own
      // 20px margin doubled it and pushed the filters (and their popovers)
      // down so they flipped upward over the stats (L-6).
      stats={<StatsRow stats={stats} className="mb-0!" />}
      // No extra space-y here: ListPageShell already gaps stats ↔ tabs, and
      // doubling it pushed the table (and its filter popovers) far down.
      className="animate-fade-in-up"
    >
      <div className="space-y-3">
        {tabItems.length > 1 && (
          <div className="cpt-tabs">
            {tabItems.map((t) => (
              <button
                key={t.id}
                type="button"
                className={cn('cpt-tab', activeTab === t.id && 'active')}
                onClick={() => handleTabChange(t.id)}
              >
                {t.label}
                {t.loaded && (
                  <span className={cn('cpt-tab-count', activeTab === t.id && 'active')}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'mi' && canApproveMi && (
          <PmQueueTable
            id="mi"
            // Account filter removed from the MI tab per request (was `{ accounts: true }`).
            {...queueToolbar(miFilters, S.queueFilters.search.mi, { users: true, usersLabel: S.queueFilters.createdBy, dateLabel: S.queueFilters.createdDate })}
            label={S.tabs.materialInquiry}
            columns={MI_COLUMNS}
            rows={miQueue as unknown as Record<string, unknown>[]}
            cellFormatter={miCellFormatter}
            onRowClick={(row) => navigate(`/procurement/pm-approvals/mi/${row.id as string}`)}
            pager={toPager(miPager, miQueueTotal, miQueueQuery.isFetching)}
            emptyTitle={S.miQueue.empty}
            errorNode={
              miQueueQuery.isError ? (
                <LoadErrorState error={miQueueQuery.error} fallback={S.miQueue.loadError} />
              ) : undefined
            }
          />
        )}

        {/* Sales Order — the inline expand-to-approve-lines row
            (<SalesOrderApprovalRow/> via BusinessMetricsTable `renderRow`) is
            commented out; SOs are reviewed on their detail page.
            renderRow={(row, { index, colSpan }) => {
              const so = row as unknown as SalesOrderListItemWire
              return (
                <SalesOrderApprovalRow
                  so={so}
                  colSpan={colSpan}
                  index={index}
                  createdByName={so.created_by_detail?.name ?? '—'}
                  submittedByName={so.submitted_by_detail?.name ?? '—'}
                  detailHref={`/procurement/pm-approvals/so/${so.id}`}
                />
              )
            }} */}
        {activeTab === 'so' && canApproveSo && (
          <PmQueueTable
            id="so"
            sort={{ ...soFilters.sort, onChange: soFilters.setSort }}
            {...queueToolbar(soFilters, S.queueFilters.search.so, { accounts: true, users: true, usersLabel: S.queueFilters.createdOrSubmittedBy, dateLabel: S.queueFilters.submittedDate })}
            label={S.tabs.salesOrder}
            columns={SO_COLUMNS}
            rows={soPendingItems as unknown as Record<string, unknown>[]}
            cellFormatter={soCellFormatter}
            onRowClick={(row) => navigate(`/procurement/pm-approvals/so/${row.id as string}`)}
            pager={toPager(soPager, soPendingTotal, soPendingQuery.isFetching)}
            emptyTitle={S.soQueue.empty}
            errorNode={
              soPendingQuery.isError ? (
                <LoadErrorState error={soPendingQuery.error} fallback={S.soQueue.loadError} />
              ) : undefined
            }
          />
        )}

        {/* Real backend-wired PO approvals (per-line sign-off). */}
        {activeTab === 'po' && canApproveProc && <RealPoApprovalsTab />}

        {activeTab === 'sret' && canApproveSret && (
          <>
            <PmQueueTable
              id="sret"
              sort={{ ...sretFilters.sort, onChange: sretFilters.setSort }}
              {...queueToolbar(sretFilters, S.queueFilters.search.sret, { accounts: true, users: true, usersLabel: S.queueFilters.createdBy, dateLabel: S.queueFilters.createdDate })}
              label={SHARED.tabs.salesReturn}
              columns={sretColumns}
              rows={sretRows as unknown as Record<string, unknown>[]}
              cellFormatter={sretCellFormatter}
              // Opens the SO-styled approval page (PMApprovalDetailBody `sret`),
              // not the WMS sales-return detail page.
              onRowClick={(row) => navigate(`/procurement/pm-approvals/sret/${row.id as string}`)}
              pager={toPager(sretPager, sretTotal, sretQueueQuery.isFetching)}
              emptyTitle={SHARED.salesReturn.empty}
              errorNode={
                sretQueueQuery.isError ? (
                  <LoadErrorState error={sretQueueQuery.error} fallback={SHARED.salesReturn.loadFailed} />
                ) : undefined
              }
            />
            <AlertDialog
              open={sretRejecting !== null}
              onOpenChange={(open) => !open && setSretRejecting(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {SHARED.salesReturn.rejectDialogTitle}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {SHARED.salesReturn.rejectDialogBody}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-1.5">
                  <Typography variant="caption" tone="muted">
                    {SHARED.salesReturn.rejectReasonLabel}
                  </Typography>
                  <Input
                    value={sretRejectReason}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSretRejectReason(e.target.value)
                    }
                    placeholder={SHARED.salesReturn.rejectReasonPlaceholder}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>{SHARED.salesReturn.dismiss}</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={!sretRejectReason.trim()}
                    onClick={() => {
                      const row = sretRows.find((r) => r.id === sretRejecting)
                      if (row) decideSret(row, 'rejected', sretRejectReason)
                      setSretRejecting(null)
                    }}
                  >
                    {SHARED.salesReturn.rejectConfirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {activeTab === 'rr' && canApproveSret && (
          <>
            <PmQueueTable
              id="rr"
              sort={{ ...rrFilters.sort, onChange: rrFilters.setSort }}
              {...queueToolbar(rrFilters, S.queueFilters.search.rr, { users: true, usersLabel: S.queueFilters.createdBy, dateLabel: S.queueFilters.createdDate })}
              label={SHARED.tabs.replacement}
              columns={rrColumns}
              rows={rrRows as unknown as Record<string, unknown>[]}
              cellFormatter={rrCellFormatter}
              // Opens the SO-styled approval page (PMApprovalDetailBody `rr`),
              // not the WMS replacement detail page.
              onRowClick={(row) => navigate(`/procurement/pm-approvals/rr/${row.id as string}`)}
              pager={toPager(rrPager, rrTotal, rrQueueQuery.isFetching)}
              emptyTitle={SHARED.replacement.empty}
              errorNode={
                rrQueueQuery.isError ? (
                  <LoadErrorState error={rrQueueQuery.error} fallback={SHARED.replacement.loadFailed} />
                ) : undefined
              }
            />
            <AlertDialog
              open={rrRejecting !== null}
              onOpenChange={(open) => !open && setRrRejecting(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {SHARED.replacement.rejectDialogTitle}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {SHARED.replacement.rejectDialogBody}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-1.5">
                  <Typography variant="caption" tone="muted">
                    {SHARED.replacement.rejectReasonLabel}
                  </Typography>
                  <Input
                    value={rrRejectReason}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRrRejectReason(e.target.value)
                    }
                    placeholder={SHARED.replacement.rejectReasonPlaceholder}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>{SHARED.replacement.dismiss}</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={!rrRejectReason.trim()}
                    onClick={() => {
                      const row = rrRows.find((r) => r.id === rrRejecting)
                      // Replacement has a BATCH approve but only a
                      // single-item reject endpoint, so this fans out one
                      // call per line. Not atomic: a mid-way failure leaves
                      // earlier lines rejected. Batch reject is the fix if
                      // that ever bites.
                      if (row) {
                        for (const line of rrMyLines(row)) {
                          rrReject.mutate({
                            rrId: row.id,
                            itemId: line.id,
                            reason: rrRejectReason,
                          })
                        }
                      }
                      setRrRejecting(null)
                    }}
                  >
                    {SHARED.replacement.rejectConfirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {activeTab === 'demo' && canApproveDr && (
          <PmQueueTable
            id="demo"
            sort={{ ...demoFilters.sort, onChange: demoFilters.setSort }}
            {...queueToolbar(demoFilters, S.queueFilters.search.demo, { accounts: true, users: true, usersLabel: S.queueFilters.requestedBy, dateLabel: S.queueFilters.createdDate })}
            label={S.tabs.demoRequest}
            columns={DEMO_COLUMNS}
            rows={myDemos as unknown as Record<string, unknown>[]}
            cellFormatter={demoCellFormatter}
            onRowClick={(row) => navigate(`/procurement/pm-approvals/demo/${row.id as string}`)}
            pager={toPager(demoPager, pendingDemosCount, demoQueueQuery.isFetching)}
            emptyTitle={S.demoQueue.empty}
            errorNode={
              demoQueueQuery.isError ? (
                <LoadErrorState error={demoQueueQuery.error} fallback={S.demoQueue.loadError} />
              ) : undefined
            }
          />
        )}

        {activeTab === 'quote' && canApproveQuote && (
          <PmQueueTable
            id="quote"
            label={QUOTE_APPROVALS_STRINGS.tab.label}
            columns={QUOTE_COLUMNS}
            rows={quoteQueueQuery.items as unknown as Record<string, unknown>[]}
            cellFormatter={quoteCellFormatter}
            onRowClick={(row) => navigate(`/procurement/pm-approvals/quote/${(row as unknown as QuoteApprovalPendingQuoteWire).quote_id}`)}
            pager={toPager(quotePager, quoteQueueQuery.total, quoteQueueQuery.isFetching)}
            emptyTitle={QUOTE_APPROVALS_STRINGS.queue.empty}
            errorNode={
              quoteQueueQuery.isError ? (
                <LoadErrorState error={quoteQueueQuery.error} fallback={QUOTE_APPROVALS_STRINGS.queue.loadError} />
              ) : undefined
            }
          />
        )}
      </div>
    </ListPageShell>
  )
}

// ── Demo Request list ──
//
// The list payload carries the account name/code and line counts, so a row
// needs no per-row account / demo-request fetch (L-17).
const DEMO_COLUMNS: ColumnDef[] = [
  { key: 'demo_number', label: S.demoQueue.columns.demo, width: '200px', sortable: true },
  { key: 'account_name', label: S.demoQueue.columns.account, width: '220px', sortable: true },
  { key: 'items', label: S.demoQueue.columns.items, align: 'right' },
  { key: 'expected_return_date', label: S.demoQueue.columns.returnBy, sortable: true },
  { key: 'requested_by_name', label: S.demoQueue.columns.requestedBy },
  { key: 'created_at', label: S.demoQueue.columns.createdAt, sortable: true },
]

const demoCellFormatter: CellFormatter = (_v, key, row) => {
  const demo = row as unknown as DemoRequestListItemWire
  if (key === 'demo_number') {
    return { display: <RecordLink to={`/crm/demo-requests/${demo.id}`}>{demo.demo_number}</RecordLink> }
  }
  if (key === 'account_name') {
    const name = demo.account_name
      ? demo.account_code
        ? `${demo.account_name} (${demo.account_code})`
        : demo.account_name
      : S.demoQueue.accountFallback
    return { display: <AccountLink accountId={demo.account_name ? demo.account_id : null}>{name}</AccountLink> }
  }
  if (key === 'requested_by_name') return { display: demo.requested_by_name ?? '—' }
  if (key === 'created_at') return { display: formatDate(demo.created_at) }
  if (key === 'items') {
    return {
      display: S.demoQueue.itemsPending(demo.pending_items_count ?? 0, demo.items_count ?? 0),
    }
  }
  if (key === 'expected_return_date') {
    return {
      display: (
        <>
          {formatDate(demo.expected_return_date)}
          {demo.is_overdue ? (
            <Typography variant="caption" tone="danger" className="ml-1 font-medium" asChild>
              <span>{S.demoQueue.overdue}</span>
            </Typography>
          ) : null}
        </>
      ),
    }
  }
  return null
}

/** Approve / Reject pair for the inline-decided queues (sales return,
 *  replacement) — Accounts' approval-tab button styling. */
function DecisionActions({
  disabled,
  approveLabel,
  approveTitle,
  rejectLabel,
  onApprove,
  onReject,
}: {
  disabled: boolean
  approveLabel: string
  approveTitle: string
  rejectLabel: string
  onApprove: () => void
  onReject: () => void
}) {
  return (
    // Keep button clicks from bubbling to the row's navigate handler.
    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      <Button
        size="xs"
        variant="outline"
        className="border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive-soft"
        disabled={disabled}
        onClick={onReject}
      >
        {rejectLabel}
      </Button>
      <Button size="xs" disabled={disabled} title={approveTitle} onClick={onApprove}>
        {approveLabel}
      </Button>
    </div>
  )
}
