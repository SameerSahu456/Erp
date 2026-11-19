import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePermission } from "@shared/rbac"

import type { RentalSettings, RentalSettingsPayload } from "../../api/settings"
import { useSaveRentalSettings } from "../../hooks/configuration/useRentalSettings"
import { rentalsCan } from "../../permissions"
import { EARLY_EXIT_STRINGS } from "./early-exit.strings"

const S = EARLY_EXIT_STRINGS.policy

type PolicyKey =
  | "early_exit_pct_default"
  | "return_line_auto_close_days"
  | "foreign_device_max_days"
  | "adjustment_reminder_days"

const FIELDS: readonly { key: PolicyKey; label: string; max: number }[] = [
  { key: "early_exit_pct_default", label: S.pct, max: 100 },
  { key: "return_line_auto_close_days", label: S.autoClose, max: 365 },
  { key: "foreign_device_max_days", label: S.foreign, max: 365 },
  { key: "adjustment_reminder_days", label: S.reminder, max: 90 },
]

const draftOf = (s: RentalSettings) =>
  Object.fromEntries(FIELDS.map((f) => [f.key, String(s[f.key])])) as Record<PolicyKey, string>

/** The four return-by-count settings (spec §12). */
export function ReturnPolicyCard({ settings }: { settings: RentalSettings }) {
  const save = useSaveRentalSettings()
  // PUT /rentals/settings' own code; a reader sees the values, read-only.
  const canEdit = usePermission().canAny(rentalsCan.editSettings)
  const [draft, setDraft] = useState(() => draftOf(settings))
  const valid = FIELDS.every((f) => {
    const n = Number(draft[f.key])
    return draft[f.key].trim() !== "" && Number.isInteger(n) && n >= 0 && n <= f.max
  })
  const dirty = FIELDS.some((f) => draft[f.key] !== String(settings[f.key]))
  const submit = () =>
    save.mutate(Object.fromEntries(FIELDS.map((f) => [f.key, Number(draft[f.key])])) as RentalSettingsPayload)
  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{S.title}</CardTitle>
          <CardDescription>{S.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* items-end: a label that wraps to two lines must not push its
            input below its neighbour's. */}
        <div className="grid items-end gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor={`policy-${f.key}`}>{f.label}</Label>
              <Input
                id={`policy-${f.key}`}
                inputMode="numeric"
                value={draft[f.key]}
                disabled={!canEdit}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        {canEdit ? (
          <Button onClick={submit} disabled={!dirty || !valid || save.isPending}>
            {S.save}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
