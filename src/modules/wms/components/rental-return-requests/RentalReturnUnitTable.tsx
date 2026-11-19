import { useState } from "react"
import { Search, X } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Typography } from "@/components/ui/typography"
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial"
import { TruncatedText } from "@/components/common/display/TruncatedText"
import type { RentalReturnEligibleUnitWire } from "@modules/crm"

import { matchesUnitSearch, unitKey } from "./rental-return-request-form-helpers"
import { RENTAL_RETURN_REQUESTS_STRINGS as S } from "./rental-return-requests.strings"

const T = S.form.unitsStep.table

interface Props {
  units: RentalReturnEligibleUnitWire[]
  /** Ticked units, by `unitKey`. */
  selected: ReadonlySet<string>
  onToggle: (unit: RentalReturnEligibleUnitWire) => void
  /** Tick (`true`) or untick (`false`) every unit given. */
  onSetMany: (units: RentalReturnEligibleUnitWire[], on: boolean) => void
}

/**
 * One order's units on rent as a selectable table — search with ×, a
 * header select-all over what the search shows, sticky header, inner
 * scroll. The same table the sales return form uses, so both read alike.
 * Search is client-side: the list is one order's units, returned whole.
 */
export function RentalReturnUnitTable({ units, selected, onToggle, onSetMany }: Props) {
  const C = T.columns
  const [search, setSearch] = useState("")
  const visible = units.filter((u) => matchesUnitSearch(u, search))
  const selectedVisible = visible.filter((u) => selected.has(unitKey(u))).length
  const allSelected = visible.length > 0 && selectedVisible === visible.length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-0 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={T.searchPlaceholder}
            aria-label={T.searchPlaceholder}
            className="h-9 w-full min-w-0 pl-9 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={T.clearSearch}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Typography variant="helper" tone="muted" numeric className="ml-auto">
          {T.unitCount(visible.length, units.length)}
        </Typography>
      </div>

      {/* Inner scroll so the sticky footer stays reachable; this box is the
          single scroll context, so the header pins to it (§0.10). */}
      <div className="max-h-96 overflow-auto [&>div]:overflow-visible">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card [&_th]:bg-card">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 pl-4">
                {visible.length > 0 && (
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => onSetMany(visible, !allSelected)}
                    aria-label={T.selectAllAria}
                  />
                )}
              </TableHead>
              <TableHead>{C.serial}</TableHead>
              <TableHead>{C.mfrSerial}</TableHead>
              <TableHead className="pr-4">{C.model}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-8 text-center">
                  <Typography variant="body" tone="muted">
                    {T.noMatch}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((unit) => (
                <UnitRow
                  key={unitKey(unit)}
                  unit={unit}
                  selected={selected.has(unitKey(unit))}
                  onToggle={onToggle}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function UnitRow({
  unit,
  selected,
  onToggle,
}: {
  unit: RentalReturnEligibleUnitWire
  selected: boolean
  onToggle: (unit: RentalReturnEligibleUnitWire) => void
}) {
  const serial = unit.internal_serial ?? unit.manufacturer_serial ?? T.noSerial
  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell className="w-10 pl-4">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(unit)}
          aria-label={T.selectUnitAria(serial)}
        />
      </TableCell>
      <TableCell className="max-w-[12rem] font-medium">
        {/* A missing serial renders the shared `—` fallback (§0.7). */}
        <TruncatedSerial value={unit.internal_serial} />
        {/* A unit the customer received as a replacement — as on the sales
            return table. */}
        {unit.generation === "replacement" ? (
          <Typography variant="caption" tone="muted" className="block">
            {T.replacementUnit}
          </Typography>
        ) : null}
      </TableCell>
      <TableCell className="max-w-[12rem]">
        <TruncatedSerial value={unit.manufacturer_serial} />
      </TableCell>
      <TableCell className="max-w-[18rem] pr-4">
        <TruncatedText value={unit.part_name} className="block max-w-full font-medium" />
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {unit.variant_name ? (
            <TruncatedText
              value={unit.variant_name}
              className="block min-w-0 max-w-full text-muted-foreground"
            />
          ) : null}
          {unit.no_dispatch_record ? (
            <Badge variant="secondary" className="shrink-0">
              {T.noDispatchRecord}
            </Badge>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  )
}
