import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { ExpandableClampText } from "@/components/common/display/ExpandableClampText"
import { RichTextView } from "@/components/ui/rich-text-editor"

import { cn } from "@/lib/utils"
import { EMPTY_VALUE } from "@/shared/constants"

import { type PoSnapshotLine } from "../../api"
import { taxPercent } from "./po-detail-helpers"
import { lineLabel, money, versionTotal } from "./po-version-trail-helpers"
import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"

const S = PURCHASE_ORDERS_STRINGS.detail

/** The line's amendment verdict at this revision, as a status badge. Null when
 *  the line carries no verdict. */
function lineStatusBadge(l: PoSnapshotLine) {
  if (l.pm_status === "rejected")
    return <StatusBadge variant="error">{S.lineApproval.status.rejected}</StatusBadge>
  if (l.pm_status === "approved")
    return <StatusBadge variant="success">{S.lineApproval.status.approved}</StatusBadge>
  if (l.pm_status === "pending")
    return <StatusBadge variant="warning">{S.lineApproval.status.pending}</StatusBadge>
  return null
}

export function VersionLineTable({ lines }: { lines: PoSnapshotLine[] }) {
  const subtotal = lines.reduce((s, l) => s + Number(l.line_total || 0), 0)
  const tax = lines.reduce((s, l) => s + Number(l.line_tax || 0), 0)
  // Past 5 lines the body scrolls while the header and Total footer stay pinned.
  const scroll = lines.length > 5
  return (
    <div>
      <div className={cn("overflow-auto", scroll && "max-h-[20rem]")}>
        <Typography variant="body" asChild>
        <table className="w-full table-fixed">
          {/* Item carries the longest text (part number + name) so it gets the
              widest text column; Description is clamped rich text and can cede
              width. Previously Item was a cramped 16% while Description took 33%
              (often empty) — the item name then broke mid-word. */}
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[12%]" />
            <col className="w-[20%]" />
            <col className="w-[7%]" />
            <col className="w-[13%]" />
            <col className="w-[8%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-card">
            <Typography variant="caption" tone="muted" asChild>
            <tr className="border-b border-border text-left font-semibold uppercase tracking-wider">
              <th className="px-3 py-2.5">{S.versionTrail.columns.item}</th>
              <th className="px-3 py-2.5">{S.versionTrail.columns.category}</th>
              <th className="px-3 py-2.5">{S.versionTrail.columns.description}</th>
              <th className="px-3 py-2.5 text-right">{S.versionTrail.columns.qty}</th>
              <th className="px-3 py-2.5 text-right">{S.versionTrail.columns.unitPrice}</th>
              <th className="px-3 py-2.5 text-right">{S.versionTrail.columns.tax}</th>
              <th className="px-3 py-2.5 text-right">{S.versionTrail.columns.lineTotal}</th>
            </tr>
            </Typography>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const lbl = lineLabel(l)
              return (
                <tr
                  key={l.part_variant_id ?? `${lbl.primary}-${i}`}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-3 py-2.5 align-top">
                    {/* Vertical stack: the amendment badge sits BELOW the label
                        instead of beside it, so it no longer steals width from
                        the (now wider) item column and force the name to break
                        mid-word. */}
                    <div className="min-w-0 space-y-1">
                      {/* Clamp the item label to 3 lines — wraps + Show more. A
                          description-only line has none (its text is in Description). */}
                      {lbl.primary ? (
                        <ExpandableClampText text={lbl.primary} lines={3} variant="body-strong" />
                      ) : (
                        <span className="text-muted-foreground/60">{EMPTY_VALUE}</span>
                      )}
                      {lbl.secondary && (
                        <Typography variant="helper" tone="muted" asChild>
                          <p className="break-words">{lbl.secondary}</p>
                        </Typography>
                      )}
                      {/* Per-line amendment verdict, on its own line under the label. */}
                      {lineStatusBadge(l) && <div>{lineStatusBadge(l)}</div>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top text-muted-foreground">
                    {l.category_name ? (
                      <span className="break-words">{l.category_name}</span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    {l.description ? (
                      // Pasted styling intact; row-cell size so the first lines align.
                      <Typography variant="body" tone="muted" asChild>
                        <RichTextView html={l.description} lines={3} />
                      </Typography>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top text-right tabular-nums">
                    {l.ordered_quantity}
                  </td>
                  <td className="px-3 py-2.5 align-top text-right tabular-nums">
                    {money(l.unit_price)}
                  </td>
                  <td className="px-3 py-2.5 align-top text-right tabular-nums">
                    {taxPercent(l.tax_rate)}
                  </td>
                  <td className="px-3 py-2.5 align-top text-right font-medium tabular-nums">
                    {money(l.line_total)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 bg-card">
            <tr className="border-t border-border">
              <td colSpan={6} className="px-3 pt-3 pb-1 text-right">
                <Typography variant="body" tone="muted">{S.sectionTitles.subtotal}</Typography>
              </td>
              <td className="px-3 pt-3 pb-1 text-right tabular-nums">{money(String(subtotal))}</td>
            </tr>
            <tr>
              <td colSpan={6} className="px-3 py-1 text-right">
                <Typography variant="body" tone="muted">{S.sectionTitles.tax}</Typography>
              </td>
              <td className="px-3 py-1 text-right tabular-nums">{money(String(tax))}</td>
            </tr>
            <tr>
              <td colSpan={6} className="px-3 pt-1 pb-3 text-right align-middle">
                <Typography variant="body-strong">{S.sectionTitles.total}</Typography>
              </td>
              <td className="px-3 pt-1 pb-3 text-right align-middle">
                {/* Larger than the per-line amounts so the revision total reads
                    as the headline figure. */}
                <Typography variant="section-title" numeric>
                  {money(String(versionTotal(lines)))}
                </Typography>
              </td>
            </tr>
          </tfoot>
        </table>
        </Typography>
      </div>
    </div>
  )
}
