import { useEffect, useState } from "react"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldError } from "@/components/common/forms/FieldError"

import {
  LOST_REASONS,
  composeLostReason,
  decomposeLostReason,
} from "./LostReasonDialog"
import { CRM_SHARED_STRINGS } from "./crm-shared.strings"

// Compose that treats an unpicked reason as "no value", so the parent's
// stored string stays empty (and required-validation fires) until the user
// actually selects a reason — even if they typed a note first.
function compose(reason: string, notes: string): string {
  return reason ? composeLostReason(reason, notes) : ""
}

interface ClosedLostReasonFieldsProps {
  /** The composed `closed_lost_reason` string the parent form owns. */
  value: string
  onChange: (composed: string) => void
  /** Inline error for the reason/required check. */
  error?: string
  /** Cleared on any edit. */
  onClearError?: () => void
  /** 'lead' | 'deal' — drives the notes placeholder copy. */
  entityType: "lead" | "deal"
  /** Prefix for stable input ids (e.g. "deal" → "deal-closed-lost-reason"). */
  idPrefix: string
}

// Structured Closed-Lost reason editor for the Lead/Deal forms — a reason
// dropdown + a notes textarea, mirroring `LostReasonDialog`. Fully controlled:
// the parent keeps the single composed `closed_lost_reason` string; this
// component decomposes it for editing and recomposes on change. Local state is
// re-synced whenever the parent value changes externally (e.g. edit hydration)
// without clobbering in-progress typing.
export function ClosedLostReasonFields({
  value,
  onChange,
  error,
  onClearError,
  entityType,
  idPrefix,
}: ClosedLostReasonFieldsProps) {
  const [reason, setReason] = useState(() => decomposeLostReason(value).reason)
  const [notes, setNotes] = useState(() => decomposeLostReason(value).notes)

  // Re-sync from the parent only when the incoming value reflects an external
  // change (hydration / reset) — i.e. it doesn't already match what these
  // fields compose to. Guard prevents wiping the user's current edit.
  useEffect(() => {
    if (compose(reason, notes) !== value) {
      const d = decomposeLostReason(value)
      setReason(d.reason)
      setNotes(d.notes)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync on external value only
  }, [value])

  function emit(nextReason: string, nextNotes: string) {
    setReason(nextReason)
    setNotes(nextNotes)
    onChange(compose(nextReason, nextNotes))
    onClearError?.()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-closed-lost-reason`} className="font-ui">
          {CRM_SHARED_STRINGS.lostReasonDialog.reasonLabel}{" "}
          <span className="text-destructive">*</span>
        </Label>
        <Select value={reason} onValueChange={(v) => emit(v ?? "", notes)}>
          <SelectTrigger
            id={`${idPrefix}-closed-lost-reason`}
            className="w-full"
            aria-invalid={Boolean(error)}
          >
            <SelectValue
              placeholder={CRM_SHARED_STRINGS.lostReasonDialog.reasonPlaceholder}
            />
          </SelectTrigger>
          <SelectContent align="start" sideOffset={4}>
            {LOST_REASONS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={error} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-closed-lost-notes`} className="font-ui">
          {CRM_SHARED_STRINGS.lostReasonDialog.notesLabel}
        </Label>
        <Textarea
          id={`${idPrefix}-closed-lost-notes`}
          rows={3}
          className="max-h-40 overflow-y-auto"
          value={notes}
          placeholder={CRM_SHARED_STRINGS.lostReasonDialog.notesPlaceholder(entityType)}
          onChange={(e) => emit(reason, e.target.value)}
        />
      </div>
    </div>
  )
}
