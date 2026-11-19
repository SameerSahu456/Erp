import { Link } from "react-router-dom"
import { AlertTriangle, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { formatINR } from "@/lib/currency"

import type { RentalScanOutcome } from "../../../api"
import {
  RENTAL_SCAN_KIND_LABEL,
  RENTAL_SCAN_KIND_VARIANT,
  type RentalScanKind,
} from "../../../constants/rental-scan"
import type { ScanLookups, ScanRow } from "./rental-scan-helpers"
import { RENTAL_SCAN_STRINGS as S } from "./rental-scan.strings"

const W = S.warnings
const money = (v: string) => formatINR(Number(v))

/** Where a price-difference warning hands off: the swap form, pre-filled
 *  with the returned unit and the order the customer meant. */
function swapHref(o: RentalScanOutcome, accountId: string): string {
  const q = new URLSearchParams({ account_id: accountId })
  if (o.rental_device_id) q.set("returned_device_id", o.rental_device_id)
  if (o.declared_sales_order_id) q.set("declared_sales_order_id", o.declared_sales_order_id)
  return `/rentals/swaps/new?${q.toString()}`
}

function Warnings({ o, lookups, accountId }: { o: RentalScanOutcome; lookups: ScanLookups; accountId: string }) {
  const name = (id?: string | null) => (id ? (lookups.orders.get(id) ?? S.context.none) : S.context.none)
  const declared = name(o.declared_sales_order_id)
  const lines: string[] = []
  if (o.off_declared_order) {
    lines.push(
      o.rate_difference && Number(o.rate_difference) !== 0
        ? W.offDeclared(declared, money(o.rate_difference))
        : W.offDeclaredSameRate(declared),
    )
  }
  if (o.order_fully_returned) lines.push(W.fullyReturned(name(o.sales_order_id)))
  if (o.early_exit_estimate) lines.push(W.earlyExit(money(o.early_exit_estimate)))
  if (lines.length === 0) return null
  const canSwap = o.off_declared_order && !!o.rate_difference && Number(o.rate_difference) !== 0
  return (
    <div className="space-y-1 rounded-md bg-warning-soft/40 p-2">
      {lines.map((line) => (
        <div key={line} className="flex min-w-0 items-start gap-2">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
          <Typography variant="caption" className="min-w-0">
            {line}
          </Typography>
        </div>
      ))}
      {canSwap && (
        <Button size="sm" variant="outline" render={<Link to={swapHref(o, accountId)} />}>
          {W.proposeSwap}
        </Button>
      )}
    </div>
  )
}

export function RentalScanRow({
  row,
  lookups,
  accountId,
  onRemove,
}: {
  row: ScanRow
  lookups: ScanLookups
  accountId: string
  onRemove: (key: string) => void
}) {
  const o = row.outcome
  const kind = o.kind as RentalScanKind
  const model = o.part_variant_id ? lookups.models.get(o.part_variant_id) : undefined
  const order = o.sales_order_id ? lookups.orders.get(o.sales_order_id) : undefined
  const facts = [model ?? S.row.unknownModel, order && S.row.order(order), o.monthly_rate && S.row.rate(money(o.monthly_rate))]
  return (
    <li className="space-y-2 p-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <Typography variant="body-strong" className="min-w-0 truncate font-mono">
            {o.internal_serial ?? row.text}
          </Typography>
          <Typography variant="caption" tone="muted" className="min-w-0 truncate">
            {facts.filter(Boolean).join(" · ")}
          </Typography>
        </div>
        <StatusBadge variant={RENTAL_SCAN_KIND_VARIANT[kind] ?? "neutral"}>
          {RENTAL_SCAN_KIND_LABEL[kind] ?? o.kind}
        </StatusBadge>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={S.row.remove(row.text)}
          onClick={() => onRemove(row.key)}
          className="shrink-0"
        >
          <X className="size-4" />
        </Button>
      </div>
      <Warnings o={o} lookups={lookups} accountId={accountId} />
    </li>
  )
}
