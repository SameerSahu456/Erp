import { Checkbox } from "@/components/ui/checkbox"
import { Typography } from "@/components/ui/typography"

import type { ExpectedLegacyUnit } from "../../api"
import { INWARDS_STRINGS } from "./inwards.strings"
import { legacyReturnLine, type ReturnState } from "./return-line-items-helpers"

const S = INWARDS_STRINGS.legacyReturnUnits

/** Migrated rental units a replacement or rental return expects back. They have no
 *  dispatch record or catalog part, so they cannot be picked as a part; the
 *  operator ticks the box that arrived and it is received by its serial. */
export function LegacyReturnUnits({
  units,
  value,
  onChange,
}: {
  units: ExpectedLegacyUnit[]
  value: ReturnState
  onChange: (next: ReturnState) => void
}) {
  const ticked = new Set(value.map((l) => l.legacyDeviceId).filter(Boolean))
  const toggle = (unit: ExpectedLegacyUnit, on: boolean) =>
    onChange(
      on
        ? [...value, legacyReturnLine(unit)]
        : value.filter((l) => l.legacyDeviceId !== unit.rental_device_id),
    )
  // Only a unit with a serial can be matched back, so only those are tickable.
  const tickable = units.filter((u) => !!u.serial_number)
  const allTicked = tickable.length > 0 && tickable.every((u) => ticked.has(u.rental_device_id))
  const toggleAll = () => {
    const others = value.filter(
      (l) => !l.legacyDeviceId || !tickable.some((u) => u.rental_device_id === l.legacyDeviceId),
    )
    onChange(allTicked ? others : [...others, ...tickable.map(legacyReturnLine)])
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="space-y-0.5">
        <Typography variant="body-strong">{S.title}</Typography>
        <Typography variant="helper" tone="muted">
          {S.help}
        </Typography>
      </div>
      {tickable.length > 1 && (
        <label htmlFor="legacy-unit-all" className="flex min-w-0 items-center gap-2 border-b pb-1.5">
          <Checkbox id="legacy-unit-all" checked={allTicked} onCheckedChange={toggleAll} />
          <Typography variant="body-strong">{S.selectAll(ticked.size, tickable.length)}</Typography>
        </label>
      )}
      {/* A whole migrated order can be hundreds of units: scroll inside. */}
      <ul className="max-h-80 space-y-1.5 overflow-y-auto">
        {units.map((unit) => {
          const id = `legacy-unit-${unit.rental_device_id}`
          return (
            <li key={unit.rental_device_id}>
              <label htmlFor={id} className="flex min-w-0 items-center gap-2">
                <Checkbox
                  id={id}
                  checked={ticked.has(unit.rental_device_id)}
                  // A serial is the only way the box is matched back.
                  disabled={!unit.serial_number}
                  onCheckedChange={(on) => toggle(unit, on === true)}
                />
                <Typography variant="body" numeric className="shrink-0">
                  {unit.serial_number ?? S.noSerial}
                </Typography>
                <Typography variant="helper" tone="muted" className="min-w-0 truncate">
                  {unit.part_name ?? S.unnamed}
                </Typography>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
