import { Package } from "lucide-react"

import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

import type { DemoLineFulfillmentWire } from "../../api"
import { DEMO_ITEM_PM_STATUS_VARIANT } from "../../constants/demo-request-status"
import { SO_LINE_CONDITION_LABELS } from "../../constants/so-status"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"
import { aggregateLines } from "./demoFulfillment"
import { PopupClampText } from "@/components/common/display/PopupClampText"
import { DemoLineFulfillment } from "./DemoLineFulfillment"
import { formatCurrency, type DemoDisplay } from "./demoRequestDetailHelpers"

/** One labelled column in an item row — same chrome as Qty / Unit Price /
 *  Amount, so the metadata columns and the money columns read as one header
 *  row rather than two competing treatments.
 *
 *  `min-w-0` + `truncate` per §8.7: a long OEM or a nested category path
 *  ("Networking > Switches > Access") ellipses instead of pushing the row wide. */
function ItemCell({
  label,
  value,
  align = "left",
  className,
  valueClassName,
}: {
  label: string
  value: string
  align?: "left" | "right"
  className?: string
  valueClassName?: string
}) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right", className)}>
      <Typography variant="caption" tone="muted" className="block truncate">
        {label}
      </Typography>
      <Typography
        variant="body-strong"
        className={cn("block truncate", valueClassName)}
        title={value}
      >
        {value}
      </Typography>
    </div>
  )
}

export function DemoDetailItemsCard({
  demo,
  totalItems,
  approvedTotal,
  fulfillmentByItemId,
}: {
  demo: DemoDisplay
  totalItems: number
  approvedTotal: number
  /**
   * Per-demo_request_item fulfillment, keyed by item id.
   *
   * Display rows are GROUPED (mapWireDemo merges lines agreeing on variant +
   * price + PM state), so each row sums across its `sourceItemIds` rather
   * than reading its own `id` — see `aggregateLines`.
   */
  fulfillmentByItemId: Map<string, DemoLineFulfillmentWire>
}) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="border-b px-6 py-4">
        {/* Left as a raw <h2> on purpose. §8.4's nearest variants are
            `section-title` (20px) and `card-title` (13px); this heading is 16px,
            so every migration target silently RESIZES it. Not worth a visual
            change the column work didn't ask for — the §8.4 warning here is
            pre-existing. */}
        <h2 className="font-semibold flex items-center gap-2">
          <Package className="size-4" />
          {S.detail.items.title(totalItems)}
        </h2>
      </div>
      <div className="divide-y">
        {demo.items.map((item) => {
          const lineAmount = (item.unitPrice ?? 0) * item.qty
          const fulfillment = aggregateLines(fulfillmentByItemId, item.sourceItemIds)
          return (
            /* OEM / Category / Condition are their OWN columns rather than a
               dot-joined subtitle: they are what routes the line to a PM, so
               they have to be scannable DOWN the list, not read per row.
               Only the SKU stays with the part name — it identifies the item
               rather than classifying it.

               Below xl the part block takes a full row of its own and the six
               data columns wrap beneath it (2-up, then 4-up). One row across
               only at xl, where there is genuinely width for it — §8.7: this
               card never scrolls sideways. */
            <div
              key={item.id}
              className="grid grid-cols-2 items-start gap-x-4 gap-y-3 px-6 py-4 sm:grid-cols-4 xl:grid-cols-[minmax(0,1fr)_7rem_9rem_6.5rem_4rem_7rem_4.5rem_7rem] xl:items-center"
            >
              <div className="col-span-2 min-w-0 sm:col-span-4 xl:col-span-1">
                <p className="font-medium">{item.partName}</p>
                <Typography variant="helper" tone="muted" className="block truncate" asChild>
                  <p>{item.partSku}</p>
                </Typography>
                {item.serialNumbers && item.serialNumbers.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.serialNumbers.map((sn) => (
                      <Typography key={sn} variant="caption" asChild>
                        <span className="rounded bg-muted px-2 py-0.5 font-mono">{sn}</span>
                      </Typography>
                    ))}
                  </div>
                )}
                {/* Per-line approver + PM approval status. */}
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <StatusBadge variant={DEMO_ITEM_PM_STATUS_VARIANT[item.pmStatus]}>
                    {item.pmStatus}
                  </StatusBadge>
                  <Typography variant="helper" tone="muted">
                    {S.detail.items.approverPrefix}{" "}
                    <Typography variant="helper" tone="default" className="font-medium" asChild>
                      <span>{item.approverName ?? S.detail.items.unassigned}</span>
                    </Typography>
                  </Typography>
                </div>
                {item.pmStatus === "Rejected" && item.pmRejectionReason && (
                  <PopupClampText
                    variant="helper"
                    tone="danger"
                    className="mt-1 italic"
                    text={S.detail.items.reasonPrefix(item.pmRejectionReason)}
                    dialogText={item.pmRejectionReason}
                    title={S.detail.items.reasonDialogTitle}
                    showMoreLabel={S.detail.items.reasonShowMore}
                  />
                )}
                {/* The approver's note — the only remark an APPROVED line has. A
                    rejection usually saves the same text as note and reason, so
                    it is shown once. */}
                {item.pmNotes && item.pmNotes !== item.pmRejectionReason && (
                  <PopupClampText
                    variant="helper"
                    tone="muted"
                    className="mt-1 italic"
                    text={S.detail.items.notePrefix(item.pmNotes)}
                    dialogText={item.pmNotes}
                    title={S.detail.items.noteDialogTitle}
                    showMoreLabel={S.detail.items.reasonShowMore}
                  />
                )}
                <DemoLineFulfillment totals={fulfillment.totals} units={fulfillment.units} />
              </div>
              <ItemCell label={S.detail.items.oem} value={item.brand} />
              <ItemCell label={S.detail.items.category} value={item.category} />
              {/* Null on rows saved before `demo_request_items.condition`
                  existed — those read "Not recorded", not an em-dash, which
                  would claim the line HAS no condition rather than that one was
                  never captured. */}
              <ItemCell
                label={S.detail.items.condition}
                value={
                  item.condition
                    ? SO_LINE_CONDITION_LABELS[item.condition]
                    : S.detail.items.notRecorded
                }
              />
              <ItemCell
                label={S.detail.items.qty}
                value={`×${item.qty}`}
                align="right"
                valueClassName="tabular-nums"
              />
              <ItemCell
                label={S.detail.items.unitPrice}
                value={formatCurrency(item.unitPrice ?? 0)}
                align="right"
                valueClassName="tabular-nums"
              />
              <ItemCell
                label={S.detail.items.tax}
                value={`${item.taxRate ?? 0}%`}
                align="right"
                valueClassName="tabular-nums"
              />
              <ItemCell
                label={S.detail.items.amount}
                value={formatCurrency(lineAmount)}
                align="right"
                valueClassName="font-semibold tabular-nums"
              />
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between border-t bg-muted/30 px-6 py-3">
        <Typography variant="caption" tone="muted" className="font-medium uppercase tracking-wider">
          {S.detail.items.approvedTotal}
        </Typography>
        <Typography variant="body-lg" className="font-semibold tabular-nums">
          {formatCurrency(approvedTotal)}
        </Typography>
      </div>
    </div>
  )
}
