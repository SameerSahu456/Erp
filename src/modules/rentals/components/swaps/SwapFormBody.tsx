import { Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import { AsyncSelect } from "@/components/ui/async-select"
import { FormPageShell } from "@/components/page-shells"
import { useAccountOptions } from "@modules/crm"

import { useRentalDeviceOptions } from "../../hooks/devices/useRentalDeviceOptions"
import { SWAPS_STRINGS } from "./swaps.strings"
import { deviceLabel, useSwapForm, type PairDraft } from "../../hooks/swaps/useSwapForm"

const S = SWAPS_STRINGS.form
const LIST = "/rentals/swaps"

interface PairRowProps {
  pair: PairDraft
  /** The picked customer; both pickers stay disabled until there is one. */
  accountId: string | undefined
  /** Narrows the staying picker to the order a deep link named. */
  declaredOrderId: string | undefined
  canRemove: boolean
  onPatch: (key: string, part: Partial<PairDraft>) => void
  onRemove: (key: string) => void
}

function PairRow({ pair, accountId, declaredOrderId, canRemove, onPatch, onRemove }: PairRowProps) {
  const returnedOptions = useRentalDeviceOptions(accountId, { status: "Returned" })
  const stayingOptions = useRentalDeviceOptions(accountId, { salesOrderId: declaredOrderId })
  const returnedId = `swap-returned-${pair.key}`
  const stayingId = `swap-staying-${pair.key}`
  return (
    <li className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <div className="min-w-0 space-y-1">
        <Label required htmlFor={returnedId}>
          {S.returned}
        </Label>
        <AsyncSelect
          id={returnedId}
          value={pair.returned}
          onValueChange={(v) => onPatch(pair.key, { returned: v })}
          useOptions={returnedOptions}
          toLabel={deviceLabel}
          placeholder={S.returnedPlaceholder}
          disabled={!accountId}
          className="w-full"
        />
      </div>
      <div className="min-w-0 space-y-1">
        <Label required htmlFor={stayingId}>
          {S.staying}
        </Label>
        <AsyncSelect
          id={stayingId}
          value={pair.staying}
          onValueChange={(v) => onPatch(pair.key, { staying: v })}
          useOptions={stayingOptions}
          toLabel={deviceLabel}
          placeholder={S.stayingPlaceholder}
          disabled={!accountId}
          className="w-full"
        />
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={S.removePair}
        onClick={() => onRemove(pair.key)}
        disabled={!canRemove}
      >
        <X className="size-4" />
      </Button>
    </li>
  )
}

/** Propose a serial swap (return-by-count §7). */
export function SwapFormBody() {
  const state = useSwapForm()
  return (
    <FormPageShell
      title={S.title}
      subtitle={S.subtitle}
      backHref={LIST}
      guard={state.guard}
      onSave={() => void state.submit()}
      saveLabel={S.submit}
      saving={state.saving}
      canSave={state.canSubmit}
      footerLeft={!state.complete ? S.pairIncomplete : undefined}
    >
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2 md:max-w-xl">
            <Label required htmlFor="swap-customer">
              {S.customer}
            </Label>
            <AsyncSelect
              id="swap-customer"
              value={state.account}
              onValueChange={state.pickAccount}
              useOptions={useAccountOptions}
              toLabel={(a) => a.name}
              placeholder={S.customerPlaceholder}
              className="w-full"
            />
          </div>
          <Typography variant="helper" tone="muted">
            {S.finalizeFirst}
          </Typography>
          <ul className="space-y-3">
            {state.pairs.map((p) => (
              <PairRow
                key={p.key}
                pair={p}
                accountId={state.account?.id}
                declaredOrderId={state.declaredOrderId}
                canRemove={state.pairs.length > 1}
                onPatch={state.patchPair}
                onRemove={state.removePair}
              />
            ))}
          </ul>
          <Button variant="outline" onClick={state.addPair} disabled={!state.account}>
            <Plus className="size-4" data-icon="inline-start" />
            {S.addPair}
          </Button>
          <div className="space-y-2">
            <Label required htmlFor="swap-reason">{S.reason}</Label>
            <Textarea id="swap-reason"
              value={state.reason}
              onChange={(e) => state.setReason(e.target.value)}
              placeholder={S.reasonPlaceholder}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </FormPageShell>
  )
}
