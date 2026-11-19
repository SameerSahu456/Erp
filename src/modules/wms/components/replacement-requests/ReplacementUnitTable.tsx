import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Typography } from "@/components/ui/typography"

import { useReplacementUnitTable } from "../../hooks/replacement-requests/useReplacementUnitTable"
import type { ReplacementUnitSelection } from "./replacement-request-form.schema"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import type { ReplacementRowUnit } from "./replacement-unit-table-helpers"
import { ReplacementUnitTableToolbar } from "./ReplacementUnitTableToolbar"
import { ReplacementUnitBulkBar } from "./ReplacementUnitBulkBar"
import { ReplacementDeviceRows } from "./ReplacementDeviceRows"

const T = S.form.units.table

export type { ReplacementRowUnit } from "./replacement-unit-table-helpers"

interface Props {
  units: ReplacementRowUnit[]
  /** Each ticked device's first pick, keyed by `unitKey` (DRI, or the
   *  rental device of a unit with no dispatch record). */
  picks: ReadonlyMap<string, ReplacementUnitSelection>
  /** A ticked device's further parts (component spec D10a). */
  extrasOf: (driId: string) => ReplacementUnitSelection[]
  /** Per-line validation messages, keyed by row key (a first pick's is its DRI). */
  errorsOf: (rowKey: string) => { variant?: string; component?: string } | undefined
  salesOrderId: string
  /** Index of a line in the form's `units` array — the scroll-to-error id. */
  indexOf: (rowKey: string) => number
  onToggle: (unit: ReplacementRowUnit, on: boolean) => void
  onSetMany: (units: ReplacementRowUnit[], on: boolean) => void
  onPatch: (rowKey: string, patch: Partial<ReplacementUnitSelection>) => void
  onAddPart: (driId: string) => void
  onRemovePart: (rowKey: string) => void
  /** One patch onto several picked units at once (bulk bar). */
  onPatchMany: (driIds: string[], patch: Partial<ReplacementUnitSelection>) => void
}

/**
 * The delivered units of one sales order as a selectable table — ONE ROW PER
 * PHYSICAL UNIT (serial). Each ticked unit becomes exactly one line item; a
 * unit going back as "A different part" opens its Substitute + Rate in a slim
 * detail row beneath it. A bulk bar sets Send back / Issue reason on every
 * ticked unit at once.
 *
 * Same frame as the Sales / Purchase Return unit tables (search with ×, header
 * select-all, sticky header, inner scroll).
 */
export function ReplacementUnitTable({
  units,
  picks,
  extrasOf,
  errorsOf,
  salesOrderId,
  indexOf,
  onToggle,
  onSetMany,
  onPatch,
  onAddPart,
  onRemovePart,
  onPatchMany,
}: Props) {
  const C = T.columns
  const {
    search,
    setSearch,
    bulkReason,
    setBulkReason,
    visibleUnits,
    pickedKeys,
    pickable,
    anyPickable,
    allSelected,
    hintFor,
    toggleAll,
  } = useReplacementUnitTable({ units, picks, onSetMany })

  return (
    <div className="space-y-3">
      <ReplacementUnitTableToolbar
        search={search}
        onSearchChange={setSearch}
        visibleCount={visibleUnits.length}
        totalCount={units.length}
        selectedCount={pickedKeys.length}
      />

      {/* Bulk bar — shown from 2 ticked units. */}
      {pickedKeys.length > 1 && (
        <ReplacementUnitBulkBar
          pickedKeys={pickedKeys}
          bulkReason={bulkReason}
          onBulkReasonChange={setBulkReason}
          onPatchMany={onPatchMany}
        />
      )}

      {/* Inner-scroll past ~10 rows (§7.7). `[&>div]:overflow-visible`
          neutralises the shared Table's own wrapper so THIS box is the single
          scroll context and the sticky header pins to it. */}
      <div className="max-h-[32rem] overflow-y-auto rounded-lg border [&>div]:overflow-visible">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted [&_th]:bg-muted">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 pl-4">
                {anyPickable && (
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label={T.selectAllAria}
                  />
                )}
              </TableHead>
              <TableHead>{C.serial}</TableHead>
              <TableHead>{C.partVariant}</TableHead>
              <TableHead className="w-14 text-right">{C.qty}</TableHead>
              <TableHead className="w-48">{C.decision}</TableHead>
              <TableHead className="pr-4">{C.issueReason}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleUnits.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-8 text-center">
                  <Typography variant="body" tone="muted">
                    {T.noMatch}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              visibleUnits.map((unit) => (
                <ReplacementDeviceRows
                  key={unit.unitKey}
                  unit={unit}
                  pick={picks.get(unit.unitKey)}
                  extras={extrasOf(unit.unitKey)}
                  blocked={!pickable(unit)}
                  hint={hintFor(unit)}
                  salesOrderId={salesOrderId}
                  errorsOf={errorsOf}
                  indexOf={indexOf}
                  onToggle={(on) => onToggle(unit, on)}
                  onPatch={onPatch}
                  onAddPart={() => onAddPart(unit.unitKey)}
                  onRemovePart={onRemovePart}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
