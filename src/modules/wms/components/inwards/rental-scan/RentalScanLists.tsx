import { PackageCheck, ShieldAlert } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"

import { RentalScanRow } from "./RentalScanRow"
import type { ScanLookups, ScanRow } from "./rental-scan-helpers"
import { RENTAL_SCAN_STRINGS as S } from "./rental-scan.strings"

interface ListProps {
  rows: readonly ScanRow[]
  lookups: ScanLookups
  accountId: string
  onRemove: (key: string) => void
}

function Rows({ rows, lookups, accountId, onRemove }: ListProps) {
  return (
    <ul className="max-h-[32rem] divide-y overflow-y-auto rounded-md border">
      {rows.map((row) => (
        <RentalScanRow
          key={row.key}
          row={row}
          lookups={lookups}
          accountId={accountId}
          onRemove={onRemove}
        />
      ))}
    </ul>
  )
}

/** Boxes that book into stock against the account's units on rent. */
export function AcceptedScansCard(props: ListProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <PackageCheck className="size-4" />
          {S.accepted.heading}
        </CardTitle>
        <Typography variant="caption" tone="muted" numeric className="shrink-0">
          {S.accepted.count(props.rows.length)}
        </Typography>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <Typography variant="body" tone="muted">
            {S.accepted.empty}
          </Typography>
        ) : (
          <Rows {...props} />
        )}
      </CardContent>
    </Card>
  )
}

/** Held boxes, kept visibly apart: none of them books stock. */
export function HeldScansCard(props: ListProps) {
  if (props.rows.length === 0) return null
  return (
    <Card className="border-warning/40">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-warning" />
          {S.held.heading}
        </CardTitle>
        <Typography variant="caption" tone="muted" numeric className="shrink-0">
          {S.accepted.count(props.rows.length)}
        </Typography>
      </CardHeader>
      <CardContent className="space-y-3">
        <Typography variant="helper" tone="muted">
          {S.held.helper}
        </Typography>
        <Rows {...props} />
      </CardContent>
    </Card>
  )
}
