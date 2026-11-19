import { useParams, Link, useNavigate } from "react-router-dom"
import { CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { PageHeader } from "@/components/page-shells"
import { RichTextView } from "@/components/ui/rich-text-editor"
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState"
import { formatINR } from "@/lib/currency"
import { cn } from "@/lib/utils"

import {
  usePurchaseOrder,
  useApprovePurchaseOrder,
  usePurchaseOrderVersions,
} from "../../hooks/purchase-orders/usePurchaseOrders"
import { approvalLabel, approvalVariant } from "../../constants"
import { LineApprovalCell } from "./LineApprovalCell"
import { PoPendingChanges } from "./PoPendingChanges"
import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"
import type { PurchaseOrderItemView } from "../../api"
import { taxPercent } from "./po-detail-helpers"

const CARD_S = PURCHASE_ORDERS_STRINGS.approvals.card

function money(v: string | null | undefined): string {
  return v === null || v === undefined ? "—" : formatINR(Number(v))
}

function itemLabel(it: PurchaseOrderItemView): string {
  if (it.part_number || it.part_name) {
    return `${it.part_number ? `${it.part_number} — ` : ""}${it.part_name ?? ""}`
  }
  return it.description ?? CARD_S.lineFallback
}

/**
 * Focused PM-approval card for a single PO, reached from the approvals queue.
 * Shows the lines the PM is responsible for (their pending + already-decided
 * lines), each with unit price / tax / line total, and per-line approve /
 * reject. A convenience "Approve all mine" approves every pending line of
 * theirs at once.
 */
export function PoApprovalCardBody({
  poId,
  backHref = "/procurement/po/approvals",
}: {
  /** Explicit PO id — the PM Approvals detail route passes it; the legacy
   *  `/procurement/po/approvals/:id` route falls back to the URL param. */
  poId?: string
  /** Where the header back-arrow goes (PM Approvals when opened from there). */
  backHref?: string
} = {}) {
  const params = useParams<{ id: string }>()
  const id = poId ?? params.id
  const navigate = useNavigate()
  const { data: po, isLoading, isError, error } = usePurchaseOrder(id)
  const { data: versions } = usePurchaseOrderVersions(id)
  const approve = useApprovePurchaseOrder()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }
  // A load failure (incl. a 403 permission boundary) routes through the shared
  // error slot; a genuine missing PO keeps the not-found view below.
  if (isError) {
    return (
      <LoadErrorState error={error} fallback={PURCHASE_ORDERS_STRINGS.detail.loadFailed} />
    )
  }
  if (!po) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <Typography variant="card-title">{CARD_S.notFoundTitle}</Typography>
        <Button variant="outline" render={<Link to="/procurement/po/approvals" />}>
          {CARD_S.backToApprovals}
        </Button>
      </div>
    )
  }

  // A Flow-B amendment of an already-issued PO carries its pending approval
  // lines in the version snapshot, NOT on the live PO items (those stay at
  // their already-approved/issued state while the amendment is in flight).
  // When such an amendment is pending, the live-item card below has nothing
  // actionable — route the PM through PoPendingChanges (current→proposed diff
  // + per-line approve/reject), the same surface the detail page uses.
  const hasPendingAmendment = versions?.some((v) => v.status === "pending") ?? false
  if (hasPendingAmendment) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={po.po_number}
          subtitle={po.supplier?.name ?? undefined}
          status={{
            label: approvalLabel(po.approval_status),
            variant: approvalVariant(po.approval_status),
          }}
          backHref={backHref}
        />
        <PoPendingChanges
          po={po}
          versions={versions}
          onEdit={() => navigate(`/procurement/po/${po.id}/amend`)}
        />
      </div>
    )
  }

  // Only the lines that are THIS PM's responsibility (their category/brand) —
  // `in_scope` is true for their own lines whether still pending or already
  // decided, and false for every other PM's line, so a line another PM
  // rejected never leaks in here. No fallback to `po.items`: out of scope
  // means nothing to show.
  const shown = po.items.filter((it) => it.in_scope)
  const myPendingIds = shown.filter((it) => it.can_act).map((it) => it.id)
  const myTotal = shown.reduce((s, it) => s + Number(it.line_total_with_tax), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={po.po_number}
        subtitle={po.supplier?.name ?? undefined}
        status={{ label: approvalLabel(po.approval_status), variant: approvalVariant(po.approval_status) }}
        backHref={backHref}
        actions={
          myPendingIds.length > 0 ? (
            // SO-approval button look: outlined, success-toned, with icon.
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-success/40 text-success hover:bg-success/10"
              disabled={approve.isPending}
              onClick={() => approve.mutate({ id: po.id, body: { line_ids: myPendingIds } })}
            >
              <CheckCircle2 className="size-3.5" data-icon="inline-start" />
              {CARD_S.approveAllMine(myPendingIds.length)}
            </Button>
          ) : undefined
        }
      />

      {/* Same frame as the SO approval panel (SalesOrderApprovalDetailPanel):
          gradient summary header, then a padded, muted-header line table. */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b bg-gradient-to-r from-muted/40 via-muted/20 to-transparent px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Typography variant="subsection-title" className="min-w-0">
              {CARD_S.cardTitle}
            </Typography>
            <div className="flex gap-8 text-right">
              <div>
                <Typography variant="micro" tone="muted" className="uppercase tracking-wider" asChild>
                  <p>{CARD_S.yourLinesTotal}</p>
                </Typography>
                <Typography variant="section-title" numeric asChild>
                  <p>{formatINR(myTotal)}</p>
                </Typography>
              </div>
              <div>
                <Typography variant="micro" tone="muted" className="uppercase tracking-wider" asChild>
                  <p>{CARD_S.poTotal}</p>
                </Typography>
                <Typography variant="section-title" numeric asChild>
                  <p>{money(po.grand_total)}</p>
                </Typography>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-2 pt-1">
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <Typography variant="caption" tone="muted" asChild>
                  <TableHead className="font-medium">{CARD_S.columns.item}</TableHead>
                </Typography>
                <Typography variant="caption" tone="muted" asChild>
                  <TableHead className="text-right font-medium">{CARD_S.columns.qty}</TableHead>
                </Typography>
                <Typography variant="caption" tone="muted" asChild>
                  <TableHead className="text-right font-medium">{CARD_S.columns.unitPrice}</TableHead>
                </Typography>
                <Typography variant="caption" tone="muted" asChild>
                  <TableHead className="text-right font-medium">{CARD_S.columns.tax}</TableHead>
                </Typography>
                <Typography variant="caption" tone="muted" asChild>
                  <TableHead className="text-right font-medium">{CARD_S.columns.lineTotal}</TableHead>
                </Typography>
                <Typography variant="caption" tone="muted" asChild>
                  <TableHead className="w-72 text-right font-medium">{CARD_S.columns.approval}</TableHead>
                </Typography>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((it) => (
                <TableRow key={it.id} className="bg-muted/5">
                  <TableCell className="align-middle">
                    {(it.part_number || it.part_name || !it.description) && (
                      <Typography variant="body-strong" tone="inherit" asChild>
                        <p className="text-foreground/90">{itemLabel(it)}</p>
                      </Typography>
                    )}
                    {it.description && (
                      // Render the pasted description with its styling intact
                      // (lists, tables, colours), matching the PO detail page —
                      // clamped to 3 lines with a Show more toggle.
                      <Typography variant="body-sm" tone="muted" asChild>
                        <div className={cn((it.part_number || it.part_name) && "mt-1")}>
                          <RichTextView html={it.description} lines={3} />
                        </div>
                      </Typography>
                    )}
                  </TableCell>
                  <Typography variant="body" asChild>
                    <TableCell className="align-middle text-right tabular-nums">
                      {it.ordered_quantity}
                    </TableCell>
                  </Typography>
                  <Typography variant="body" tone="muted" asChild>
                    <TableCell className="align-middle text-right tabular-nums">
                      {money(it.unit_price)}
                    </TableCell>
                  </Typography>
                  <Typography variant="body" tone="muted" asChild>
                    <TableCell className="align-middle text-right tabular-nums">
                      {taxPercent(it.tax_rate)}
                    </TableCell>
                  </Typography>
                  <Typography variant="body" asChild>
                    <TableCell className="align-middle text-right font-semibold tabular-nums">
                      {money(it.line_total)}
                    </TableCell>
                  </Typography>
                  <TableCell className="align-middle text-right">
                    <LineApprovalCell poId={po.id} item={it} appearance="so" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
