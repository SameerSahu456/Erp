/**
 * Where the work is, and which stage of it.
 *
 * Both narrow everything downstream — the GRN list, the parts, the engineer
 * pool — so changing either has to clear what it invalidated. That reset lives
 * in the parent, which owns the state; this component only reports the change.
 */
import { useMemo } from 'react'

import { AsyncSelect, makeStaticAsyncOptions } from '@/components/ui/async-select'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { WorkAssignmentStage } from '../../api/work-assignments'
import { useWorkAssignmentStages } from '../../hooks/work-assignments/useWorkAssignments'

import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

// The stage list is FETCHED, not hardcoded (unification spec U8). It used to
// live here, in the label map, and in EngineerAssignSelect's union — three
// copies to keep in step. It now comes from the backend's stage registry, so a
// new stage reaches this dropdown with no frontend change at all.

interface WarehouseOption {
  warehouse_id: string
  code: string
  name: string
}

/** `{id,label}` row the warehouse AsyncSelect renders + searches on. */
interface WarehouseRow {
  id: string
  label: string
}

interface IssueStepScopeProps {
  warehouses: WarehouseOption[]
  warehouseId: string | null
  onWarehouseChange: (warehouseId: string) => void
  /** Empty until the operator picks — the form no longer defaults to Inspection. */
  stage: WorkAssignmentStage | ''
  onStageChange: (stage: WorkAssignmentStage) => void
}

export function IssueStepScope({
  warehouses,
  warehouseId,
  onWarehouseChange,
  stage,
  onStageChange,
}: IssueStepScopeProps) {
  const stagesQuery = useWorkAssignmentStages()
  const stages = useMemo(() => stagesQuery.data ?? [], [stagesQuery.data])
  const stageLabel = (key: string) => stages.find((o) => o.key === key)?.label ?? key

  const selected = warehouses.find((w) => w.warehouse_id === warehouseId)
  const warehouseLabel = (w: WarehouseOption) => `${w.code} — ${w.name}`

  // §16.11 — an API-backed list is the app-standard AsyncSelect, not a plain
  // Select. The list is already fetched, so makeStaticAsyncOptions gives it the
  // searchable dropdown UI without another round-trip; rebuilt when the list
  // changes so it never serves the empty pre-load array.
  const useWarehouseOptions = useMemo(
    () =>
      makeStaticAsyncOptions<WarehouseRow>(
        warehouses.map((w) => ({ id: w.warehouse_id, label: warehouseLabel(w) })),
        (o) => o.label,
      ),
    [warehouses],
  )

  // Two fields to a row, each filling its cell (§3.2). No card of its own — the
  // whole form lives in one box.
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wa-warehouse" required>
          {S.issue.stepWarehouse}
        </Label>
        <AsyncSelect<WarehouseRow>
          id="wa-warehouse"
          value={selected ? { id: selected.warehouse_id, label: warehouseLabel(selected) } : null}
          onValueChange={(opt) => opt && onWarehouseChange(opt.id)}
          useOptions={useWarehouseOptions}
          toLabel={(o) => o.label}
          placeholder={S.issue.warehousePlaceholder}
          searchPlaceholder={S.issue.warehousePlaceholder}
          clearable={false}
          className="w-full"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wa-stage" required>
          {S.issue.stepStage}
        </Label>
        {/* A small fixed enum — a plain dropdown, not a searchable picker.
            No default: starts empty on a muted placeholder so the operator
            chooses the stage. `clearable={false}` keeps the trigger to the
            chevron only — a required field is switched between values, never
            cleared back to empty via an ×. */}
        <Select
          value={stage || undefined}
          onValueChange={(value) => value && onStageChange(value as WorkAssignmentStage)}
        >
          <SelectTrigger id="wa-stage" className="w-full" clearable={false}>
            <SelectValue placeholder={S.issue.stagePlaceholder}>
              {stage ? stageLabel(stage) : S.issue.stagePlaceholder}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {stages.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

    </div>
  )
}
