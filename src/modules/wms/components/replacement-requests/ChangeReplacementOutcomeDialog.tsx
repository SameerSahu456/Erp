import { useState } from "react"

import { AsyncSelect } from "@/components/ui/async-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Typography } from "@/components/ui/typography"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { useNumberField } from "@/hooks/use-number-field"
import { partOptionDescription } from "@modules/ims"
import {
  useChangeReplacementItemOutcome,
  type ReplacementRequestItemWire,
} from "@modules/crm"

import type { ReplacementDecision } from "../../constants/replacement-request-status"
import {
  useReplacementPartOptions,
  type PartOption,
} from "../../hooks/replacement-requests/useReplacementPartOptions"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

const D = S.detail.dialogs
const NO_LEADING: PartOption[] = []

/** The outcomes this line may take. Repair only when the part came in on its
 *  own; "engineer decides" only while the whole device is with us; the same
 *  part only when it was picked from the device, so its part is known. */
function outcomesFor(item: ReplacementRequestItemWire): { value: ReplacementDecision; label: string }[] {
  const partOnly = item.in_house_return === "part"
  return [
    ...(partOnly ? [{ value: "repair" as const, label: D.outcomeRepair }] : []),
    ...(item.original_part_variant_id
      ? [{ value: "same_part" as const, label: D.outcomeSamePart }]
      : []),
    { value: "different_part" as const, label: D.outcomeDifferentPart },
    ...(partOnly ? [] : [{ value: "to_be_decided" as const, label: D.outcomeEngineerDecides }]),
  ]
}

function RateInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const rate = useNumberField(value, onChange, { decimal: true })
  return <Input {...rate} id="rr-outcome-rate" className="w-40 text-right" />
}

/** Repair or replace an in-house part after inspecting it (spec D15). Naming
 *  a new part sends the line back for approval; repair releases its reserved
 *  part. Mounted only while open. */
export function ChangeReplacementOutcomeDialog({
  rrId,
  item,
  onClose,
}: {
  rrId: string
  item: ReplacementRequestItemWire
  onClose: () => void
}) {
  const changeOutcome = useChangeReplacementItemOutcome()
  const outcomes = outcomesFor(item)
  const [decision, setDecision] = useState<ReplacementDecision>(
    outcomes.some((o) => o.value === item.replacement_decision)
      ? item.replacement_decision
      : outcomes[0].value,
  )
  const [newPart, setNewPart] = useState<PartOption | null>(null)
  const [rate, setRate] = useState(0)
  const useNewPartOptions = useReplacementPartOptions(NO_LEADING)
  const part =
    item.component_description ?? item.original_part_name ?? S.detail.lines.unknownPart
  const needsPart = decision === "different_part"
  const blocked = needsPart && !newPart
  const isDirty = decision !== item.replacement_decision || newPart !== null

  const submit = async () => {
    await changeOutcome.mutateAsync({
      rrId,
      itemId: item.id,
      body: needsPart
        ? {
            replacement_decision: decision,
            replacement_part_variant_id: newPart?.id ?? null,
            replacement_rate: rate,
          }
        : { replacement_decision: decision },
    })
    onClose()
  }

  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={D.outcomeTitle}
      description={D.outcomeBody(part)}
      isDirty={isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={changeOutcome.isPending}>
            {D.dismiss}
          </Button>
          <Button onClick={() => void submit()} disabled={changeOutcome.isPending || blocked}>
            {D.outcomeConfirm}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <Label required>{D.outcomeLabel}</Label>
          <RadioGroup
            value={decision}
            onValueChange={(v) => setDecision(v as ReplacementDecision)}
            className="flex flex-col gap-2"
          >
            {outcomes.map((o) => (
              <label key={o.value} className="flex items-center gap-2">
                <RadioGroupItem value={o.value} />
                <Typography variant="body">{o.label}</Typography>
              </label>
            ))}
          </RadioGroup>
        </div>
        {needsPart && (
          <>
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label required>{D.outcomeNewPart}</Label>
              <AsyncSelect<PartOption>
                value={newPart}
                onValueChange={setNewPart}
                useOptions={useNewPartOptions}
                toLabel={(o) => o.label}
                getDescription={partOptionDescription}
                placeholder={D.outcomeNewPartPlaceholder}
                searchable
                clearable
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rr-outcome-rate">{D.outcomeRate}</Label>
              <RateInput value={rate} onChange={setRate} />
            </div>
          </>
        )}
      </div>
    </OperationDialog>
  )
}
