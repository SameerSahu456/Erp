import { useMemo, useState } from 'react'

import type { ToolbarFilter } from '@/components/common/tables/BusinessMetricsTable'
import { PAGINATION } from '@shared/constants/pagination'
import { UI } from '@shared/constants/ui'
import { useDebounce } from '@shared/hooks'
import { formatIndiaPhone } from '@shared/lib/validation'
import { usePermission } from '@shared/rbac'

import { useServiceVendors, useServiceVendorsSearch } from './useServiceVendors'
import { useServiceSections } from './useServiceSections'
import type { ServiceVendor, ServiceVendorListParams } from '../../api/service-jobs'
import { wmsPermissions } from '../../permissions'
import { SERVICE_VENDORS_STRINGS as S } from '../../components/vendor-jobs/service-vendors.strings'

/** §16.6 — one page-size per page, derived from the global default. */
const SERVICE_VENDORS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

/** Table column key → the server's `sort` field; other columns have no stable server order. */
const SORT_FIELD: Record<string, 'vendor_name' | 'section'> = {
  vendor: 'vendor_name',
  section: 'section',
}

type SortDirection = 'asc' | 'desc' | null

function toSortParam(
  column: string | null,
  direction: SortDirection,
): ServiceVendorListParams['sort'] {
  // Unsorted → most recently UPDATED first (§1/§7.3). Cast: the generated sort
  // type hasn't been regenerated to list `-updated_at` yet.
  if (!column || !direction) return '-updated_at' as ServiceVendorListParams['sort']
  const field = SORT_FIELD[column] ?? 'vendor_name'
  return (direction === 'desc' ? `-${field}` : field) as ServiceVendorListParams['sort']
}

function toIsActive(statusFilter: '' | 'active' | 'inactive'): boolean | undefined {
  if (statusFilter === 'active') return true
  if (statusFilter === 'inactive') return false
  return undefined
}

const COLUMNS = [
  { key: 'section', label: S.columns.section, sortable: true },
  { key: 'vendor', label: S.columns.vendor, sortable: true },
  { key: 'contact', label: S.columns.contact },
  { key: 'type', label: S.columns.type },
  { key: 'notes', label: S.columns.notes },
  { key: 'isDefault', label: S.columns.isDefault },
  { key: 'active', label: S.columns.active },
]

function toRow(v: ServiceVendor) {
  return {
    id: v.id,
    // Section NAME; the code is a fallback until the backend field lands (CP-509 #3).
    section: v.section_name ?? v.section_code,
    vendor: v.vendor_name ?? '—',
    contact: v.vendor_contact_number ? formatIndiaPhone(v.vendor_contact_number) : '—',
    type: v.vendor_type === 'internal' ? S.types.internal : S.types.external,
    notes: v.notes?.trim() ? v.notes : '—',
    // Plain Yes/No — one (section, vendor) row, so this IS "default for this section" (CP-509 #9).
    isDefault: v.is_default ? S.yesNo.yes : S.yesNo.no,
    active: v.is_active ? S.active.yes : S.active.no,
  }
}

/** Section / vendor filter options for the toolbar. */
function useServiceVendorFilterOptions() {
  // Vendors with an ACTIVE service row only (CP-509 #4; CP-612), from the picker
  // array — a bounded set, not every procurement vendor.
  const { data: allRows = [] } = useServiceVendors(undefined, false)
  const vendorOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const v of allRows) {
      if (!seen.has(v.vendor_id)) seen.set(v.vendor_id, v.vendor_name ?? v.vendor_id)
    }
    return [...seen].map(([value, label]) => ({ value, label }))
  }, [allRows])

  // Every service section (CP-609); the value is the CODE the list `section` param expects.
  const { data: sections = [] } = useServiceSections()
  const sectionOptions = useMemo(
    () => sections.map((s) => ({ value: s.code, label: s.name })),
    [sections],
  )
  return { vendorOptions, sectionOptions }
}

/** Service-vendor master list: server search/sort/filters/paging + the dialog target. */
export function useServiceVendorsList() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  // Status filter: '' = all, 'active' | 'inactive' narrow the table.
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('')
  // Vendor filter: '' = all, else a vendor id (CP-509 #4).
  const [vendorFilter, setVendorFilter] = useState('')
  // Section filter: '' = all, else a section CODE (CP-609).
  const [sectionFilter, setSectionFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceVendor | null>(null)
  // Bumped on every open so the dialog REMOUNTS fresh; reusing the instance
  // blanked the vendor field on reopen (CP-509 #7a).
  const [dialogNonce, setDialogNonce] = useState(0)
  const canManage = usePermission().can(wmsPermissions.SERVICE_VENDOR_MANAGE)

  const [pageSize, setPageSize] = useState<number>(SERVICE_VENDORS_PAGE_SIZE)
  // Debounce so each keystroke doesn't refetch; cap to the backend search limit.
  const trimmedSearch = search.trim().slice(0, 50)
  const debouncedSearch = useDebounce(trimmedSearch, UI.DEBOUNCE_SEARCH_MS)
  const effectiveSearch = trimmedSearch ? debouncedSearch : ''

  const listParams = useMemo<ServiceVendorListParams>(
    () => ({
      search: effectiveSearch || undefined,
      // Admin master: show inactive too, badged in the Active column.
      include_inactive: true,
      // Status filter narrows to one state when set; omit = all.
      is_active: toIsActive(statusFilter),
      vendor_id: vendorFilter || undefined,
      section: sectionFilter || undefined,
      sort: toSortParam(sortColumn, sortDirection),
      page,
      page_size: pageSize,
    }),
    [effectiveSearch, statusFilter, vendorFilter, sectionFilter, sortColumn, sortDirection, page, pageSize],
  )

  const { vendorOptions, sectionOptions } = useServiceVendorFilterOptions()
  const toolbarFilters: ToolbarFilter[] = [
    { key: 'section', label: S.sectionFilterLabel, allLabel: S.sectionFilterAll, value: sectionFilter, options: sectionOptions },
    { key: 'vendor', label: S.vendorFilterLabel, allLabel: S.vendorFilterAll, value: vendorFilter, options: vendorOptions },
    {
      key: 'status',
      label: S.statusFilterLabel,
      allLabel: S.statusFilterAll,
      value: statusFilter,
      options: [
        { value: 'active', label: S.statusActive },
        { value: 'inactive', label: S.statusInactive },
      ],
    },
  ]
  const { data, isFetching, isError, refetch } = useServiceVendorsSearch(listParams)
  const items = useMemo(() => data?.items ?? [], [data])

  const openDialog = (row: ServiceVendor | null) => {
    setEditing(row)
    setDialogNonce((n) => n + 1)
    setDialogOpen(true)
  }

  const rows = useMemo(() => items.map(toRow), [items])

  // One tab; its count is the SERVER total so it tracks the search (§7).
  const tabs = useMemo(
    () => [{ id: 'all', label: S.tabs.all, columns: COLUMNS, data: rows, count: data?.total ?? 0 }],
    [rows, data],
  )

  const changeToolbarFilter = (key: string, value: string) => {
    if (key === 'status') {
      setStatusFilter(value === 'active' || value === 'inactive' ? value : '')
      setPage(1)
    } else if (key === 'vendor') {
      setVendorFilter(value)
      setPage(1)
    } else if (key === 'section') {
      setSectionFilter(value)
      setPage(1)
    }
  }

  // Empty-state "Clear filters" resets every toolbar facet + page (§1).
  const clearFilters = () => {
    setStatusFilter('')
    setVendorFilter('')
    setSectionFilter('')
    setPage(1)
  }

  return {
    search,
    changeSearch: (q: string) => {
      setSearch(q)
      setPage(1)
    },
    page,
    setPage,
    pageSize,
    changePageSize: (size: number) => {
      setPageSize(size)
      setPage(1)
    },
    sortColumn,
    sortDirection,
    changeSort: (column: string | null, direction: SortDirection) => {
      setSortColumn(column)
      setSortDirection(direction)
      setPage(1)
    },
    toolbarFilters,
    changeToolbarFilter,
    clearFilters,
    data,
    isFetching,
    isError,
    refetch,
    items,
    tabs,
    canManage,
    openCreate: () => openDialog(null),
    openEdit: (row: ServiceVendor) => openDialog(row),
    dialogOpen,
    setDialogOpen,
    editing,
    dialogNonce,
  }
}
