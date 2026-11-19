import { useMemo } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"
import type { RentalReturnRequestItemWire } from "@modules/crm"

import { varianceByModel, type ModelVariance } from "./rental-return-request-detail-helpers"
import { RENTAL_RETURN_REQUESTS_STRINGS as S } from "./rental-return-requests.strings"

const V = S.detail.variance

const CELLS: readonly (readonly [string, keyof ModelVariance])[] = [
  [V.requested, "requested"],
  [V.received, "received"],
  [V.substituted, "substituted"],
  [V.unrequested, "unrequested"],
  [V.outstanding, "outstanding"],
]

/** Requested vs received per model — what came back against what was
 *  asked for, with other-model and extra boxes kept apart. */
export function RentalReturnVarianceCard({
  items,
}: {
  items: readonly RentalReturnRequestItemWire[]
}) {
  const rows = useMemo(() => varianceByModel(items, S.detail.lines.unknown), [items])
  if (rows.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>{V.heading}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y rounded-md border">
          {rows.map((row) => (
            <li key={row.key}className="flex min-w-0 flex-col gap-2 p-3 md:flex-row md:items-center">
              <Typography variant="body-strong" className="min-w-0 flex-1 truncate">
                {row.label}
              </Typography>
              <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1">
                {CELLS.map(([label, key]) => (
                  <Typography key={key} variant="caption" tone="muted" numeric>
                    {label} <span className="text-foreground">{row[key]}</span>
                  </Typography>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <Typography variant="helper" tone="muted">
          {V.helper}
        </Typography>
      </CardContent>
    </Card>
  )
}
