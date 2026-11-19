import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { usePermission } from '@shared/rbac'

import { useMyWarehouses } from '../hooks/devices/useDevices'
import type { MyWarehouse } from '../api'
import { isUuid } from '@shared/lib/validation'

const STORAGE_KEY = 'wms:selectedWarehouseIds'

/** A pickable warehouse option in the navbar switcher — the minimal shape the
 *  picker needs (assignments carry more, all-warehouses fewer). */
export interface WarehouseOption {
  warehouse_id: string
  code: string
  name: string
}

/** Sentinel value for the explicit "All warehouses" row in the picker. An empty
 *  `selectedWarehouseIds` IS "all" (no filter); this is only the row's value. */
export const WAREHOUSE_SCOPE_ALL = '__all__'

interface WarehouseScopeValue {
  /** Warehouses the user is ASSIGNED to (empty for admins/superusers). This is
   *  the RBAC source — capability/stage gating reads it; do NOT swap it for the
   *  full list, or an admin-role user's stage gating would break. */
  warehouses: MyWarehouse[]
  /** The dropdown options for the navbar picker: assignments for a scoped
   *  user, or every active warehouse for a full-access user (who has none). */
  pickerWarehouses: WarehouseOption[]
  /** Superuser or admin/superadmin role — sees every warehouse, so the picker
   *  lists them all and defaults to "All warehouses" (never auto-scoped). */
  isFullAccess: boolean
  /** The warehouses currently in view. EMPTY = "all" (no filter; the backend
   *  still scopes a non-admin to their assignments). One or more = union of
   *  those warehouses' data. */
  selectedWarehouseIds: string[]
  setSelectedWarehouseIds: (ids: string[]) => void
  /** Back-compat single value for views not yet migrated to multi-select:
   *  exactly one selected → that id; zero or many → null (= all). */
  selectedWarehouseId: string | null
  /** Back-compat single setter — selects exactly one warehouse. */
  setSelectedWarehouseId: (id: string) => void
  /** True when the user has >=1 assignment → scope data. */
  hasScope: boolean
  /** Exactly one pickable warehouse → render a static label, not a dropdown. */
  isSingle: boolean
  isLoading: boolean
}

// Outside a provider (non-WMS pages) there is no scope: the picker
// hides and queries pass no warehouse filter (backend still scopes to access).
const NO_SCOPE: WarehouseScopeValue = {
  warehouses: [],
  pickerWarehouses: [],
  isFullAccess: false,
  selectedWarehouseIds: [],
  setSelectedWarehouseIds: () => {},
  selectedWarehouseId: null,
  setSelectedWarehouseId: () => {},
  hasScope: false,
  isSingle: false,
  isLoading: false,
}

const WarehouseScopeContext = createContext<WarehouseScopeValue | null>(null)

/** Parse the persisted selection — a JSON array of warehouse ids. */
function readStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/**
 * Holds the SET of warehouses the user is currently looking at. The list of
 * choices comes from `GET /wms/my-warehouses` for a scoped user (so it reflects
 * the backend RBAC), or every active warehouse for a full-access admin (who has
 * no assignments). The picked set is remembered in localStorage and validated
 * against the live list; an empty set means "all" (no warehouse filter).
 */
export function WarehouseScopeProvider({ children }: { children: ReactNode }) {
  const { isSuperuser, isAdminRole } = usePermission()
  const isFullAccess = isSuperuser || isAdminRole

  // RBAC source: a full-access user gets EVERY active warehouse here, a scoped
  // user gets only their assignments. Drives the selected-name label + the
  // stale-selection pruning below (NOT the picker's option list for a
  // full-access user — see pickerWarehouses).
  const { data, isLoading: myLoading } = useMyWarehouses()
  const warehouses = useMemo(() => data ?? [], [data])

  // Picker OPTIONS. A scoped user picks from their (small, already-loaded)
  // assignments. A full-access user picks from every active warehouse, which
  // the picker pages in 10-at-a-time on scroll (useWarehousePickerInfinite,
  // §16.11) — so we no longer eagerly fetch a capped 100 here. `warehouses`
  // still backs the label/pruning for both.
  const pickerWarehouses: WarehouseOption[] = warehouses
  const isLoading = myLoading

  const [stored, setStored] = useState<string[]>(readStored)

  const setSelectedWarehouseIds = useCallback((ids: string[]) => {
    setStored(ids)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    } catch {
      /* storage disabled — keep the in-memory choice only */
    }
  }, [])
  const setSelectedWarehouseId = useCallback(
    (id: string) => setSelectedWarehouseIds([id]),
    [setSelectedWarehouseIds],
  )

  // Keep stored ids still in the full RBAC set (empty = all). Before it loads, keep
  // them as-is so a reload does not collapse the scope and refetch twice.
  const selectedWarehouseIds = useMemo(() => {
    if (stored.length === 0) return []
    if (data === undefined) return stored.filter(isUuid)
    const valid = new Set(warehouses.map((w) => w.warehouse_id))
    return stored.filter((id) => valid.has(id))
  }, [stored, warehouses, data])

  // Back-compat single value — exactly one selected resolves to that id, else
  // null (= all). Views not yet migrated to multi-select read this.
  const selectedWarehouseId = useMemo(
    () => (selectedWarehouseIds.length === 1 ? selectedWarehouseIds[0] : null),
    [selectedWarehouseIds],
  )

  const value = useMemo<WarehouseScopeValue>(
    () => ({
      warehouses,
      pickerWarehouses,
      isFullAccess,
      selectedWarehouseIds,
      setSelectedWarehouseIds,
      selectedWarehouseId,
      setSelectedWarehouseId,
      hasScope: warehouses.length > 0,
      isSingle: pickerWarehouses.length === 1,
      isLoading,
    }),
    [
      warehouses,
      pickerWarehouses,
      isFullAccess,
      selectedWarehouseIds,
      setSelectedWarehouseIds,
      selectedWarehouseId,
      setSelectedWarehouseId,
      isLoading,
    ],
  )

  return <WarehouseScopeContext.Provider value={value}>{children}</WarehouseScopeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWarehouseScope(): WarehouseScopeValue {
  return useContext(WarehouseScopeContext) ?? NO_SCOPE
}
