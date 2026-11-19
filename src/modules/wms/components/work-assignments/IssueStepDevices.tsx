/**
 * The devices themselves — take a count, or tick the exact machines.
 *
 * This is the second half of spec D21, which was decided at the start and never
 * built: *"one picker, quantity-first by default, per-row selection always
 * available — no mode switch."* Until now only the quantity half existed, so an
 * operator could say "give Ravi 40" but never "give Ravi THESE two", and could
 * not see which machines a count was about to hand over.
 *
 * **The mode is explicit, not inferred.** The quantity box is the default and
 * takes the first N rows (count mode); touching any checkbox switches the
 * submission to exactly the ticked set (manual mode), and editing the quantity
 * box switches back. D21 rejected a mode *guessed from the data* — that guesses
 * wrong on the mixed pallet, which is what a real container is. This mode is
 * driven by the last control the operator touched instead, so an empty manual
 * selection is a real zero (the operator can deselect every row) rather than a
 * silent fall-back to the count.
 *
 * The rows shown are the ones a count would take, in the same order the server
 * returns them — (source_grn_batch_id, internal_serial), which is what keeps a
 * quantity-first take inside one receipt (U11). So the preview is the truth,
 * not an approximation of it.
 */
import { memo, useEffect, useState } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Typography } from '@/components/ui/typography'
import { TableSearchInput } from '@/components/common/tables/TableSearchInput'
import { useDebounce } from '@/shared/hooks'
import { UI } from '@/shared/constants'

import type { EligibleDevice } from '../../api/work-assignments'

import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

/**
 * The device search box. It owns its own keystroke state and only
 * pushes the DEBOUNCED term up via `onCommittedChange` — so typing re-renders
 * this box alone, never the issue wizard or the (up-to-200-row) device table,
 * which re-render only when the settled query result changes. `committed` is the
 * value the parent currently queries with; when the parent clears it on a scope
 * change we adopt that reset, while ignoring the echo of a value we just pushed
 * (which equals our own debounced value). Built on the shared TableSearchInput.
 */
const DeviceSearchBox = memo(function DeviceSearchBox({
  committed,
  onCommittedChange,
  placeholder,
}: {
  committed: string
  onCommittedChange: (value: string) => void
  placeholder: string
}) {
  const [text, setText] = useState(committed)
  const debounced = useDebounce(text.trim(), UI.DEBOUNCE_SEARCH_MS)

  // Adopt an EXTERNAL reset of `committed` (a scope change clears it) — but not
  // the echo of a value we pushed, which equals the current debounced term.
  const [prevCommitted, setPrevCommitted] = useState(committed)
  if (committed !== prevCommitted) {
    setPrevCommitted(committed)
    if (committed !== debounced) setText(committed)
  }

  // Only the settled term reaches the parent's query. Pushing the same value is
  // a no-op upstream, so no loop.
  useEffect(() => {
    onCommittedChange(debounced)
  }, [debounced, onCommittedChange])

  return (
    <TableSearchInput
      value={text}
      onChange={setText}
      placeholder={placeholder}
      className="min-w-0 max-w-sm"
    />
  )
})

interface IssueStepDevicesProps {
  devices: EligibleDevice[]
  /** The explicit selection in manual mode — honoured verbatim (empty = zero). */
  selectedOpIds: string[]
  /** Any checkbox change; tells the parent to switch to manual mode. */
  onSelectionChange: (operationIds: string[]) => void
  /** True once the operator drives the selection by checkbox; false while the
   *  quantity box decides. Count mode shows the first `takeCount` rows ticked;
   *  manual mode shows exactly `selectedOpIds`. */
  manualSelection: boolean
  /** How many the count would take — used to shade the rows it covers. */
  takeCount: number
  isLoading: boolean
  /** Server-side device search box. */
  searchValue: string
  onSearchChange: (value: string) => void
}

function deviceLabel(device: EligibleDevice): string {
  // Consecutive duplicates dropped: part_number and variant name are the same
  // string on most live rows, and repeating it wastes the width.
  const out: string[] = []
  for (const segment of [device.oem_name, device.part_number, device.variant_name]) {
    if (segment && out[out.length - 1] !== segment) out.push(segment)
  }
  return out.join('/')
}

export function IssueStepDevices({
  devices,
  selectedOpIds,
  onSelectionChange,
  manualSelection,
  takeCount,
  isLoading,
  searchValue,
  onSearchChange,
}: IssueStepDevicesProps) {
  // The set that's actually ticked. In manual mode it's the operator's explicit
  // selection, honoured verbatim so an empty set stays empty (deselect-all
  // reaches zero). In count mode it's the first `takeCount` rows the quantity
  // takes, so typing "How many" ticks those rows directly instead of only
  // shading them. Derived during render, so it's right regardless of when
  // devices load.
  const effective = manualSelection
    ? new Set(selectedOpIds)
    : new Set(devices.slice(0, takeCount).map((d) => d.operation_id))

  // Toggling in count mode MATERIALISES the count's rows first, then flips the
  // clicked one — so the visible ticks don't vanish when the operator adjusts.
  const toggle = (operationId: string) => {
    const next = new Set(effective)
    if (next.has(operationId)) next.delete(operationId)
    else next.add(operationId)
    onSelectionChange([...next])
  }

  const allShownSelected = devices.length > 0 && devices.every((d) => effective.has(d.operation_id))
  // Header tick acts on the SHOWN rows only. Under a search, ticks made on other
  // result sets are kept — a search narrows the view, never the selection.
  const toggleAll = () => {
    const next = new Set(effective)
    for (const d of devices) {
      if (allShownSelected) next.delete(d.operation_id)
      else next.add(d.operation_id)
    }
    onSelectionChange([...next])
  }

  const hasSearch = searchValue.trim().length > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Typography variant="caption" tone="muted">
          {S.devices.title}
        </Typography>
        <Typography variant="helper" tone="muted">
          {manualSelection ? S.devices.hintSelected(effective.size) : S.devices.hintCount(takeCount)}
        </Typography>
      </div>

      {/* Server-side device search. Self-contained so typing does
          not re-render the wizard; stays mounted through the empty state so the
          operator can edit a query that matched nothing. */}
      <DeviceSearchBox
        committed={searchValue}
        onCommittedChange={onSearchChange}
        placeholder={S.devices.searchPlaceholder}
      />

      {isLoading && (
        <Typography variant="helper" tone="muted">
          {S.devices.loading}
        </Typography>
      )}
      {!isLoading && devices.length === 0 && (
        <Typography variant="helper" tone="muted">
          {hasSearch ? S.devices.noMatch : S.devices.empty}
        </Typography>
      )}
      {!isLoading && !(devices.length === 0) && (
        /* The ONE place a horizontal scroller is legitimate (§8.7): a data table
           the operator pans, not a layout blow-out. */
        <div className="max-h-80 overflow-y-auto rounded-md border">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allShownSelected}
                  onCheckedChange={toggleAll}
                  aria-label={S.devices.selectAll}
                />
              </TableHead>
              <TableHead>{S.devices.serial}</TableHead>
              <TableHead>{S.devices.grn}</TableHead>
              <TableHead>{S.devices.category}</TableHead>
              <TableHead>{S.devices.part}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((device) => {
              // Ticked when explicitly selected OR covered by the count — the
              // checkbox now shows the same set the row highlight does.
              const isSelected = effective.has(device.operation_id)
              return (
                <TableRow
                  key={device.operation_id}
                  data-state={isSelected ? 'selected' : undefined}
                  className="cursor-pointer"
                  onClick={() => toggle(device.operation_id)}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggle(device.operation_id)}
                      aria-label={device.internal_serial}
                    />
                  </TableCell>
                  <TableCell className="font-mono">{device.internal_serial}</TableCell>
                  {/* GRN per row so an "All GRNs" selection is not an
                      indistinguishable mix. */}
                  <TableCell className="min-w-0">
                    <span className="block truncate font-mono">{device.grn_number ?? '—'}</span>
                  </TableCell>
                  <TableCell className="min-w-0">
                    <span className="block truncate">{device.category_name ?? '—'}</span>
                  </TableCell>
                  <TableCell className="min-w-0">
                    <span className="block truncate">{deviceLabel(device) || '—'}</span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
      )}
    </div>
  )
}
