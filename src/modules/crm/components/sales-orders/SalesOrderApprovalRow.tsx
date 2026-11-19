import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { CheckCircle2, ChevronDown, ChevronRight, ThumbsDown, UserCog } from "lucide-react"

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
import { PermissionGuard } from "@shared/rbac/PermissionGuard"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { formatIST_date } from "@shared/lib/date"

import { crmPermissions } from "../../permissions"
import { useSalesOrderApprovalDetail } from "../../hooks/sales-orders/useSalesOrders"
import type {
  SalesOrderItemWire,
  SalesOrderListItemWire,
} from "../../api"
import {
  ApproveLineDialog,
  RejectLineDialog,
  ReassignLineDialog,
} from "./SalesOrderApprovalDialogs"
import { RentalLineTerm, RentalMoneyQualifier } from "./RentalLineTerm"
import { SALES_ORDERS_STRINGS as S } from "./sales-orders.strings"
import {
  SO_LINE_CONDITION_LABELS,
  SO_LINE_STATUS_LABELS,
  SO_STATUS_LABELS,
} from "../../constants/so-status"
import { LineDescriptionCell } from "../shared/LineDescriptionCell"
import { SALES_ORDERS_STRINGS as SO_STR } from "./sales-orders.strings"

interface SalesOrderApprovalRowProps {
  so: SalesOrderListItemWire
  /** Column count of the parent table — used for the expanded panel's
   *  colSpan. */
  colSpan: number
  /** Absolute 0-based row index (page offset included) — drives the Sr-No. */
  index: number
  /** Resolved display name of whoever raised the SO ("Created By"). */
  createdByName: string
  /** Resolved display name of whoever submitted it ("Submitted By"). "—" on a
   *  row that has not been submitted — though this queue only ever lists
   *  submitted / partially-approved SOs, so in practice it is always set. */
  submittedByName: string
  /** Where the row body click should navigate (the SO detail page). */
  detailHref: string
}

// One row in the SO approval queue. Row body click → navigate to detail
// page. Chevron click → toggle inline expand (with stopPropagation) which
// lazy-fires `GET /sales-orders/{id}` and renders pending lines (filtered
// to the caller's approver_id) with quick Approve / Reject buttons.
// Reassign lives ONLY on the detail page (uses the eligible-PM picker).
export function SalesOrderApprovalRow({
  so,
  colSpan,
  index,
  createdByName,
  submittedByName,
  detailHref,
}: SalesOrderApprovalRowProps) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  // Only fetch detail when the row is open. Cached by TanStack Query so
  // collapsing + re-expanding within the same session is free.
  const detail = useSalesOrderApprovalDetail(so.id, { enabled: expanded })

  function toggleExpand(e: React.MouseEvent) {
    e.stopPropagation()
    setExpanded((p) => !p)
  }

  return (
    <>
      <TableRow
        className="cursor-pointer transition-colors hover:bg-muted/30"
        onClick={() => navigate(detailHref)}
        aria-label={S.approval.openDetails(so.order_number)}
      >
        {/* Sr-No — same `index-col` cell the shared BusinessMetricsTable
            renders, since this row now sits inside one (PM Approvals). */}
        <TableCell className="index-col align-middle text-right text-sm font-medium tabular-nums">
          {index + 1}
        </TableCell>
        <TableCell className="align-middle">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleExpand}
              aria-expanded={expanded}
              aria-label={
                expanded ? S.approval.collapseLines : S.approval.expandLines
              }
              className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {expanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </button>
            <div>
              <p className="text-sm font-semibold text-primary">{so.order_number}</p>
              <Typography variant="caption" asChild>
                <p>{formatIST_date(so.submitted_at ?? so.created_at)}</p>
              </Typography>
            </div>
          </div>
        </TableCell>
        <TableCell className="align-middle">
          {so.account_name ? (
            <Link
              to={`/crm/accounts/${so.account_id}`}
              // Inside a row whose body navigates to the SO detail — keep the
              // account link from triggering that navigation.
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium text-primary hover:underline"
            >
              {so.account_name}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </TableCell>
        {/* Created By before Submitted By, matching the CRM sales-order list. */}
        <TableCell className="align-middle text-sm text-muted-foreground">
          {createdByName}
        </TableCell>
        <TableCell className="align-middle text-sm text-muted-foreground">
          {submittedByName}
        </TableCell>
        <TableCell className="align-middle">
          <span className="rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {SO_STATUS_LABELS[so.status] ?? so.status}
          </span>
        </TableCell>
        <TableCell className="align-middle text-right text-sm font-semibold tabular-nums">
          {formatCurrency(so.grand_total)}
        </TableCell>
      </TableRow>

      {expanded ? (
        <TableRow
          className="bg-muted/10 hover:bg-muted/10"
          // Stop the inline panel from triggering row-level navigation.
          onClick={(e) => e.stopPropagation()}
        >
          <TableCell colSpan={colSpan} className="p-0">
            <ExpandedPanel
              soId={so.id}
              soOrderNumber={so.order_number}
              isLoading={detail.isLoading}
              isError={detail.isError}
              error={detail.error}
              items={detail.data?.items ?? null}
            />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  )
}

// ── Expanded panel — pending-lines sub-table ───────────────────────────

interface ExpandedPanelProps {
  soId: string
  soOrderNumber: string
  isLoading: boolean
  isError: boolean
  error: unknown
  items: SalesOrderItemWire[] | null
}

function ExpandedPanel({
  soId,
  soOrderNumber,
  isLoading,
  isError,
  error,
  items,
}: ExpandedPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 px-4 py-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-3/4" />
      </div>
    )
  }

  if (isError) {
    return (
      <LoadErrorState
        error={error}
        fallback={S.approval.loadFailed(".")}
        compact
      />
    )
  }

  const allLines = items ?? []
  // SO-BOM (2026-05-29): children are decided via the headline's
  // server-side cascade — they are never independently actionable. Drop
  // them from the inline action list so the only Approve/Reject buttons
  // visible are the ones the backend will accept. (Open the SO detail
  // page to see children rendered indented under their parent.)
  const lines = allLines.filter(
    (line) => line.parent_sales_order_item_id === null,
  )
  if (lines.length === 0) {
    return (
      <Typography
        variant="body"
        tone="muted"
        align="center"
        className="px-4 py-6"
        asChild
      >
        <div>{S.approval.noLines}</div>
      </Typography>
    )
  }

  return (
    <div className="px-4 py-4">
      <Table>
        <TableHeader>
          <TableRow className="border-b bg-muted/20 hover:bg-muted/20">
            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {S.approval.cols.item}
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {S.approval.cols.qty}
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {S.approval.cols.rate}
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {S.approval.cols.amount}
            </TableHead>
            <TableHead className="w-56 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {S.approval.cols.statusActions}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) =>
            line.can_approve ? (
              <LineActionRow
                key={line.id}
                soId={soId}
                soOrderNumber={soOrderNumber}
                line={line}
                showReassign={false}
              />
            ) : (
              // Not actionable by this caller (decided, out of scope, or the
              // SO isn't in an approvable state) — read-only.
              <InlineDecidedRow key={line.id} line={line} />
            ),
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// Inline decided row — matches the detail-page row shape but lives in
// the list page expand panel.
function InlineDecidedRow({ line }: { line: SalesOrderItemWire }) {
  const isApproved = line.line_status === "Approved"
  const isRejected = line.line_status === "Rejected"
  return (
    <TableRow className="bg-muted/5">
      <TableCell className="min-w-0 align-middle">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground/90" title={line.item_name}>
            {line.item_name}
          </p>
          {line.description ? (
            // Same preview + "Show more" + modal pattern as warranty — a
            // truncate-in-td does not clip, so the row's own hover-tooltip
            // approach made this cell grow to the full line and widen the
            // whole table.
            <div className="mt-0.5 text-xs text-muted-foreground">
              <LineDescriptionCell
                html={line.description}
                title={SO_STR.detail.items.descriptionTitle}
                showMoreLabel={SO_STR.detail.items.showMore}
                maxWidthClass="max-w-full"
              />
            </div>
          ) : null}
          {line.warranty_level ? (
            <div className="mt-2 flex items-start gap-1 text-xs text-muted-foreground">
              <span className="shrink-0 font-semibold text-foreground/70">
                {SO_STR.detail.items.warrantyPrefix}
              </span>
              <div className="min-w-0 flex-1">
                <LineDescriptionCell
                  html={line.warranty_level}
                  title={SO_STR.detail.items.warrantyTitle}
                  showMoreLabel={SO_STR.detail.items.showMore}
                  maxWidthClass="max-w-full"
                />
              </div>
            </div>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="align-middle text-right text-sm tabular-nums">
        {line.qty}
      </TableCell>
      <TableCell className="align-middle text-right text-sm tabular-nums text-muted-foreground">
        {formatINR(line.rate)}
      </TableCell>
      <TableCell className="align-middle text-right text-sm font-semibold tabular-nums">
        {/* Tax-inclusive line total (amount + tax). */}
        {formatINR(line.amount + line.tax_amount)}
      </TableCell>
      <TableCell className="align-middle text-right">
        <span
          className={
            "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide " +
            (isApproved
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
              : isRejected
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-border bg-muted/40 text-muted-foreground")
          }
        >
          {SO_LINE_STATUS_LABELS[line.line_status] ?? line.line_status}
        </span>
      </TableCell>
    </TableRow>
  )
}

// ── Per-line row + action buttons + dialogs (shared by list + detail) ──

export interface LineActionRowProps {
  soId: string
  soOrderNumber: string
  line: SalesOrderItemWire
  /** Resolved category name for the line. Rendered in its own column when
   *  `showDescriptorCols` is set (detail page); the inline list view omits it. */
  categoryName?: string
  /** Resolved OEM name for `line.oem_id` — the wire only carries the UUID.
   *  Same gating as `categoryName`. */
  oemName?: string
  /** Render the detail-page descriptor cells (Category, Brand/OEM,
   *  Condition). On for the detail page, off for the inline list expand,
   *  whose table has none of those columns. */
  showDescriptorCols?: boolean
  /** When true, render the Reassign button + dialog. Off for inline list
   *  view (quick actions only); on for the detail page. */
  showReassign: boolean
}

export function LineActionRow({
  soId,
  soOrderNumber,
  line,
  categoryName,
  oemName,
  showDescriptorCols = false,
  showReassign,
}: LineActionRowProps) {
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reassignOpen, setReassignOpen] = useState(false)

  return (
    <>
      <TableRow>
        <TableCell className="min-w-0 align-middle">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground/90" title={line.item_name}>
              {line.item_name}
            </p>
            <RentalLineTerm line={line} />
            {line.description ? (
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                <LineDescriptionCell
                  html={line.description}
                  title={SO_STR.detail.items.descriptionTitle}
                  showMoreLabel={SO_STR.detail.items.showMore}
                  maxWidthClass="max-w-full"
                />
              </div>
            ) : null}
            {line.warranty_level ? (
              <div className="mt-1.5 flex items-start gap-1 text-[11px] text-muted-foreground">
                <span className="shrink-0 font-semibold text-foreground/70">
                  {SO_STR.detail.items.warrantyPrefix}
                </span>
                <div className="min-w-0 flex-1">
                  <LineDescriptionCell
                    html={line.warranty_level}
                    title={SO_STR.detail.items.warrantyTitle}
                    showMoreLabel={SO_STR.detail.items.showMore}
                    maxWidthClass="max-w-full"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </TableCell>
        {showDescriptorCols ? (
          <>
            <TableCell className="align-middle text-sm text-muted-foreground break-words">
              {categoryName ?? <span className="text-muted-foreground/60">—</span>}
            </TableCell>
            <TableCell className="align-middle text-sm text-muted-foreground break-words">
              {oemName ?? <span className="text-muted-foreground/60">—</span>}
            </TableCell>
            <TableCell className="align-middle text-sm text-muted-foreground break-words">
              {/* Per-line condition — label map, the wire value is lowercase
                  (`new_pull`). Absent on servers that predate the field. */}
              {line.condition ? (
                SO_LINE_CONDITION_LABELS[line.condition]
              ) : (
                <span className="text-muted-foreground/60">—</span>
              )}
            </TableCell>
          </>
        ) : null}
        <TableCell className="align-middle text-right text-sm tabular-nums">
          {line.qty}
        </TableCell>
        <TableCell className="align-middle text-right text-sm tabular-nums text-muted-foreground">
          {formatCurrency(line.rate)}
          <RentalMoneyQualifier line={line} kind="rate" />
        </TableCell>
        {showDescriptorCols ? (
          <TableCell className="align-middle text-right text-sm tabular-nums text-muted-foreground">
            {line.tax_rate}%
          </TableCell>
        ) : null}
        <TableCell className="align-middle text-right text-sm font-semibold tabular-nums">
          {/* Tax-inclusive line total (amount + tax). */}
          {formatCurrency(line.amount + line.tax_amount)}
          <RentalMoneyQualifier line={line} kind="amount" />
        </TableCell>
        <TableCell className="align-middle text-right">
          <div className="flex justify-end gap-1.5">
            <PermissionGuard required={crmPermissions.SO_APPROVE}>
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
                onClick={() => setApproveOpen(true)}
              >
                <CheckCircle2 className="size-3.5" data-icon="inline-start" />
                {S.approval.approve}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setRejectOpen(true)}
              >
                <ThumbsDown className="size-3.5" data-icon="inline-start" />
                {S.approval.reject}
              </Button>
            </PermissionGuard>
            {showReassign ? (
              <PermissionGuard required={crmPermissions.SO_REASSIGN}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                  onClick={() => setReassignOpen(true)}
                >
                  <UserCog className="size-3.5" data-icon="inline-start" />
                  {S.approval.reassign}
                </Button>
              </PermissionGuard>
            ) : null}
          </div>
        </TableCell>
      </TableRow>

      {/* Dialogs mount only while open so each fresh open resets state +
           triggers its own data fetch (lazy useEligiblePMs in Reassign). */}
      {approveOpen ? (
        <ApproveLineDialog
          open={approveOpen}
          onOpenChange={setApproveOpen}
          soId={soId}
          soOrderNumber={soOrderNumber}
          lineId={line.id}
          lineItemName={line.item_name}
        />
      ) : null}
      {rejectOpen ? (
        <RejectLineDialog
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          soId={soId}
          soOrderNumber={soOrderNumber}
          lineId={line.id}
          lineItemName={line.item_name}
        />
      ) : null}
      {showReassign && reassignOpen ? (
        <ReassignLineDialog
          open={reassignOpen}
          onOpenChange={setReassignOpen}
          soId={soId}
          soOrderNumber={soOrderNumber}
          lineId={line.id}
          lineItemName={line.item_name}
          categoryId={line.category_id}
          currentApproverId={line.approver_id}
        />
      ) : null}
    </>
  )
}

// Local INR formatter — kept inline rather than imported from the
// procurement page's pm-approvals-shared to avoid cross-module reach-in.
export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatCurrency(amount: number) {
  return formatINR(amount)
}
