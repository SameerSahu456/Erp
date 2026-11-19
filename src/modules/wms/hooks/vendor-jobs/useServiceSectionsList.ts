import { useMemo, useState } from 'react'

import type { ToolbarFilter } from '@/components/common/tables/BusinessMetricsTable'
import { PAGINATION } from '@shared/constants/pagination'
import { UI } from '@shared/constants/ui'
import { useDebounce } from '@shared/hooks'
import { usePermission } from '@shared/rbac'
import { wmsCan } from '../../permissions'

import { useServiceSectionsSearch } from './useServiceSections'
import type { ServiceSection, ServiceSectionListParams } from '../../api/service-jobs'
import { SERVICE_SECTIONS_STRINGS as S } from '../../components/vendor-jobs/service-sections.strings'

/** §16.6 — one page-size per page, derived from the global default. */
const SERVICE_SECTIONS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

/** Table column key → the server's `sort` field. */
const SORT_FIELD: Record<string, 'name' | 'code'> = {
  name: 'name',
  code: 'code',
}

type SortDirection = 'asc' | 'desc' | null

function toSortParam(
  column: string | null,
  direction: SortDirection,
): ServiceSectionListParams['sort'] {
  // Unsorted → most recently UPDATED first (§1/§7.3). Cast: the generated sort
  // type hasn't been regenerated to list `-updated_at` yet.
  if (!column || !direction) return '-updated_at' as ServiceSectionListParams['sort']
  const field = SORT_FIELD[column] ?? 'name'
  return (direction === 'desc' ? `-${field}` : field) as ServiceSectionListParams['sort']
}

/** '' = no filter; otherwise the facet's boolean. */
function toBool<T extends string>(value: '' | T, yes: T, no: T): boolean | undefined {
  if (value === yes) return true
  if (value === no) return false
  return undefined
}

const COLUMNS = [
  { key: 'name', label: S.columns.name, sortable: true },
  { key: 'code', label: S.columns.code, sortable: true },
  { key: 'statusLabel', label: S.columns.statusLabel },
  { key: 'tracksReplacement', label: S.columns.tracksReplacement },
  { key: 'appliesToServers', label: S.columns.appliesToServers },
  { key: 'items', label: S.columns.items },
  { key: 'active', label: S.columns.active },
]

function buildToolbarFilters(values: {
  statusFilter: string
  tracksFilter: string
  serversFilter: string
}): ToolbarFilter[] {
  const F = S.filters
  const yesNo = [
    { value: 'yes', label: F.yes },
    { value: 'no', label: F.no },
  ]
  return [
    {
      key: 'status',
      label: F.statusLabel,
      allLabel: F.statusAll,
      value: values.statusFilter,
      options: [
        { value: 'active', label: F.active },
        { value: 'inactive', label: F.inactive },
      ],
    },
    { key: 'tracks', label: F.tracksLabel, allLabel: F.tracksAll, value: values.tracksFilter, options: yesNo },
    { key: 'servers', label: F.serversLabel, allLabel: F.serversAll, value: values.serversFilter, options: yesNo },
  ]
}

/** Service-section master list: server search/sort/filters/paging + the edit dialog target. */
export function useServiceSectionsList() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  // Column filters: '' = no filter for that facet.
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('')
  const [tracksFilter, setTracksFilter] = useState<'' | 'yes' | 'no'>('')
  const [serversFilter, setServersFilter] = useState<'' | 'yes' | 'no'>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceSection | null>(null)
  // Create = store/warehouse manager tier; edit = service-vendor manage (WM/SM/MIS).
  // Mirror both so a button is never offered to someone the server would refuse.
  const perm = usePermission()
  const canCreateSection = perm.can(wmsCan.serviceSectionCreate)
  const canEditSection = perm.can(wmsCan.serviceVendorManage)

  const [pageSize, setPageSize] = useState<number>(SERVICE_SECTIONS_PAGE_SIZE)
  // Debounce so each keystroke doesn't refetch; cap to the backend search limit.
  const trimmedSearch = search.trim().slice(0, 50)
  const debouncedSearch = useDebounce(trimmedSearch, UI.DEBOUNCE_SEARCH_MS)
  const effectiveSearch = trimmedSearch ? debouncedSearch : ''

  const listParams = useMemo<ServiceSectionListParams>(
    () => ({
      search: effectiveSearch || undefined,
      // Admin master: show inactive too, badged in the Active column.
      include_inactive: true,
      is_active: toBool(statusFilter, 'active', 'inactive'),
      tracks_replacement: toBool(tracksFilter, 'yes', 'no'),
      applies_to_servers: toBool(serversFilter, 'yes', 'no'),
      sort: toSortParam(sortColumn, sortDirection),
      page,
      page_size: pageSize,
    }),
    [effectiveSearch, statusFilter, tracksFilter, serversFilter, sortColumn, sortDirection, page, pageSize],
  )
  const { data, isFetching, isError, refetch } = useServiceSectionsSearch(listParams)
  const items = useMemo(() => data?.items ?? [], [data])

  const rows = useMemo(
    () =>
      items.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        statusLabel: s.device_status_label,
        tracksReplacement: s.tracks_replacement ? S.yes : S.no,
        appliesToServers: s.applies_to_servers ? S.yes : S.no,
        items: s.item_suggestions,
        active: s.is_active ? S.yes : S.no,
      })),
    [items],
  )

  // One tab; its count is the SERVER total so it tracks the search (§7).
  const tabs = useMemo(
    () => [{ id: 'all', label: S.tabs.all, columns: COLUMNS, data: rows, count: data?.total ?? 0 }],
    [rows, data],
  )

  const toolbarFilters = buildToolbarFilters({ statusFilter, tracksFilter, serversFilter })

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (rowId: unknown) => {
    const match = items.find((s) => s.id === rowId)
    if (match) {
      setEditing(match)
      setDialogOpen(true)
    }
  }

  const changeSearch = (q: string) => {
    setSearch(q)
    setPage(1)
  }

  const changeToolbarFilter = (key: string, value: string) => {
    if (key === 'status') setStatusFilter(value === 'active' || value === 'inactive' ? value : '')
    else if (key === 'tracks') setTracksFilter(value === 'yes' || value === 'no' ? value : '')
    else if (key === 'servers') setServersFilter(value === 'yes' || value === 'no' ? value : '')
    setPage(1)
  }

  // Empty-state "Clear filters" resets every toolbar facet + page (§1).
  const clearFilters = () => {
    setStatusFilter('')
    setTracksFilter('')
    setServersFilter('')
    setPage(1)
  }

  const changePageSize = (size: number) => {
    setPageSize(size)
    setPage(1)
  }

  const changeSort = (column: string | null, direction: SortDirection) => {
    setSortColumn(column)
    setSortDirection(direction)
    setPage(1)
  }

  return {
    search,
    page,
    setPage,
    pageSize,
    sortColumn,
    sortDirection,
    data,
    isFetching,
    isError,
    refetch,
    tabs,
    toolbarFilters,
    canCreateSection,
    canEditSection,
    dialogOpen,
    setDialogOpen,
    editing,
    openCreate,
    openEdit,
    changeSearch,
    changeToolbarFilter,
    clearFilters,
    changePageSize,
    changeSort,
  }
}
