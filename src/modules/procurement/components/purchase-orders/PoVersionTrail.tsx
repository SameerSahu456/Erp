import { useState } from "react"
import { ChevronDown, FileDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"

import { cn } from "@/lib/utils"
import { formatIST_date } from "@shared/lib/date"

import {
  snapshotLines,
  snapshotHeader,
  isRejectedSnapshot,
  snapshotRejectionReasons,
  type PoVersionSnapshot,
  type PurchaseOrder,
} from "../../api"
import { useDownloadPurchaseOrderVersionPdf } from "../../hooks/purchase-orders/usePurchaseOrders"
import { REJ_S, VS, money, nodeClass, versionTotal } from "./po-version-trail-helpers"
import { VersionLineTable } from "./VersionLineTable"
import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"

const VT_S = PURCHASE_ORDERS_STRINGS.detail.versionTrail

function snapStatusBadge(v: PoVersionSnapshot) {
  if (v.status === "draft") return <StatusBadge variant="neutral">{VS.draft}</StatusBadge>
  if (v.status === "pending") return <StatusBadge variant="warning">{VS.pending}</StatusBadge>
  // A historical snapshot is either an applied amendment or a rejected one —
  // the latter carries rejected lines. Don't badge a rejection as "Approved".
  if (isRejectedSnapshot(v)) return <StatusBadge variant="error">{VS.rejected}</StatusBadge>
  // v1 is the original issued order, not an amendment — label it "Baseline"
  // rather than "Approved" (it was never an amendment approval).
  if (v.version_number === 1) return <StatusBadge variant="neutral">{VS.baseline}</StatusBadge>
  return <StatusBadge variant="success">{VS.approved}</StatusBadge>
}

function VersionDownloadButton({ po, version }: { po: PurchaseOrder; version: number }) {
  const download = useDownloadPurchaseOrderVersionPdf()
  return (
    <Button
      size="xs"
      variant="outline"
      className="shrink-0"
      disabled={download.isPending}
      aria-label={VT_S.downloadVersion(version)}
      onClick={() => download.mutate({ po, version })}
    >
      <FileDown data-icon="inline-start" />
      {VT_S.download}
    </Button>
  )
}

interface PoVersionTrailProps {
  po: PurchaseOrder
  versions: PoVersionSnapshot[]
}

/**
 * Version history as a timeline. A status-coloured node per revision, linked by
 * a rail so the sequence reads at a glance; the header carries the revision's
 * total so the order's worth is scannable across versions. Each row
 * expands to its full line table. Newest-first (as the API returns them).
 */
export function PoVersionTrail({ po, versions }: PoVersionTrailProps) {
  // Open the newest revision by default so the most relevant version is
  // visible without a click.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    versions.length ? { [versions[0].id]: true } : {},
  )

  return (
    <ol className="relative">
      {versions.map((v, idx) => {
        const isOpen = open[v.id] ?? false
        const isCurrent = idx === 0
        const isLast = idx === versions.length - 1
        const lines = snapshotLines(v)
        const hdr = snapshotHeader(v)
        return (
          <li key={v.id} className="relative flex gap-3.5">
            {/* Timeline rail: a hairline linking the nodes, with a
                status-coloured dot per revision (larger for the current one). */}
            <div className="relative flex w-4 shrink-0 justify-center">
              {!isLast && (
                <span aria-hidden className="absolute bottom-0 top-5 w-px bg-border" />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 mt-4 shrink-0 rounded-full ring-4 ring-card",
                  nodeClass(v),
                  isCurrent ? "size-3" : "size-2.5",
                )}
              />
            </div>

            {/* Content — a header that scans (version, status, total), a muted
                sub-line, and the expandable line table. */}
            <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-4")}>
              <button
                type="button"
                onClick={() => setOpen((s) => ({ ...s, [v.id]: !s[v.id] }))}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 rounded-md py-2 pr-1 text-left"
              >
                <Typography variant="body-strong" asChild>
                  <span>{PURCHASE_ORDERS_STRINGS.detail.versionLabel(v.version_number)}</span>
                </Typography>
                {snapStatusBadge(v)}
                <span className="ml-auto flex items-center gap-2.5">
                  <Typography variant="body-strong" numeric>
                    {money(String(versionTotal(lines)))}
                  </Typography>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  />
                </span>
              </button>
              <div className="-mt-0.5 flex items-center justify-between gap-2">
                <Typography variant="helper" tone="muted" asChild>
                  <p className="min-w-0">
                    {VT_S.lineCount(lines.length)} ·{" "}
                    {formatIST_date(v.approved_at ?? v.created_at)}
                  </p>
                </Typography>
                {/* The PO never matched a rejected version, so there is no copy of it. */}
                {!isRejectedSnapshot(v) && (
                  <VersionDownloadButton po={po} version={v.version_number} />
                )}
              </div>

              {isOpen && (
                <div className="mt-2 overflow-hidden rounded-lg border border-border">
                  {isRejectedSnapshot(v) && (
                    <div className="space-y-1 border-b border-destructive/20 bg-destructive/5 p-3">
                      <Typography variant="badge" tone="muted">
                        {REJ_S.reasonLabel}
                      </Typography>
                      {snapshotRejectionReasons(v).length ? (
                        snapshotRejectionReasons(v).map((reason, i) => (
                          <Typography
                            key={i}
                            variant="body"
                            className="whitespace-pre-wrap break-words"
                          >
                            {reason}
                          </Typography>
                        ))
                      ) : (
                        <Typography variant="body" tone="muted">
                          {REJ_S.noReason}
                        </Typography>
                      )}
                    </div>
                  )}
                  {/* Terms + notes read BEFORE the line items (header-level
                      context), aligned in an even two-column grid. Previously
                      they were stacked AFTER the table's own total + tax-note,
                      orphaned bottom-left behind a second divider. */}
                  {(hdr.payment_terms || hdr.delivery_terms || hdr.other_references || hdr.notes) && (
                    <div className="space-y-2 border-t border-border p-3">
                      <div className="grid grid-cols-3 gap-x-8 gap-y-2">
                        <div className="space-y-0.5">
                          <Typography variant="caption" tone="muted">
                            {VT_S.paymentTerms}
                          </Typography>
                          <Typography variant="body">{hdr.payment_terms || "—"}</Typography>
                        </div>
                        <div className="space-y-0.5">
                          <Typography variant="caption" tone="muted">
                            {VT_S.deliveryTerms}
                          </Typography>
                          <Typography variant="body">{hdr.delivery_terms || "—"}</Typography>
                        </div>
                        <div className="space-y-0.5">
                          <Typography variant="caption" tone="muted">
                            {VT_S.otherReferences}
                          </Typography>
                          <Typography variant="body">{hdr.other_references || "—"}</Typography>
                        </div>
                      </div>
                      {hdr.notes && (
                        <div className="space-y-0.5">
                          <Typography variant="caption" tone="muted">
                            {VT_S.notes}
                          </Typography>
                          <Typography variant="body" asChild>
                            <p className="whitespace-pre-wrap break-words">{hdr.notes}</p>
                          </Typography>
                        </div>
                      )}
                    </div>
                  )}
                  {lines.length ? (
                    <VersionLineTable lines={lines} />
                  ) : (
                    <Typography variant="helper" tone="muted" asChild>
                      <p className="p-3">{VT_S.noLines}</p>
                    </Typography>
                  )}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
