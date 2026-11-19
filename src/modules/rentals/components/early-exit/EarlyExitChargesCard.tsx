import { useState } from "react"

import { ReasonDialog } from "@/components/common/dialogs/ReasonDialog"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Typography } from "@/components/ui/typography"
import { formatINR } from "@/lib/currency"
import { EMPTY_VALUE } from "@/shared/constants"
import { formatIST_date } from "@shared/lib/date"
import { usePermission } from "@shared/rbac"

import type { EarlyExitCharge } from "../../api/early-exit"
import { earlyExitStatusLabel, earlyExitStatusVariant } from "../../constants/early-exit"
import { useEarlyExitCharges, useRequestEarlyExitWaiver } from "../../hooks/early-exit/useEarlyExit"
import { rentalsCan } from "../../permissions"
import { RetryLoadError } from "../shared/RetryLoadError"
import { EARLY_EXIT_STRINGS } from "./early-exit.strings"

const S = EARLY_EXIT_STRINGS.charges

function ChargeRow({ charge, onWaive }: { charge: EarlyExitCharge; onWaive: ((c: EarlyExitCharge) => void) | null }) {
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <Typography variant="body" truncate className="min-w-0">
          {S.line(charge.serial_number ?? EMPTY_VALUE, charge.remaining_months, charge.pct)}
        </Typography>
        <Typography variant="caption" tone="muted">
          {S.settled(formatIST_date(charge.settled_on))}
        </Typography>
      </div>
      <Typography variant="body-strong" numeric className="shrink-0">
        {formatINR(Number(charge.amount))}
      </Typography>
      <StatusBadge variant={earlyExitStatusVariant(charge.status)}>{earlyExitStatusLabel(charge.status)}</StatusBadge>
      {onWaive && charge.status === "pending" && (
        <Button size="sm" variant="outline" onClick={() => onWaive(charge)}>
          {S.requestWaiver}
        </Button>
      )}
    </li>
  )
}

function ChargesContent({ query, onWaive }: { query: ReturnType<typeof useEarlyExitCharges>; onWaive: ((c: EarlyExitCharge) => void) | null }) {
  if (query.isLoading) return <Skeleton className="h-16 w-full" />
  if (query.isError) {
    return <RetryLoadError error={query.error} fallback={S.loadError} onRetry={() => void query.refetch()} compact />
  }
  return (
    <ul className="divide-y rounded-md border">
      {(query.data ?? []).map((c) => (
        <ChargeRow key={c.id} charge={c} onWaive={onWaive} />
      ))}
    </ul>
  )
}

/** An order's early-exit charges with the waiver request (R18). Hidden when
 *  the order has none; a failed load shows inline instead of hiding. */
export function EarlyExitChargesCard({ salesOrderId }: { salesOrderId: string }) {
  const query = useEarlyExitCharges(salesOrderId)
  const request = useRequestEarlyExitWaiver()
  const { can } = usePermission()
  const canRequest = can([...rentalsCan.requestEarlyExitWaiver])
  const [waiving, setWaiving] = useState<EarlyExitCharge | null>(null)
  if (query.isSuccess && query.data.length === 0) return null
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{S.title}</CardTitle>
        <CardDescription>{S.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChargesContent query={query} onWaive={canRequest ? setWaiving : null} />
      </CardContent>
      {waiving && (
        <ReasonDialog
          copy={EARLY_EXIT_STRINGS.waiverDialog}
          pending={request.isPending}
          onConfirm={async (reason) => {
            await request.mutateAsync({ chargeId: waiving.id, reason })
          }}
          onClose={() => setWaiving(null)}
        />
      )}
    </Card>
  )
}
