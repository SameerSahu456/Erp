import { Fragment, useState } from "react"
import { Link } from "react-router-dom"
import {
  CheckCircle2,
  Clock,
  CornerDownRight,
  ThumbsDown,
  XCircle,
} from "lucide-react"

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
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { formatIST } from "@shared/lib/date"
import { usePermission } from "@shared/rbac"
import { useAllCategoriesShort } from "@modules/ims"

import type { QuoteItemWire } from "../../api/quotes"
import { getUserDisplayName, useUser } from "@modules/users"

import { CellTooltip } from "../shared/CellTooltip"
import { LineDescriptionCell } from "../shared/LineDescriptionCell"
import { useAccount } from "../../hooks/accounts/useAccounts"
import { useQuote } from "../../hooks/quotes/useQuotes"
import {
  useApproveQuoteItem,
  useMyPendingQuoteEligibility,
  useRejectQuoteItem,
} from "../../hooks/quote-approvals/useQuoteApprovals"
import { QUOTE_APPROVALS_STRINGS } from "./quote-approvals.strings"
import { QuoteItemRejectDialog } from "./QuoteItemRejectDialog"

interface Props {
  quoteId: string
}

const inrFmt = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})
function money(n: number): string {
  return `₹${inrFmt.format(n)}`
}

// Full quote approval surface — mirrors ``SalesOrderApprovalDetailPanel``.
// Renders EVERY headline line so the approver sees the whole quote; the
// per-line Approve / Reject controls appear only on lines the viewer may act
// on, as told by the backend inbox (``eligible_items`` for this quote — the
// same rule the PM Approvals queue uses). Everything else is read-only with
// its status. BOM children ride along under their headline. Superusers can
// act on every pending line. The backend remains the final gate on click.
export function QuoteApprovalDetailPanel({ quoteId }: Props) {
  const S = QUOTE_APPROVALS_STRINGS
  const detail = useQuote(quoteId)
  const eligibility = useMyPendingQuoteEligibility(quoteId)
  const { isSuperuser } = usePermission()

  const categoriesQuery = useAllCategoriesShort()
  const categoryNameById = new Map(
    (categoriesQuery.data ?? []).map((c) => [c.id, c.name] as const),
  )

  // Resolve account name when the quotable party is an Account; Lead/Deal
  // quotables are left for the "Open quote" link.
  const quotableType = detail.data?.quotable_type
  const quotableId = detail.data?.quotable_id
  const accountQuery = useAccount(
    quotableType === "account" ? quotableId : undefined,
  )
  // Prefer the inbox entry: it resolves the account for deal-quotes too and
  // carries the account id for the link. Fall back to the direct lookup for
  // account-quotes (and for superusers who may not have an inbox entry).
  const inboxEntry = eligibility.entry
  const accountName = inboxEntry?.account_name ?? accountQuery.data?.name ?? null
  const accountHref = inboxEntry?.account_id
    ? `/crm/accounts/${inboxEntry.account_id}`
    : quotableType === "account" && quotableId
      ? `/crm/accounts/${quotableId}`
      : quotableType === "lead" && quotableId
        ? `/crm/leads/${quotableId}`
        : null
  const sourceHref =
    quotableType && quotableId ? `/crm/${quotableType}s/${quotableId}` : null
  const creatorQuery = useUser(detail.data?.created_by ?? "")
  const creatorName = creatorQuery.data ? getUserDisplayName(creatorQuery.data) : null

  if (detail.isLoading || eligibility.isLoading) {
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
    return <LoadErrorState error={detail.error} fallback={S.panel.loadFailed} />
  }
  if (eligibility.isError) {
    return <LoadErrorState error={eligibility.error} fallback={S.panel.loadFailed} />
  }

  const quote = detail.data
  const eligibleIds = eligibility.eligibleItemIds
  // Every headline is shown (matches SO approval); only the ones the viewer
  // may act on get Approve / Reject — the rest render read-only.
  const headlines = quote.items

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* ── Summary header ────────────────────────────────────────── */}
      <div className="border-b bg-gradient-to-r from-muted/40 via-muted/20 to-transparent px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <Typography variant="subsection-title" asChild>
                <h2 className="min-w-0">
                  <Link
                    to={`/crm/quotes/${quote.id}`}
                    className="text-primary hover:underline"
                  >
                    {quote.quote_number}
                  </Link>
                </h2>
              </Typography>
              {accountName ? (
                <Typography variant="body-strong" truncate asChild>
                  <p className="min-w-0 max-w-[360px]" title={accountName}>
                    ·{" "}
                    {accountHref ? (
                      <Link to={accountHref} className="text-primary hover:underline">
                        {accountName}
                      </Link>
                    ) : (
                      accountName
                    )}
                  </p>
                </Typography>
              ) : null}
            </div>
            <Typography variant="helper" tone="muted" className="mt-1" asChild>
              <p>
                {S.panel.updatedPrefix}
                {formatIST(quote.updated_at)}
              </p>
            </Typography>
            {(creatorName || quote.entity_number) && (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {creatorName && (
                  <Typography variant="helper" tone="muted">
                    {S.submittedByLabel}:{" "}
                    <span className="font-medium text-foreground">{creatorName}</span>
                  </Typography>
                )}
                {quote.entity_number && (
                  <Typography variant="helper" tone="muted">
                    {S.sourceLabel}:{" "}
                    {sourceHref ? (
                      <Link to={sourceHref} className="font-medium text-primary hover:underline">
                        {quote.entity_number}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{quote.entity_number}</span>
                    )}
                  </Typography>
                )}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {S.panel.grandTotal}
            </p>
            <Typography variant="section-title" numeric asChild>
              <p>{money(quote.grand_total)}</p>
            </Typography>
          </div>
        </div>

        <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {S.panel.subtotal}
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {money(quote.subtotal)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {S.panel.totalTax}
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {money(quote.total_tax)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {S.panel.lineDiscount}
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {money(quote.total_line_discount)}
            </dd>
          </div>
          {quote.terms_conditions ? (
            <div className="sm:col-span-3">
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {S.panel.terms}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground/90">
                {quote.terms_conditions}
              </dd>
            </div>
          ) : null}
          {quote.notes ? (
            <div className="sm:col-span-3">
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {S.panel.notes}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground/90">
                {quote.notes}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {/* ── Lines table ───────────────────────────────────────────── */}
      <div className="px-4 pb-2 pt-1">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground">
                {S.lineCols.item}
              </TableHead>
              <TableHead className="w-36 text-xs font-medium text-muted-foreground">
                {S.lineCols.category}
              </TableHead>
              <TableHead className="w-16 text-right text-xs font-medium text-muted-foreground">
                {S.lineCols.qty}
              </TableHead>
              <TableHead className="w-32 text-right text-xs font-medium text-muted-foreground">
                {S.lineCols.rate}
              </TableHead>
              <TableHead className="w-20 text-right text-xs font-medium text-muted-foreground">
                {S.lineCols.tax}
              </TableHead>
              <TableHead className="w-36 text-right text-xs font-medium text-muted-foreground">
                {S.lineCols.amount}
              </TableHead>
              <TableHead className="w-72 text-right text-xs font-medium text-muted-foreground">
                {S.lineCols.statusActions}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {headlines.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {S.panel.noLines}
                </TableCell>
              </TableRow>
            ) : (
              headlines.map((node) => {
                const canAct =
                  node.status === "Pending Approval" &&
                  (isSuperuser || eligibleIds.has(node.id))
                return (
                  <Fragment key={node.id}>
                    {canAct ? (
                      <QuoteLineActionRow
                        quoteId={quote.id}
                        quoteNumber={quote.quote_number}
                        line={node}
                        categoryName={(node.category_id ? categoryNameById.get(node.category_id) : undefined)}
                      />
                    ) : (
                      <QuoteDecidedLineRow
                        line={node}
                        categoryName={(node.category_id ? categoryNameById.get(node.category_id) : undefined)}
                      />
                    )}
                    {node.children.map((child) => (
                      <QuoteBomChildRow
                        key={child.id}
                        child={child}
                        categoryName={child.category_id ? categoryNameById.get(child.category_id) : undefined}
                      />
                    ))}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ── Actionable headline — Approve / Reject on a Pending Approval line ──

function QuoteLineActionRow({
  quoteId,
  quoteNumber,
  line,
  categoryName,
}: {
  quoteId: string
  quoteNumber: string
  line: QuoteItemWire
  categoryName?: string
}) {
  const S = QUOTE_APPROVALS_STRINGS
  const approveMut = useApproveQuoteItem(quoteId)
  const rejectMut = useRejectQuoteItem(quoteId)
  const [rejectOpen, setRejectOpen] = useState(false)
  const busy = approveMut.isPending || rejectMut.isPending

  return (
    <>
      <TableRow>
        <TableCell className="min-w-0 align-middle">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground/90" title={line.item_name}>
              {line.item_name}
            </p>
            <LineDescriptionCell html={line.description} title={S.panel.descriptionTitle} showMoreLabel={S.panel.showMore} maxWidthClass="max-w-full" />
            {line.warranty_level ? (
              <div className="mt-2 flex items-start gap-1 text-xs text-muted-foreground">
                <span className="shrink-0 font-semibold text-foreground/70">
                  {S.panel.warrantyPrefix}
                </span>
                <div className="min-w-0 flex-1">
                  <LineDescriptionCell
                    html={line.warranty_level}
                    title={S.panel.warrantyTitle}
                    showMoreLabel={S.panel.showMore}
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
        <TableCell className="align-middle text-right text-sm tabular-nums">
          {line.qty}
        </TableCell>
        <TableCell className="align-middle text-right text-sm tabular-nums text-muted-foreground">
          {money(line.rate)}
        </TableCell>
        <TableCell className="align-middle text-right text-sm tabular-nums text-muted-foreground">
          {line.tax_rate}%
        </TableCell>
        <TableCell className="align-middle text-right text-sm font-semibold tabular-nums">
          {money(line.amount + line.tax_amount)}
        </TableCell>
        <TableCell className="align-middle text-right">
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
              disabled={busy}
              onClick={() => approveMut.mutate({ itemId: line.id })}
            >
              <CheckCircle2 className="size-3.5" data-icon="inline-start" />
              {approveMut.isPending ? S.actions.approving : S.actions.approve}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={busy}
              onClick={() => setRejectOpen(true)}
            >
              <ThumbsDown className="size-3.5" data-icon="inline-start" />
              {S.actions.reject}
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {rejectOpen ? (
        <QuoteItemRejectDialog
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          isPending={rejectMut.isPending}
          lineItemName={line.item_name}
          quoteNumber={quoteNumber}
          onConfirm={(notes) =>
            rejectMut.mutate(
              { itemId: line.id, body: { notes } },
              { onSuccess: () => setRejectOpen(false) },
            )
          }
        />
      ) : null}
    </>
  )
}

// ── Decided / non-actionable headline — read-only ──

function QuoteDecidedLineRow({
  line,
  categoryName,
}: {
  line: QuoteItemWire
  categoryName?: string
}) {
  const S = QUOTE_APPROVALS_STRINGS
  const isApproved = line.status === "Approved"
  const isRejected = line.status === "Rejected"
  const isPending = line.status === "Pending Approval"
  const label = isApproved
    ? S.lineStatus.approved
    : isRejected
      ? S.lineStatus.rejected
      : isPending
        ? S.lineStatus.pending
        : S.lineStatus.draft
  const toneClass = isApproved
    ? "text-emerald-700"
    : isRejected
      ? "text-destructive"
      : "text-muted-foreground"

  const note = isApproved || isRejected ? line.approval_notes : null

  return (
    <TableRow className="bg-muted/5">
      <TableCell className="min-w-0 align-middle">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground/90" title={line.item_name}>
            {line.item_name}
          </p>
          <LineDescriptionCell html={line.description} title={S.panel.descriptionTitle} showMoreLabel={S.panel.showMore} maxWidthClass="max-w-full" />
          {line.warranty_level ? (
            <div className="mt-2 flex items-start gap-1 text-xs text-muted-foreground">
              <span className="shrink-0 font-semibold text-foreground/70">
                {S.panel.warrantyPrefix}
              </span>
              <div className="min-w-0 flex-1">
                <LineDescriptionCell
                  html={line.warranty_level}
                  title={S.panel.warrantyTitle}
                  showMoreLabel={S.panel.showMore}
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
      <TableCell className="align-middle text-right text-sm tabular-nums">
        {line.qty}
      </TableCell>
      <TableCell className="align-middle text-right text-sm tabular-nums text-muted-foreground">
        {money(line.rate)}
      </TableCell>
      <TableCell className="align-middle text-right text-sm tabular-nums text-muted-foreground">
        {line.tax_rate}%
      </TableCell>
      <TableCell className="align-middle text-right text-sm font-semibold tabular-nums">
        {money(line.amount + line.tax_amount)}
      </TableCell>
      <TableCell className="align-middle text-right">
        <div className="flex min-w-0 flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5">
            {isApproved ? (
              <CheckCircle2 className="size-3.5 text-emerald-600" />
            ) : isRejected ? (
              <XCircle className="size-3.5 text-destructive" />
            ) : (
              <Clock className="size-3.5 text-muted-foreground" />
            )}
            <span className={"text-xs font-semibold " + toneClass}>{label}</span>
          </div>
          <p className="whitespace-nowrap text-[10px] text-muted-foreground">
            {line.approved_at ? formatIST(line.approved_at) : ""}
          </p>
          {note ? (
            // Same treatment as the Sales Order approval line: the note sits under
            // the status, clamped to two lines (free text can be a pasted URL), with
            // the full text in the hover tooltip.
            <CellTooltip text={note} className="max-w-[15rem]">
              <Typography
                variant="caption"
                className="line-clamp-2 break-words text-right italic"
                asChild
              >
                <p>"{note}"</p>
              </Typography>
            </CellTooltip>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── BOM child row — read-only, inherits parent decision ──

function QuoteBomChildRow({
  child,
  categoryName,
}: {
  child: QuoteItemWire
  categoryName?: string
}) {
  const S = QUOTE_APPROVALS_STRINGS
  const isRemove = child.config_action === "Remove"
  const actionTone = isRemove
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"

  return (
    <TableRow className="bg-muted/10">
      <TableCell className="min-w-0 align-middle">
        <div className="flex min-w-0 items-start gap-2 pl-6">
          <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <Badge
                variant="outline"
                className={`h-5 px-1.5 text-[10px] ${actionTone}`}
              >
                {child.config_action}
              </Badge>
              <span
                title={child.item_name}
                className={
                  "min-w-0 flex-1 truncate text-xs " +
                  (isRemove
                    ? "text-muted-foreground line-through"
                    : "text-foreground/90")
                }
              >
                {child.item_name}
              </span>
            </div>
            <LineDescriptionCell html={child.description} title={S.panel.descriptionTitle} showMoreLabel={S.panel.showMore} maxWidthClass="max-w-full" />
            {child.warranty_level ? (
              <div className="mt-1.5 flex items-start gap-1 text-[11px] text-muted-foreground">
                <span className="shrink-0 font-semibold text-foreground/70">
                  {S.panel.warrantyPrefix}
                </span>
                <div className="min-w-0 flex-1">
                  <LineDescriptionCell
                    html={child.warranty_level}
                    title={S.panel.warrantyTitle}
                    showMoreLabel={S.panel.showMore}
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
      <TableCell className="align-middle text-right text-xs tabular-nums text-muted-foreground">
        {child.qty}
      </TableCell>
      <TableCell className="align-middle text-right text-xs tabular-nums text-muted-foreground">
        {money(child.rate)}
      </TableCell>
      <TableCell className="align-middle text-right text-xs tabular-nums text-muted-foreground">
        {isRemove ? "—" : `${child.tax_rate}%`}
      </TableCell>
      <TableCell className="align-middle text-right text-xs tabular-nums text-muted-foreground">
        {isRemove ? "—" : money(child.amount + child.tax_amount)}
      </TableCell>
      <TableCell className="align-middle text-right">
        <Typography variant="caption" className="italic" asChild>
          <span>{S.panel.inheritsParent}</span>
        </Typography>
      </TableCell>
    </TableRow>
  )
}
