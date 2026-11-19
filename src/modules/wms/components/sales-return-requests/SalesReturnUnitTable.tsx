import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Typography } from "@/components/ui/typography"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial"
import { TruncatedText } from "@/components/common/display/TruncatedText"
import { formatIST_date } from "@/shared/lib/date"
import { cn } from "@/lib/utils"
import type { SalesReturnEligibleUnitWire } from "@modules/crm"

import {
  SALES_RETURN_REASON_LABEL,
  SALES_RETURN_REASON_OPTIONS,
  type SalesReturnReason,
} from "../../constants/sales-return-status"
import type { SalesReturnUnitSelection } from "./sales-return-form.schema"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"

const T = S.form.unitsStep.table

interface Props {
  units: SalesReturnEligibleUnitWire[]
  /** Picked units keyed by `dispatch_request_item_id`. */
  selections: ReadonlyMap<string, SalesReturnUnitSelection>
  onToggle: (unit: SalesReturnEligibleUnitWire) => void
  /** Select (`true`) or clear (`false`) every unit in the list given. */
  onSetMany: (units: SalesReturnEligibleUnitWire[], selected: boolean) => void
  onChangeReason: (driId: string, reason: SalesReturnReason) => void
  onChangeNotes: (driId: string, notes: string) => void
}

/**
 * The returnable units of one sales order as a selectable table: search,
 * select-all, and a per-unit Reason + Notes column. Mirrors the Purchase
 * Return `ReturnableUnitTable` (search with ×, header select-all, sticky
 * header, inner scroll) so both return flows read the same.
 *
 * Search is client-side on purpose: the list is bounded by what one order
 * shipped and arrives whole from `eligible-units` (not a paged endpoint).
 */
export function SalesReturnUnitTable({
  units,
  selections,
  onToggle,
  onSetMany,
  onChangeReason,
  onChangeNotes,
}: Props) {
  const C = T.columns
  const [search, setSearch] = useState("")

  const visibleUnits = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return units
    return units.filter((u) =>
      `${u.internal_serial} ${u.manufacturer_serial ?? ""} ${u.part_name} ${u.variant_name}`
        .toLowerCase()
        .includes(q),
    )
  }, [units, search])

  // Select-all works on what the search currently shows (§12 bulk: the
  // visible set), exactly like the Purchase Return table.
  const selectedVisible = visibleUnits.filter((u) =>
    selections.has(u.dispatch_request_item_id),
  ).length
  const allSelected =
    visibleUnits.length > 0 && selectedVisible === visibleUnits.length

  return (
    <div className="space-y-3">
      {/* Toolbar — search (with ×), a bulk untick, and a live unit count; the
          selected-count sits in the card header (like Purchase Return). */}
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
        <Typography variant="helper" tone="muted" numeric className="ml-auto tabular-nums">
          {T.unitCount(visibleUnits.length, units.length)}
        </Typography>
      </div>

      {/* Inner-scroll past ~10 rows so the sticky footer stays reachable
          (§7.7). `[&>div]:overflow-visible` neutralises the shared Table's own
          overflow wrapper so THIS box is the single scroll context — the
          sticky header pins to it, and a wide table pans inside it (§0.10). */}
      <div className="max-h-96 overflow-auto [&>div]:overflow-visible">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card [&_th]:bg-card">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 pl-4">
                {visibleUnits.length > 0 && (
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() =>
                      onSetMany(visibleUnits, !allSelected)
                    }
                    aria-label={T.selectAllAria}
                  />
                )}
              </TableHead>
              <TableHead>{C.serial}</TableHead>
              <TableHead>{C.mfrSerial}</TableHead>
              <TableHead>{C.partVariant}</TableHead>
              {/* Ages right-align like other numbers (§9). Reason + Notes are
                  not columns: they open in a sub-row when a unit is ticked,
                  mirroring the Purchase Return table. */}
              <TableHead className="pr-4 text-right">{C.age}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleUnits.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-8 text-center">
                  <Typography variant="body" tone="muted">
                    {T.noMatch}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              visibleUnits.map((unit) => (
                <UnitRow
                  key={unit.dispatch_request_item_id}
                  unit={unit}
                  selection={selections.get(unit.dispatch_request_item_id)}
                  onToggle={onToggle}
                  onChangeReason={onChangeReason}
                  onChangeNotes={onChangeNotes}
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
  selection,
  onToggle,
  onChangeReason,
  onChangeNotes,
}: {
  unit: SalesReturnEligibleUnitWire
  selection: SalesReturnUnitSelection | undefined
  onToggle: (unit: SalesReturnEligibleUnitWire) => void
  onChangeReason: (driId: string, reason: SalesReturnReason) => void
  onChangeNotes: (driId: string, notes: string) => void
}) {
  const selected = selection != null
  const id = unit.dispatch_request_item_id

  return (
    <>
      {/* A ticked unit's row + its Reason/Notes sub-row read as one calm grey
          block, matching the Purchase Return table's neutral `bg-muted`
          tint (not a blue `bg-primary` one). */}
      <TableRow className={cn(selected && "border-b-0")}>
        <TableCell className="w-10 pl-4">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggle(unit)}
            aria-label={T.selectUnitAria(unit.internal_serial)}
          />
        </TableCell>
        <TableCell className="max-w-[12rem] font-medium">
          <TruncatedSerial value={unit.internal_serial} />
          {unit.generation === "replacement" ? (
            <Typography variant="caption" tone="muted" asChild>
              <span className="block">{T.replacementUnit}</span>
            </Typography>
          ) : null}
        </TableCell>
        <TableCell className="max-w-[12rem]">
          {/* A missing serial renders the shared `—` fallback (§0.7). */}
          <TruncatedSerial value={unit.manufacturer_serial} />
        </TableCell>
        <TableCell className="max-w-[16rem]">
          <TruncatedText
            value={unit.part_name}
            className="block max-w-full font-medium"
          />
          <TruncatedText
            value={unit.variant_name}
            className="block max-w-full text-muted-foreground"
          />
        </TableCell>
        <TableCell className="pr-4 text-right">
          {/* The real dispatch date — same body font as the other columns, not
              a smaller/tabular caption. `formatIST_date` renders the `—`
              fallback. */}
          <Typography variant="body">
            {formatIST_date(unit.dispatched_at)}
          </Typography>
        </TableCell>
      </TableRow>

      {/* Per-unit Reason + Notes open in a sub-row once the unit is ticked,
          mirroring the Purchase Return table (they are not standing columns). */}
      {selected && (
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableCell />
          <TableCell colSpan={4} className="pb-4 pr-4 pt-0">
            {/* Reason + Notes, no labels — the placeholders name each control. */}
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={selection?.itemReason || null}
                onValueChange={(v) =>
                  v && onChangeReason(id, v as SalesReturnReason)
                }
              >
                <SelectTrigger
                  className="h-9 w-56"
                  clearable={false}
                  aria-label={T.reasonAria(unit.internal_serial)}
                >
                  {/* Empty until the operator picks — no preselected reason.
                      Show the label, never the raw enum (§7.2). */}
                  <SelectValue placeholder={T.reasonPlaceholder}>
                    {selection?.itemReason
                      ? SALES_RETURN_REASON_LABEL[selection.itemReason]
                      : T.reasonPlaceholder}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SALES_RETURN_REASON_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={selection?.notes ?? ""}
                onChange={(e) => onChangeNotes(id, e.target.value)}
                placeholder={T.notesPlaceholder}
                aria-label={T.notesAria(unit.internal_serial)}
                className="h-9 min-w-0 flex-1"
              />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
