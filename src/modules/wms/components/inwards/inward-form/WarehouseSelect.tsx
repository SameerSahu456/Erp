import { useMemo } from 'react'

import {
  AsyncSelect,
  type AsyncQueryShape,
  type AsyncSelectOption,
} from '@/components/ui/async-select'

import { useWarehouseFilterOptions } from '../../../hooks/warehouses/useWarehouses'
import { INWARDS_STRINGS } from '../inwards.strings'
import type { InwardForm } from './useInwardForm'

/** The options-hook shape AsyncSelect expects — either the server-paged
 *  infinite factory or a `makeStaticAsyncOptions` scoped list. */
export type WarehouseOptionsHook = (
  search: string,
  options?: { enabled?: boolean },
) => AsyncQueryShape<AsyncSelectOption>

/** Warehouse dropdown used by the return source box (and the retired
 *  manual-capture box). The picked NAME is passed in via `label` — persisted in
 *  the form state so it survives this field unmounting when the operator steps
 *  over to line items and back; the raw id is NEVER shown. `useOptions` lets the
 *  caller scope the list to the navbar global warehouse filter; omitted, it
 *  lists every active warehouse (server-paged, §16.11). */
export function WarehouseSelect({
  value,
  label,
  onChange,
  warehouses,
  useOptions,
  placeholder = INWARDS_STRINGS.warehouseSelect.placeholder,
}: {
  value: string
  /** Display label for the picked warehouse, persisted by the parent so it
   *  outlives this field's unmount (returning from the line-items step). */
  label?: string
  onChange: (id: string, label: string) => void
  warehouses: InwardForm['warehouses']
  /** Options source, already scoped to the global filter by the caller.
   *  Defaults to every active warehouse (server-paged). */
  useOptions?: WarehouseOptionsHook
  placeholder?: string
}) {
  const defaultUseOptions = useWarehouseFilterOptions()
  const optionsHook: WarehouseOptionsHook = useOptions ?? defaultUseOptions
  const fallbackLabel = useMemo(() => {
    const w = warehouses.find((x) => x.id === value)
    return w ? w.name : ''
  }, [warehouses, value])
  // Prefer the persisted label, then the pre-loaded page. Never the raw id — an
  // unresolved name renders blank, not a UUID.
  const display = label || fallbackLabel

  return (
    <AsyncSelect<AsyncSelectOption>
      value={value ? { id: value, label: display } : null}
      onValueChange={(opt) => onChange(opt?.id ?? '', opt?.label ?? '')}
      useOptions={optionsHook}
      toLabel={(w) => w.label}
      placeholder={placeholder}
      searchPlaceholder={INWARDS_STRINGS.warehouseSelect.searchPlaceholder}
      className="w-full"
      clearable={false}
      loadOnOpen
    />
  )
}
