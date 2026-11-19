import { useMemo } from "react"
import {
  DEVICE_STATUS_LABELS,
  useEngineersAcrossWarehousesOptions,
  useGrnBatches,
} from "@modules/wms"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AsyncSelect } from "@/components/ui/async-select"
import { TruncatedText } from "@/components/common/display/TruncatedText"
import { TableSearchInput } from "@/components/common/tables/TableSearchInput"
import { DateRangePicker, type DateRange } from "@/components/common/pickers/DateRangePicker"
import { parseDateParam, toDateParam } from "@shared/lib/date"
import { PAGINATION } from "@/shared/constants"

import type { PurchaseOrderItemView } from "../../api"
import { DETAIL_S } from "./po-detail-helpers"
import {
  EMPTY_PO_DEVICE_FILTERS,
  hasActiveBarFilters,
  poGrnParams,
  type PODeviceFilters,
} from "./po-receipts-query"

const F = DETAIL_S.devices.filters

/** Project-wide "no filter" sentinel — the Select wrapper shows a chevron, not
 *  a clear ×, while a dropdown sits on it. */
const ALL = "__all__"
// Every control starts at the date filter's 248px and grows or shrinks with the
// row, so the bar spans its full width with equal-width controls. `w-auto`
// replaces the pickers' built-in `w-full`: the module toolbar CSS (comprint.css)
// resizes `.w-full` children, which squeezed their labels to nothing.
const CONTROL_CLASS = "h-9 w-auto min-w-32 grow shrink basis-62"

/** Statuses a PO's received unit can realistically be in — including the
 *  vendor-return custody states, which matter most on a PO. Labels come from
 *  DEVICE_STATUS_LABELS so they match the badge in the row. */
const STATUS_VALUES = [
  "available",
  "in_operations",
  "reserved",
  "issued",
  "damaged",
  "scrapped",
  "disposed",
  "pending_return",
  "returned_to_vendor",
] as const

interface Option {
  value: string
  label: string
}

/** One filter dropdown with an "All …" first entry. The trigger renders the
 *  option's label (never the raw id) and clears back to "All". */
function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
}: {
  value: string
  onChange: (next: string) => void
  allLabel: string
  options: readonly Option[]
}) {
  const selected = options.find((o) => o.value === value)
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(!v || v === ALL ? "" : v)}>
      <SelectTrigger
        className={CONTROL_CLASS}
        aria-label={allLabel}
        clearable={!!value}
        onClear={() => onChange("")}
      >
        <SelectValue>
          {/* A long picked label ellipsizes in the button; full text on hover. */}
          <TruncatedText value={selected?.label ?? allLabel} className="max-w-full" />
        </SelectValue>
      </SelectTrigger>
      {/* As on the list pages: the list grows to its longest option (GRN numbers,
          part names) instead of clamping to the button, with no tick crowding it. */}
      <SelectContent className="w-auto min-w-(--anchor-width) max-w-[300px]">
        <SelectItem value={ALL} hideIndicator>
          {allLabel}
        </SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} hideIndicator>
            <TruncatedText value={o.label} className="max-w-[17rem]" />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** One option per distinct catalog variant on the PO (free-text lines carry
 *  no variant and can't be matched to a device, so they're skipped). */
function lineItemOptions(items: readonly PurchaseOrderItemView[]): Option[] {
  const seen = new Map<string, Option>()
  for (const it of items) {
    if (!it.part_variant_id || seen.has(it.part_variant_id)) continue
    const name = it.variant_name ?? it.part_name ?? it.description ?? ""
    const label = [it.part_number, name].filter(Boolean).join(" · ")
    seen.set(it.part_variant_id, { value: it.part_variant_id, label: label || it.part_variant_id })
  }
  return [...seen.values()]
}

const STATUS_OPTIONS: Option[] = STATUS_VALUES.map((value) => ({
  value,
  label: DEVICE_STATUS_LABELS[value] ?? value,
}))

/** Engineers who can work this PO's devices — the team of the PO's receiving
 *  warehouse, server-searched + infinite (§16.11). */
function EngineerFilter({
  warehouseIds,
  value,
  onChange,
}: {
  warehouseIds: string[]
  value: PODeviceFilters
  onChange: (patch: Partial<PODeviceFilters>) => void
}) {
  const useOptions = useEngineersAcrossWarehousesOptions(warehouseIds, [])
  return (
    <AsyncSelect<{ id: string; label: string; email: string }>
      value={value.engineerId ? { id: value.engineerId, label: value.engineerName } : null}
      onValueChange={(opt) =>
        onChange({ engineerId: opt?.id ?? "", engineerName: opt?.label ?? "" })
      }
      useOptions={useOptions}
      toLabel={(e) => e.label}
      placeholder={F.allEngineers}
      searchPlaceholder={F.searchEngineer}
      // `text-foreground` last so "All engineers" reads dark like the dropdowns beside it.
      className={cn(CONTROL_CLASS, "text-foreground")}
      clearable
      chevron="down"
      loadOnOpen
    />
  )
}

function toRange(f: PODeviceFilters): DateRange | undefined {
  const from = parseDateParam(f.fromDate)
  const to = parseDateParam(f.toDate)
  return from || to ? { from, to } : undefined
}

/** Filter bar for the PO detail Devices tab. Every option list is scoped to
 *  THIS PO: its GRNs, its line items, its warehouse's engineers — never the
 *  whole catalog. The stage is picked by the quick tabs, not here. */
export function PODevicesFilters({
  poId,
  lineItems,
  warehouseId,
  canSeeGrns,
  canPickEngineer,
  value,
  onChange,
}: {
  poId: string
  lineItems: readonly PurchaseOrderItemView[]
  /** The PO's receiving warehouse — scopes the engineer list. */
  warehouseId: string | null
  /** GRN filter needs wms:inward_* (the GRN list 403s without it). */
  canSeeGrns: boolean
  /** Engineer filter needs wms:team_* (the team list 403s without it). */
  canPickEngineer: boolean
  value: PODeviceFilters
  onChange: (next: PODeviceFilters) => void
}) {
  // A PO's GRNs are a short, bounded list — one max-size page covers it.
  const grns = useGrnBatches(
    { ...poGrnParams(poId), page_size: PAGINATION.MAX_PAGE_SIZE },
    { enabled: canSeeGrns },
  )
  const grnOptions = useMemo<Option[]>(
    () =>
      (grns.data?.items ?? [])
        .filter((g) => g.status !== "cancelled")
        .map((g) => ({ value: g.id, label: g.grn_number })),
    [grns.data],
  )
  const variantOptions = useMemo(() => lineItemOptions(lineItems), [lineItems])

  const set = (patch: Partial<PODeviceFilters>) => onChange({ ...value, ...patch })

  return (
    // The list-page toolbar band (`cpt-table-toolbar`), so it reads like every list.
    <div className="cpt-table-toolbar">
      <TableSearchInput
        value={value.search}
        onChange={(search) => set({ search })}
        placeholder={F.searchPlaceholder}
        clearAriaLabel={F.clearSearch}
        // Same as the list toolbars: the module CSS caps the search at 20rem.
        className="min-w-0 flex-1"
      />
      {canSeeGrns && (
        <FilterSelect
          value={value.grnId}
          onChange={(grnId) => set({ grnId })}
          allLabel={F.allGrns}
          options={grnOptions}
        />
      )}
      {variantOptions.length > 0 && (
        <FilterSelect
          value={value.variantId}
          onChange={(variantId) => set({ variantId })}
          allLabel={F.allLineItems}
          options={variantOptions}
        />
      )}
      <FilterSelect
        value={value.status}
        onChange={(status) => set({ status })}
        allLabel={F.allStatuses}
        options={STATUS_OPTIONS}
      />
      {canPickEngineer && (
        <EngineerFilter
          warehouseIds={warehouseId ? [warehouseId] : []}
          value={value}
          onChange={set}
        />
      )}
      <DateRangePicker
        value={toRange(value)}
        onChange={(r) =>
          set({
            fromDate: r?.from ? toDateParam(r.from) : "",
            toDate: r?.to ? toDateParam(r.to) : "",
          })
        }
        placeholder={F.receivedDate}
        clearable
        // A touch wider so "Received date" never ellipsizes.
        className={cn(CONTROL_CLASS, "min-w-36")}
      />
    </div>
  )
}

/** Clears the filter bar only — the stage tab the user is on stays put. Sits at
 *  the end of the stage-tab row so the filter bar keeps to one line. */
export function PODevicesClearFilters({
  value,
  onChange,
}: {
  value: PODeviceFilters
  onChange: (next: PODeviceFilters) => void
}) {
  if (!hasActiveBarFilters(value)) return null
  return (
    <Button
      variant="ghost"
      size="sm"
      className="ml-auto self-center"
      onClick={() => onChange({ ...EMPTY_PO_DEVICE_FILTERS, stage: value.stage })}
    >
      {F.clear}
    </Button>
  )
}
