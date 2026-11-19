import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"
import { EmptyState } from "@/components/common/feedback/EmptyState"
import { FormPageShell } from "@/components/page-shells"

import { AcceptedScansCard, HeldScansCard } from "./RentalScanLists"
import { RentalScanInput } from "./RentalScanInput"
import { RENTAL_SCAN_STRINGS as S } from "./rental-scan.strings"
import { useRentalScan, type RentalScanState } from "./useRentalScan"

const LIST = "/wms/inward"

function ContextCard({ state }: { state: RentalScanState }) {
  const facts = [
    [S.context.customer, state.rret?.account_name],
    [S.context.request, state.rret?.request_number],
    [S.context.declaredOrder, state.rret?.order_number],
  ] as const
  return (
    <Card>
      <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0 space-y-1">
            <Typography variant="caption" tone="muted">
              {label}
            </Typography>
            <Typography variant="body" className="min-w-0 truncate">
              {value ?? S.context.none}
            </Typography>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function Footer({ state }: { state: RentalScanState }) {
  const total = state.accepted.length + state.held.length
  return (
    <>
      <Button variant="outline" onClick={() => void state.save(false)} disabled={!state.dirty || state.saving}>
        {S.footer.save}
      </Button>
      <Button onClick={() => void state.save(true)} disabled={total === 0 || state.saving}>
        {S.footer.saveAndContinue}
      </Button>
    </>
  )
}

/** Scan a rental return box by box (return-by-count spec §5). */
export function RentalScanBody({ batchId }: { batchId: string }) {
  const navigate = useNavigate()
  const state = useRentalScan(batchId)
  const { batch, batchQuery } = state

  if (batchQuery.isLoading) return <div className="h-64 w-full animate-pulse rounded-md bg-muted" />
  if (!batch || !state.isRental || batch.status !== "open") {
    return (
      <EmptyState
        title={!batch || !state.isRental ? S.notRental : S.notOpen}
        action={{ label: S.backToInward, onClick: () => navigate(LIST) }}
      />
    )
  }

  const listProps = {
    lookups: state.lookups,
    accountId: state.rret?.account_id ?? "",
    onRemove: state.removeScan,
  }
  return (
    <FormPageShell
      title={S.title(batch.grn_number)}
      subtitle={S.subtitle}
      backHref={LIST}
      guard={state.guard}
      footerLeft={S.footer.staged(state.accepted.length, state.held.length)}
      footerActions={<Footer state={state} />}
    >
      <div className="space-y-6">
        <ContextCard state={state} />
        <Card>
          <CardContent className="pt-6">
            <RentalScanInput
              addScan={state.addScan}
              scanning={state.scanning}
              scanError={state.scanError}
              clearScanError={state.clearScanError}
            />
          </CardContent>
        </Card>
        <HeldScansCard rows={state.held} {...listProps} />
        <AcceptedScansCard rows={state.accepted} {...listProps} />
      </div>
    </FormPageShell>
  )
}
