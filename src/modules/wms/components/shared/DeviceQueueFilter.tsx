import type { ReactElement } from 'react'

import { CategoryPicker } from '@/components/common/pickers/CategoryPicker'
import { AsyncSelect, makeStaticAsyncOptions } from '@/components/ui/async-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Typography } from '@/components/ui/typography'
import { useVariantsByIds, useVariantsListInfinite, type VariantListItem, partOptionDescription } from '@modules/ims'
import { useUsersByIds } from '@modules/users'

import {
  DEVICE_QUEUE_FILTER,
  type DeviceQueueFilterKind,
} from '../../hooks/devices/useDeviceQueueControls'
import { useGrnBatch, useGrnBatchOptions } from '../../hooks/inwards/useInwards'
import { QC_GRADE_OPTIONS } from '../../hooks/qc/useQcComplete'
import { useEngineersAcrossWarehousesOptions } from '../../hooks/warehouses/useWarehouseTeam'
import { DEVICE_WORKFLOW_STATUSES } from '../../constants/device-workflow-status'
import { DEVICE_STATUS_LABELS, WORKFLOW_LABELS } from '../devices/deviceLabels'
import { DEVICE_QUEUE_FILTER_STRINGS as S } from './device-queue-filter.strings'

type FilterControlProps = {
  value: string | undefined
  onChange: (next: string) => void
}

type DeviceQueueFilterProps = FilterControlProps & {
  kind: DeviceQueueFilterKind
  /** Warehouse scope for the engineer + batch option lists (server-searched,
   *  infinite — §16.11). Pass `[]` to leave them unscoped. */
  warehouseIds?: string[]
  /** Engineer name from the rows, skipping the by-id lookup (which 403s for some roles). */
  engineerNameHint?: string
}

const { ALL, SLOT_CLASS, CONTROL_CLASS } = DEVICE_QUEUE_FILTER

/** Label for a selected value: its name, an ellipsis while it resolves, a
 *  generic fallback if it can't — never the raw id. */
const selectedLabel = (name: string | undefined, loading: boolean, fallback: string) =>
  name || (loading ? S.selected.resolving : fallback)

function FilterSlot({ children }: { children: ReactElement }) {
  return (
    <div className={SLOT_CLASS}>
      <Typography variant="body-sm" asChild>
        {children}
      </Typography>
    </div>
  )
}

function CategoryFilter({ value, onChange }: FilterControlProps) {
  return (
    <FilterSlot>
      <CategoryPicker
        value={value ?? ''}
        onChange={(id) => onChange(id || ALL)}
        placeholder={S.placeholders.allCategories}
        allowAll
        shape="short"
        isActive
        className={CONTROL_CLASS}
      />
    </FilterSlot>
  )
}

/** `stock_items.status` values for a device that is out of the pipeline —
 *  every DB CHECK value except `installed` and `missing` (component states: a
 *  component never lists as a device, CP-569 / inward-verification D5) and `pending_return` / `returned_to_vendor`
 *  (offered once, as stages). Labels come from the same maps as the row badge. */
const STOCK_STATUS_FILTER_VALUES = [
  'available',
  'in_operations',
  'reserved',
  'issued',
  'dispatched',
  'in_transit',
  'consumed',
  'damaged',
  'scrapped',
  'disposed',
  'dismantled',
  'lost_in_transit',
] as const

const statusLabel = (v: string) =>
  v === DEVICE_QUEUE_FILTER.UNCHECKED_COMPONENTS
    ? S.placeholders.uncheckedComponents
    : (WORKFLOW_LABELS[v] ?? DEVICE_STATUS_LABELS[v] ?? v)

// Stages first (pipeline order), then stock statuses — searched by label. Last,
// not a status at all: devices whose components still wait to be checked (D8),
// offered here because its badge shows in the Status column.
const STATUS_OPTIONS = [
  ...DEVICE_WORKFLOW_STATUSES,
  ...STOCK_STATUS_FILTER_VALUES,
  DEVICE_QUEUE_FILTER.UNCHECKED_COMPONENTS,
].map((v) => ({ id: v, label: statusLabel(v) }))
const useStatusOptions = makeStaticAsyncOptions(STATUS_OPTIONS, (o) => o.label)

/** The Status column's filter: a pipeline stage or a stock status — every value
 *  the column's badge can show. Searchable, like the other toolbar filters. */
function DeviceStatusFilter({ value, onChange }: FilterControlProps) {
  return (
    <FilterSlot>
      <AsyncSelect<{ id: string; label: string }>
        value={value && value !== ALL ? { id: value, label: statusLabel(value) } : null}
        onValueChange={(opt) => onChange(opt?.id ?? ALL)}
        useOptions={useStatusOptions}
        toLabel={(o) => o.label}
        placeholder={S.placeholders.allStatuses}
        searchPlaceholder={S.placeholders.searchStatus}
        className={CONTROL_CLASS}
        clearable
        chevron="down"
      />
    </FilterSlot>
  )
}

/** QC pass grade (A/B) — the grade the engineer gave at the newest QC. */
function GradeFilter({ value, onChange }: FilterControlProps) {
  return (
    <FilterSlot>
      <Select value={value || ALL} onValueChange={(v) => onChange(v ?? ALL)}>
        <SelectTrigger className={CONTROL_CLASS} aria-label={S.placeholders.allGrades}>
          <SelectValue placeholder={S.placeholders.allGrades}>
            {value && value !== ALL ? S.gradeOption(value) : S.placeholders.allGrades}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{S.placeholders.allGrades}</SelectItem>
          {QC_GRADE_OPTIONS.map((g) => (
            <SelectItem key={g} value={g}>
              {S.gradeOption(g)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterSlot>
  )
}

function EngineerFilter({
  value,
  onChange,
  warehouseIds,
  nameHint,
}: FilterControlProps & { warehouseIds: string[]; nameHint?: string }) {
  // Any engineer across the scoped warehouses (no capability filter — dynamic
  // assignment means any engineer may now hold the stage).
  const useOptions = useEngineersAcrossWarehousesOptions(warehouseIds, [])
  const lookup = useUsersByIds(value && !nameHint ? [value] : [])
  const name = nameHint || (value ? lookup.displayNameById[value] : undefined)
  return (
    <FilterSlot>
      <AsyncSelect<{ id: string; label: string; email: string }>
        value={value ? { id: value, label: selectedLabel(name, lookup.isLoading, S.selected.engineer) } : null}
        onValueChange={(opt) => onChange(opt?.id ?? ALL)}
        useOptions={useOptions}
        toLabel={(e) => e.label}
        placeholder={S.placeholders.allEngineers}
        searchPlaceholder={S.placeholders.searchEngineer}
        className={CONTROL_CLASS}
        clearable
        chevron="down"
        loadOnOpen
      />
    </FilterSlot>
  )
}

function BatchFilter({
  value,
  onChange,
  warehouseIds,
}: FilterControlProps & { warehouseIds: string[] }) {
  // Only FINALISED (closed) GRNs — a draft/cancelled batch has no devices.
  const useOptions = useGrnBatchOptions(warehouseIds)
  // The picked batch may be off the loaded pages — resolve its label by id.
  const lookup = useGrnBatch(value ?? '')
  return (
    <FilterSlot>
      <AsyncSelect
        value={
          value
            ? {
                id: value,
                label: selectedLabel(lookup.data?.grn_number, lookup.isLoading, S.selected.batch),
              }
            : null
        }
        onValueChange={(opt) => onChange(opt?.id ?? ALL)}
        useOptions={useOptions}
        toLabel={(b) => b.label}
        placeholder={S.placeholders.allBatches}
        searchPlaceholder={S.placeholders.searchBatch}
        className={CONTROL_CLASS}
        clearable
        chevron="down"
        loadOnOpen
      />
    </FilterSlot>
  )
}

function VariantFilter({ value, onChange }: FilterControlProps) {
  // Options come from the catalog, not the queue's rows — so another active
  // filter never narrows or empties the variant list.
  const [lookup] = useVariantsByIds(value ? [value] : [])
  return (
    <FilterSlot>
      <AsyncSelect<VariantListItem>
        value={
          value
            ? {
                id: value,
                label: selectedLabel(lookup?.data?.name, lookup?.isLoading ?? false, S.selected.variant),
              }
            : null
        }
        onValueChange={(opt) => onChange(opt?.id ?? ALL)}
        useOptions={useVariantsListInfinite}
        toLabel={(v) => v.display_title || `${v.part_number} · ${v.name}`}
        getDescription={partOptionDescription}
        placeholder={S.placeholders.allVariants}
        searchPlaceholder={S.placeholders.searchVariant}
        className={CONTROL_CLASS}
        clearable
        chevron="down"
      />
    </FilterSlot>
  )
}

/** One device-queue filter for a BMT `renderFilter` slot; pair with `filterKindFor(column.key)`.
 *  Options are server-searched + infinite (§16.11). */
export function DeviceQueueFilter({
  kind,
  value,
  onChange,
  warehouseIds = [],
  engineerNameHint,
}: DeviceQueueFilterProps) {
  switch (kind) {
    case 'category':
      return <CategoryFilter value={value} onChange={onChange} />
    case 'engineer':
      return (
        <EngineerFilter
          value={value}
          onChange={onChange}
          warehouseIds={warehouseIds}
          nameHint={engineerNameHint}
        />
      )
    case 'batch':
      return <BatchFilter value={value} onChange={onChange} warehouseIds={warehouseIds} />
    case 'variant':
      return <VariantFilter value={value} onChange={onChange} />
    case 'deviceStatus':
      return <DeviceStatusFilter value={value} onChange={onChange} />
    case 'grade':
      return <GradeFilter value={value} onChange={onChange} />
  }
}
