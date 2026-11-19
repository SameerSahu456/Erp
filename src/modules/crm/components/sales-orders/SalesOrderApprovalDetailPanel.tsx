import { CheckCircle2, Clock, CornerDownRight, XCircle } from "lucide-react"
import { Fragment } from "react"
import { Link } from "react-router-dom"

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
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { formatIST } from "@shared/lib/date"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { useAllCategoriesShort, useOEMsByIds } from "@modules/ims"

import { useAccount } from "../../hooks/accounts/useAccounts"
import { useSalesOrderApprovalDetail } from "../../hooks/sales-orders/useSalesOrders"
import type { SalesOrderItemWire, SOLineStatus, SOStatus } from "../../api"
import { groupSoItemsToTree } from "../../lib/bomTree"
import { LineActionRow, formatINR } from "./SalesOrderApprovalRow"
import { RentalLineTerm, RentalMoneyQualifier } from "./RentalLineTerm"
import { rentalColumnLabels } from "./rentalColumnLabels"
import { SALES_ORDERS_STRINGS as S } from "./sales-orders.strings"
import {
  SO_LINE_CONDITION_LABELS,
  SO_LINE_STATUS_LABELS,
} from "../../constants/so-status"
import { CellTooltip } from "../shared/CellTooltip"
import { LineDescriptionCell } from "../shared/LineDescriptionCell"

interface SalesOrderApprovalDetailPanelProps {
  soId: string
}

// Full SO approval surface used by the PM Approvals detail page. Renders
// EVERY line on the SO so a PM sees the whole picture; the per-line
// Approve/Reject/Reassign controls are gated on the backend `can_approve`
// flag (viewer-scoped: SO state + Pending headline + caller is superuser /
// stamped approver / eligible PM). We no longer hide lines the caller doesn't
// own — visibility and actionability are decoupled.
export function SalesOrderApprovalDetailPanel({
  soId,
}: SalesOrderApprovalDetailPanelProps) {
  const detail = useSalesOrderApprovalDetail(soId, { enabled: true })

  // Resolve IMS category UUIDs on every line into human names — one shared
  // fetch (cached) beats per-line lookups. Mirrors useSalesOrderDetail.
  const categoriesQuery = useAllCategoriesShort()
  const categoryNameById = new Map(
    (categoriesQuery.data ?? []).map((c) => [c.id, c.name] as const),
  )

  // OEMs have no fetch-all hook (pickers are paginated per §16.11), so
  // resolve the distinct oem_ids on this SO one cached request each.
  // Mirrors useSalesOrderDetail.
  const oemIds = Array.from(
    new Set(
      (detail.data?.items ?? [])
        .map((i) => i.oem_id)
        .filter((id): id is string => !!id),
    ),
  )
  const oemQueries = useOEMsByIds(oemIds)
  const oemNameById = new Map(
    oemQueries
      .map((q) => q.data)
      .filter((o): o is NonNullable<typeof o> => !!o)
      .map((o) => [o.id, o.name] as const),
  )

  // Submitter name for the header — embedded on the detail response
  // (`submitted_by_detail`), so no separate `useUser(submitted_by_id)` fetch.
  // This panel reads the SAME `fetchSalesOrder` payload as the detail page.
  //
  // Supersedes the `useUser(submitted_by_id)` lookup `dev` still had here: the
  // server already joins `users` on this payload, so the extra request bought
  // nothing but a render where the header read "—".
  const submittedByName = detail.data?.submitted_by_detail?.name ?? null

  // Account name shown next to the SO number — the SO wire only carries
  // account_id, so resolve the name from it (shares the accounts cache).
  const accountQuery = useAccount(detail.data?.account_id)
  const accountName = accountQuery.data?.name ?? null

  if (detail.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  if (detail.isError || !detail.data) {
    return (
      <LoadErrorState
        error={detail.error}
        fallback={S.approval.panel.loadFailedSo(".")}
      />
    )
  }

  const so = detail.data
  // SO-BOM (2026-05-29): the SO response is FLAT — children sit alongside
  // headlines in `so.items`. Group them into a tree. Every headline is shown;
  // whether the caller can act on it is the backend's `can_approve` flag, not
  // an FE approver-id match. Children inherit the parent's decision via the
  // backend cascade, so they stay read-only.
  const headlines = groupSoItemsToTree(so.items)
  const isRental = so.sellable_type === "rental_sales"
  const colLabels = rentalColumnLabels(so.items)

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* ── Summary header ────────────────────────────────────────── */}
      <div className="border-b bg-gradient-to-r from-muted/40 via-muted/20 to-transparent px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {/* The order number + status live in the page header (shown once). */}
            {isRental ? (
              <StatusBadge variant="info" className="mb-1.5">
                {S.approval.rental.badge}
              </StatusBadge>
            ) : null}
            {accountName ? (
              <CellTooltip text={accountName} className="max-w-[360px]">
                <Typography variant="body-strong" truncate asChild>
                  <p className="min-w-0">
                    <Link
                      to={`/crm/accounts/${so.account_id}`}
                      className="text-primary hover:underline"
                    >
                      {accountName}
                    </Link>
                  </p>
                </Typography>
              </CellTooltip>
            ) : null}
            <Typography variant="helper" tone="muted" className="mt-1" asChild>
              <p>
                {S.approval.panel.submittedPrefix}
                {so.submitted_at ? formatIST(so.submitted_at) : "—"} by{" "}
                {submittedByName ?? "—"}
              </p>
            </Typography>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {S.approval.panel.grandTotal}
            </p>
            <Typography variant="section-title" numeric asChild>
              <p>{formatINR(so.grand_total)}</p>
            </Typography>
          </div>
        </div>

        <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {S.approval.panel.subtotal}
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {formatINR(so.subtotal)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {S.approval.panel.totalTax}
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {formatINR(so.total_tax)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {S.approval.panel.lineDiscount}
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {formatINR(so.total_line_discount)}
            </dd>
          </div>
          {so.place_of_supply ? (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {S.approval.panel.placeOfSupply}
              </dt>
              <dd className="mt-0.5 font-medium">{so.place_of_supply}</dd>
            </div>
          ) : null}
          {so.terms_conditions ? (
            <div className="sm:col-span-3">
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {S.approval.panel.terms}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground/90">
                {so.terms_conditions}
              </dd>
            </div>
          ) : null}
          {so.notes ? (
            <div className="sm:col-span-3">
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {S.approval.panel.notes}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground/90">
                {so.notes}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {/* ── Lines table ───────────────────────────────────────────── */}
      {/* px-4 + the cells' own px-2 lines content up with the header's px-6. */}
      <div className="px-4 pb-2 pt-1">
        <Table>
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground">
                {S.approval.cols.item}
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                {S.approval.cols.category}
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                {S.approval.cols.oem}
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                {S.approval.cols.condition}
              </TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground">
                {S.approval.cols.qty}
              </TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground">
                {colLabels.rate}
              </TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground">
                {S.approval.cols.tax}
              </TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground">
                {colLabels.amount}
              </TableHead>
              <TableHead className="w-72 text-right text-xs font-medium text-muted-foreground">
                {S.approval.cols.statusActions}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {headlines.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {S.approval.panel.noLinesOnSo}
                </TableCell>
              </TableRow>
            ) : (
              headlines.map((node) => (
                <Fragment key={node.id}>
                  {node.can_approve ? (
                    // Backend says this caller can act on this line right now.
                    <LineActionRow
                      soId={so.id}
                      soOrderNumber={so.order_number}
                      line={node}
                      categoryName={categoryNameById.get(node.category_id)}
                      oemName={
                        node.oem_id ? oemNameById.get(node.oem_id) : undefined
                      }
                      showDescriptorCols
                      showReassign
                    />
                  ) : (
                    // Not actionable by this caller (already decided, not their
                    // scope, or the SO isn't in an approvable state) — read-only.
                    <DecidedLineRow
                      line={node}
                      categoryName={categoryNameById.get(node.category_id)}
                      oemName={
                        node.oem_id ? oemNameById.get(node.oem_id) : undefined
                      }
                    />
                  )}
                  {node.children.map((child) => (
                    <BomChildRow
                      key={child.id}
                      child={child}
                      categoryName={categoryNameById.get(child.category_id)}
                      oemName={
                        child.oem_id ? oemNameById.get(child.oem_id) : undefined
                      }
                    />
                  ))}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ── Decided line — read-only row (Approved / Rejected) ────────────────

function DecidedLineRow({
  line,
  categoryName,
  oemName,
}: {
  line: SalesOrderItemWire
  categoryName?: string
  oemName?: string
}) {
  const isApproved = line.line_status === "Approved"
  const isRejected = line.line_status === "Rejected"
  return (
    <TableRow className="bg-muted/5">
      <TableCell className="min-w-0 align-middle">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground/90" title={line.item_name}>
            {line.item_name}
          </p>
          <RentalLineTerm line={line} />
          {line.description ? (
            // Same preview + "Show more" + modal pattern as warranty: a
            // CellTooltip-wrapped <p className="truncate"> doesn't ellipsise
            // inside an auto-layout <td> (no max-width is honoured), so the
            // cell grows to the full line and blows the table wide.
            <div className="mt-0.5 text-xs text-muted-foreground">
              <LineDescriptionCell
                html={line.description}
                title={S.detail.items.descriptionTitle}
                showMoreLabel={S.detail.items.showMore}
                maxWidthClass="max-w-full"
              />
            </div>
          ) : null}
          {line.warranty_level ? (
            <div className="mt-2 flex items-start gap-1 text-xs text-muted-foreground">
              <span className="shrink-0 font-semibold text-foreground/70">
                {S.detail.items.warrantyPrefix}
              </span>
              <div className="min-w-0 flex-1">
                <LineDescriptionCell
                  html={line.warranty_level}
                  title={S.detail.items.warrantyTitle}
                  showMoreLabel={S.detail.items.showMore}
                  maxWidthClass="max-w-full"
                />
              </div>
            </div>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="align-middle text-sm text-muted-foreground break-words">
        {categoryName ?? <span className="text-muted-foreground/60">—</span>}
      </TableCell>
      <TableCell className="align-middle text-sm text-muted-foreground break-words">
        {oemName ?? <span className="text-muted-foreground/60">—</span>}
      </TableCell>
      <TableCell className="align-middle text-sm text-muted-foreground break-words">
        {/* Label map — the wire value is lowercase (`new_pull`). */}
        {line.condition ? (
          SO_LINE_CONDITION_LABELS[line.condition]
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </TableCell>
      <TableCell className="align-middle text-right text-sm tabular-nums">
        {line.qty}
      </TableCell>
      <TableCell className="align-middle text-right text-sm tabular-nums text-muted-foreground">
        {formatINR(line.rate)}
        <RentalMoneyQualifier line={line} kind="rate" />
      </TableCell>
      <TableCell className="align-middle text-right text-sm tabular-nums text-muted-foreground">
        {line.tax_rate}%
      </TableCell>
      <TableCell className="align-middle text-right text-sm font-semibold tabular-nums">
        {/* Tax-inclusive line total (amount + tax). */}
        {formatINR(line.amount + line.tax_amount)}
        <RentalMoneyQualifier line={line} kind="amount" />
      </TableCell>
      <TableCell className="align-middle text-right">
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5">
            {isApproved ? (
              <CheckCircle2 className="size-3.5 text-emerald-600" />
            ) : isRejected ? (
              <XCircle className="size-3.5 text-destructive" />
            ) : (
              <Clock className="size-3.5 text-muted-foreground" />
            )}
            <span
              className={
                "text-xs font-semibold " +
                (isApproved
                  ? "text-emerald-700"
                  : isRejected
                    ? "text-destructive"
                    : "text-muted-foreground")
              }
            >
              {SO_LINE_STATUS_LABELS[line.line_status] ?? line.line_status}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {line.line_decided_at ? formatIST(line.line_decided_at) : ""}
          </p>
          {line.line_decision_notes ? (
            // Decision notes are free-text (can be a pasted URL / command).
            // Clamp to two lines with an ellipsis + break long unbroken tokens
            // so a huge note neither widens the table (§8.7) nor blows the row
            // height up; the full text is available on hover via `title`.
            <CellTooltip text={line.line_decision_notes} className="max-w-[15rem]">
              <Typography
                variant="caption"
                className="line-clamp-2 break-words text-right italic"
                asChild
              >
                <p>"{line.line_decision_notes}"</p>
              </Typography>
            </CellTooltip>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── BOM child row (read-only sub-line under a headline) ──────────────
//
// Children inherit the parent's approval decision via the server-side
// cascade (see app/modules/crm/services/sales_order_service.py
// `_cascade_decision_to_children`). They are NEVER independently
// actionable — PMs decide the headline; the cascade carries the same
// Approved/Rejected/decided_at/decided_by to every live child in one
// transaction. The FE accordingly renders children read-only with a
// small action tag ("Add" / "Remove") and the same status as the parent
// (which is what the wire already carries — children's `line_status`
// mirrors the parent's after cascade).

function BomChildRow({
  child,
  categoryName,
  oemName,
}: {
  child: SalesOrderItemWire
  categoryName?: string
  oemName?: string
}) {
  const isRemove = child.config_action === "Remove"
  const actionTone = isRemove
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
  return (
    <TableRow className="bg-muted/10">
      <TableCell className="min-w-0 align-middle">
        <div className="flex items-start gap-2 pl-6">
          <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={`h-5 px-1.5 text-[10px] ${actionTone}`}>
                {child.config_action}
              </Badge>
              <span
                className={
                  "truncate text-xs " +
                  (isRemove
                    ? "text-muted-foreground line-through"
                    : "text-foreground/90")
                }
              >
                {child.item_name}
              </span>
            </div>
            {child.description ? (
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                <LineDescriptionCell
                  html={child.description}
                  title={S.detail.items.descriptionTitle}
                  showMoreLabel={S.detail.items.showMore}
                  maxWidthClass="max-w-full"
                />
              </div>
            ) : null}
            {child.warranty_level ? (
              <div className="mt-1.5 flex items-start gap-1 text-[11px] text-muted-foreground">
                <span className="shrink-0 font-semibold text-foreground/70">
                  {S.detail.items.warrantyPrefix}
                </span>
                <div className="min-w-0 flex-1">
                  <LineDescriptionCell
                    html={child.warranty_level}
                    title={S.detail.items.warrantyTitle}
                    showMoreLabel={S.detail.items.showMore}
                    maxWidthClass="max-w-full"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell className="align-middle text-xs text-muted-foreground break-words">
        {categoryName ?? <span className="text-muted-foreground/60">—</span>}
      </TableCell>
      <TableCell className="align-middle text-xs text-muted-foreground break-words">
        {oemName ?? <span className="text-muted-foreground/60">—</span>}
      </TableCell>
      <TableCell className="align-middle text-xs text-muted-foreground break-words">
        {child.condition ? (
          SO_LINE_CONDITION_LABELS[child.condition]
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </TableCell>
      <TableCell className="align-middle text-right text-xs tabular-nums text-muted-foreground">
        {child.qty}
      </TableCell>
      <TableCell className="align-middle text-right text-xs tabular-nums text-muted-foreground">
        {formatINR(child.rate)}
      </TableCell>
      <TableCell className="align-middle text-right text-xs tabular-nums text-muted-foreground">
        {child.tax_rate}%
      </TableCell>
      <TableCell className="align-middle text-right text-xs tabular-nums text-muted-foreground">
        {/* Remove rows are server-flagged is_customer_visible=false and
            don't contribute to the SO total; show "—" so the column
            reads honestly. */}
        {isRemove ? "—" : formatINR(child.amount + child.tax_amount)}
      </TableCell>
      <TableCell className="align-middle text-right">
        <Typography variant="caption" className="italic" asChild>
          <span>{S.approval.panel.inheritsParent}</span>
        </Typography>
      </TableCell>
    </TableRow>
  )
}

// Re-export for callers that want to know about line statuses without
// importing the underlying wire types.
export type { SOLineStatus, SOStatus }
