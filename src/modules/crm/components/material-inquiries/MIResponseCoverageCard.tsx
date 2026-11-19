import { Package } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatINRCompact } from "@/lib/currency"

import type { useMIResponseDetail } from "../../hooks/material-inquiries/useMIResponseDetail"
import { Metric } from "./MIResponseStatBits"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

type Detail = ReturnType<typeof useMIResponseDetail>

// Coverage against the request — only rendered when the parent MI's matching
// line item has resolved.
export function MIResponseCoverageCard({
  detail,
  response,
}: {
  detail: Detail
  response: NonNullable<Detail["response"]>
}) {
  const {
    qtyRequested,
    shortfall,
    clientBudgetPerUnit,
    offeredPerUnit,
    withinBudget,
    budgetDeltaTotal,
    coveragePct,
  } = detail

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Package className="size-3.5" />
          </span>
          {S.coverage.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric label={S.coverage.clientRequested} value={S.coverage.units(qtyRequested)} />
          <Metric
            label={S.coverage.thisResponseCovers}
            value={S.coverage.units(response.qty_available)}
            tone={
              response.qty_available >= qtyRequested
                ? "success"
                : response.qty_available >= qtyRequested / 2
                  ? "warning"
                  : "default"
            }
          />
          <Metric
            label={S.coverage.shortfall}
            value={shortfall === 0 ? S.coverage.fullyCovered : S.coverage.units(shortfall)}
            tone={shortfall === 0 ? "success" : "warning"}
          />
          {clientBudgetPerUnit != null && (
            <>
              <Metric
                label={S.coverage.clientBudgetPerUnit}
                value={formatINRCompact(clientBudgetPerUnit, { decimals: true })}
              />
              <Metric
                label={
                  response.sell_price != null
                    ? S.coverage.sellPricePerUnit
                    : S.coverage.costPricePerUnit
                }
                value={formatINRCompact(offeredPerUnit, { decimals: true })}
                tone={withinBudget ? "success" : "warning"}
              />
              <Metric
                label={withinBudget ? S.coverage.budgetHeadroom : S.coverage.overBudgetBy}
                value={formatINRCompact(budgetDeltaTotal, { decimals: true })}
                tone={withinBudget ? "success" : "warning"}
              />
            </>
          )}
        </div>

        {/* Coverage bar */}
        {qtyRequested > 0 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-medium uppercase tracking-wider">
                {S.coverage.quantityCoverage}
              </span>
              <span className="font-semibold tabular-nums text-foreground/80">
                {coveragePct}%
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${
                  response.qty_available >= qtyRequested
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
                style={{ width: `${coveragePct}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
