import { Fragment } from "react"

import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { RichTextView } from "@/components/ui/rich-text-editor"
import { cn } from "@/lib/utils"

import { LineApprovalCell } from "./LineApprovalCell"
import { ItemCell } from "./ItemCell"
import { RefundedCell } from "./RefundedCell"
import { DASH, money, taxPercent } from "./po-detail-helpers"
import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"
import type { PurchaseOrder, PurchaseReturnItem } from "../../api"

const LT_S = PURCHASE_ORDERS_STRINGS.detail.lineTable

/** Line-items table in the clean, compact house style shared with Sales Orders:
 *  a fixed-layout table with percentage columns so it always fits its card and
 *  wraps instead of forcing a horizontal scroll (Coding-guideline §8.7). The
 *  Refunded column shows the live per-line refunded-unit count from returns. */
export function LineItemsTable({
  po,
  returnsByLine,
  amendmentRejections,
}: {
  po: PurchaseOrder
  returnsByLine: Map<string, PurchaseReturnItem[]>
  /** Live line id → {reason, what-was-proposed}, for lines whose most recent
   *  amendment was rejected. The line stays at its approved value, shows an
   *  "Amendment rejected" marker, and a detail row (reason + proposed change)
   *  renders directly beneath it. */
  amendmentRejections: Map<string, { reason: string; changes: string[] }>
}) {
  const items = po.items
  // Status column shows whenever a line carries an approval verdict; the wide
  // Action column (Approve/Reject buttons) shows ONLY when a line is actionable.
  // An approved/issued PO has verdicts but nothing to action — so we drop the
  // Action column, which keeps the table narrow enough that "Status" stays on
  // screen instead of scrolling off to the right.
  const showStatus = items.some((it) => it.pm_status)
  const showAction = items.some((it) => it.can_act)
  // Column-width profile: full (status + action buttons) | status-only | plain.
  const w = showAction
    ? {
        item: "w-[8%]", cat: "w-[7%]", desc: "w-[7%]", ord: "w-[6%]", rec: "w-[7%]", pen: "w-[6%]",
        ref: "w-[6%]", unit: "w-[8%]", tax: "w-[5%]", amt: "w-[8%]", status: "w-[8%]",
      }
    : showStatus
      ? {
          item: "w-[12%]", cat: "w-[10%]", desc: "w-[11%]", ord: "w-[6%]", rec: "w-[8%]", pen: "w-[7%]",
          ref: "w-[7%]", unit: "w-[9%]", tax: "w-[6%]", amt: "w-[10%]", status: "w-[8%]",
        }
      : {
          item: "w-[13%]", cat: "w-[11%]", desc: "w-[12%]", ord: "w-[7%]", rec: "w-[8%]", pen: "w-[7%]",
          ref: "w-[7%]", unit: "w-[10%]", tax: "w-[7%]", amt: "w-[12%]", status: "",
        }
  return (
    <div
      className={cn(
        "w-full overflow-x-auto",
        // Past 5 lines the table scrolls inside a fixed height (header stays put)
        // instead of running the card down the page.
        items.length > 5 && "max-h-[19rem] overflow-y-auto",
      )}
    >
      <Typography variant="body" asChild>
      <table
        className={cn(
          "w-full table-fixed",
          // Floor width so columns never compress below their content and overlap.
          // Only the action-buttons layout needs the very wide floor.
          showAction ? "min-w-[1600px]" : showStatus ? "min-w-[1100px]" : "min-w-[1100px]",
        )}
      >
        <colgroup>
          <col className="w-[6%]" />
          <col className={w.item} />
          <col className={w.cat} />
          <col className={w.desc} />
          <col className={w.ord} />
          <col className={w.rec} />
          <col className={w.pen} />
          <col className={w.ref} />
          <col className={w.unit} />
          <col className={w.tax} />
          <col className={w.amt} />
          {showStatus && <col className={w.status} />}
          {showAction && <col className="w-[19%]" />}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-card">
          <Typography variant="caption" tone="muted" asChild>
          <tr className="border-b border-border text-left font-semibold uppercase tracking-wider">
            <th className="px-3 py-3">{LT_S.columns.srNo}</th>
            <th className="px-3 py-3">{LT_S.columns.item}</th>
            <th className="px-3 py-3">{LT_S.columns.category}</th>
            <th className="px-3 py-3">{LT_S.columns.description}</th>
            <th className="px-2 py-3 text-right">{LT_S.columns.ordered}</th>
            <th className="px-2 py-3 text-right">{LT_S.columns.received}</th>
            <th className="px-2 py-3 text-right">{LT_S.columns.pending}</th>
            <th className="px-2 py-3 text-right">{LT_S.columns.returned}</th>
            <th className="px-2 py-3 text-right">{LT_S.columns.unitPrice}</th>
            <th className="px-2 py-3 text-right">{LT_S.columns.tax}</th>
            <th className="px-3 py-3 text-right">{LT_S.columns.amount}</th>
            {showStatus && <th className="px-3 py-3 text-right">{LT_S.columns.status}</th>}
            {showAction && <th className="px-3 py-3 text-right">{LT_S.columns.action}</th>}
          </tr>
          </Typography>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const rejection = amendmentRejections.get(item.id)
            const detailCols = 11 + (showStatus ? 1 : 0) + (showAction ? 1 : 0)
            return (
              <Fragment key={item.id}>
            <tr
              className="border-b border-border last:border-b-0 [&>td]:align-top"
            >
              <td className="px-3 py-3 tabular-nums text-muted-foreground">{idx + 1}</td>
              <td className="px-3 py-3">
                <ItemCell item={item} />
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {item.category_name ? (
                  <span className="break-words">{item.category_name}</span>
                ) : (
                  <span className="text-muted-foreground/60">{DASH}</span>
                )}
              </td>
              {/* Same size as the row's other cells so the first lines align. */}
              <Typography variant="body" tone="muted" asChild>
              <td className="px-3 py-3">
                {item.description ? (
                  // Render the description with its pasted styling intact (tables,
                  // colours, lists), clamped to 3 lines with a Show more toggle.
                  <RichTextView html={item.description} lines={3} />
                ) : (
                  <span className="text-muted-foreground/60">{DASH}</span>
                )}
              </td>
              </Typography>
              <td className="px-2 py-3 text-right tabular-nums">{item.ordered_quantity}</td>
              <td className="px-2 py-3 text-right tabular-nums">{item.received_quantity}</td>
              <td
                className={cn(
                  "px-2 py-3 text-right tabular-nums",
                  item.pending_quantity === 0 && "text-muted-foreground",
                )}
              >
                {item.pending_quantity}
              </td>
              <td className="px-2 py-3 text-right tabular-nums">
                <RefundedCell items={returnsByLine.get(item.id)} />
              </td>
              <td className="px-2 py-3 break-words text-right tabular-nums">
                {money(item.unit_price)}
              </td>
              <td className="px-2 py-3 text-right tabular-nums">{taxPercent(item.tax_rate)}</td>
              <td className="px-3 py-3 break-words text-right font-semibold tabular-nums">
                {/* Pre-tax line amount; tax is applied only in the grand total. */}
                {money(item.line_total)}
              </td>
              {showStatus && (
                <td className="px-3 py-3 text-right">
                  <LineApprovalCell poId={po.id} item={item} part="status" />
                </td>
              )}
              {showAction && (
                <td className="px-3 py-3 text-right">
                  <LineApprovalCell poId={po.id} item={item} part="action" />
                </td>
              )}
            </tr>
            {/* Inline rejection detail — the reason + what was proposed, right
                under the line whose "Amendment rejected" status is shown. */}
            {rejection && (
              <tr className="border-b border-border last:border-b-0">
                <td colSpan={detailCols} className="px-3 pt-0 pb-3">
                  <div className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <StatusBadge variant="warning">{LT_S.amendmentRejected}</StatusBadge>
                      {rejection.changes.length > 0 && (
                        <Typography variant="helper" tone="muted" asChild>
                          <span>{LT_S.proposed(rejection.changes.join(",  "))}</span>
                        </Typography>
                      )}
                    </div>
                    {rejection.reason && (
                      <Typography
                        variant="helper"
                        asChild
                        className="mt-1 block whitespace-pre-wrap break-words"
                      >
                        <p>{LT_S.reason(rejection.reason)}</p>
                      </Typography>
                    )}
                  </div>
                </td>
              </tr>
            )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      </Typography>
    </div>
  )
}
