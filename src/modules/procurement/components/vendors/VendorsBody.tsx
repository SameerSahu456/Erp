import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BusinessMetricsTable } from "@/components/common/tables/BusinessMetricsTable"
import type {
  CellFormatter,
  TabConfig,
} from "@/components/common/tables/BusinessMetricsTable"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { ListPageShell } from "@/components/page-shells"
import { UI } from "@/shared/constants"
import { formatIST_date } from "@shared/lib/date"
import { useDebounce } from "@/shared/hooks"
import { usePersistedState } from "@/hooks/use-persisted-state"

import { usePermission } from "@shared/rbac"

import { VENDOR_PAGE_SIZE } from "../../constants"
import { procurementCan } from "../../permissions"
import { useVendors } from "../../hooks/vendors/useVendors"
import type { VendorStatus, VendorSortField } from "../../api"
import { VendorFormDialog } from "../../components/vendors/VendorFormDialog"
import { VENDOR_STATUS_LABELS, VENDOR_STATUS_VARIANT } from "../../constants/vendor-status"
import { VENDORS_STRINGS } from "./vendors.strings"
import { ALL, SORT_FIELD_MAP } from "./vendors-body-helpers"


export function VendorsBody() {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canWrite = can(procurementCan.writeVendor)

  const [search, setSearch] = usePersistedState<string>(
    "procurement-vendors:search",
    "",
  )
  const [selectedStatus, setSelectedStatus] = usePersistedState<string>(
    "procurement-vendors:status",
    ALL,
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(VENDOR_PAGE_SIZE)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS)

  // Header-click sort → API sort field; defaults to newest-first.
  const sortParam: VendorSortField =
    sortColumn && sortDirection && SORT_FIELD_MAP[sortColumn]
      ? (`${sortDirection === "desc" ? "-" : ""}${SORT_FIELD_MAP[sortColumn]}` as VendorSortField)
      : "-created_at"

  const queryParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: debouncedSearch || undefined,
      status:
        selectedStatus !== ALL ? (selectedStatus as VendorStatus) : undefined,
      sort: sortParam,
    }),
    [page, pageSize, debouncedSearch, selectedStatus, sortParam],
  )

  const { data, isError, isFetching, refetch } = useVendors(queryParams)
  const total = data?.total ?? 0

  const vendorsTab: TabConfig = useMemo(
    () => ({
      id: "vendors",
      label: VENDORS_STRINGS.list.tabLabel,
      columns: [
        { key: "srNo", label: VENDORS_STRINGS.list.columns.srNo, width: "70px" },
        { key: "code", label: VENDORS_STRINGS.list.columns.code, sortable: true, width: "175px" },
        { key: "name", label: VENDORS_STRINGS.list.columns.name, sortable: true, width: "300px" },
        { key: "contact_name", label: VENDORS_STRINGS.list.columns.contact, width: "180px" },
        { key: "contact_email", label: VENDORS_STRINGS.list.columns.email, width: "260px" },
        { key: "status", label: VENDORS_STRINGS.list.columns.status, width: "100px" },
        { key: "created_at", label: VENDORS_STRINGS.list.columns.created, sortable: true, width: "120px" },
      ],
      // Serial number is continuous across pages: offset by the current page.
      data: (data?.items ?? []).map((v, i) => ({
        id: v.id,
        srNo: (page - 1) * pageSize + i + 1,
        code: v.code,
        name: v.name,
        contact_name: v.contact_name ?? "—",
        contact_email: v.contact_email ?? "—",
        status: v.status,
        created_at: v.created_at,
      })),
    }),
    [data?.items, page, pageSize],
  )

  const cellFormatter: CellFormatter = (value, key) => {
    if (key === "status" && typeof value === "string") {
      const s = value as VendorStatus
      return {
        display: <StatusBadge variant={VENDOR_STATUS_VARIANT[s]}>{VENDOR_STATUS_LABELS[s]}</StatusBadge>,
      }
    }
    if (key === "created_at" && typeof value === "string" && value) {
      return {
        display: <span className="text-muted-foreground">{formatIST_date(value)}</span>,
      }
    }
    return null
  }

  // Status lives in the table's own toolbar filter (same pattern as the PO list),
  // not a separate side panel. Empty value = "all".
  const toolbarFilters = useMemo(
    () => [
      {
        key: "status",
        label: VENDORS_STRINGS.list.filterStatusLabel,
        value: selectedStatus === ALL ? "" : selectedStatus,
        allLabel: VENDORS_STRINGS.list.filterAllStatuses,
        options: [
          { value: "active", label: VENDOR_STATUS_LABELS.active },
          { value: "inactive", label: VENDOR_STATUS_LABELS.inactive },
        ],
      },
    ],
    [selectedStatus],
  )

  function handleToolbarFilterChange(key: string, value: string) {
    if (key === "status") setSelectedStatus(value || ALL)
    setPage(1)
  }

  return (
    <ListPageShell
      title={VENDORS_STRINGS.list.title}
      subtitle={VENDORS_STRINGS.list.subtitle}
      actions={
        canWrite ? (
          <Button onClick={() => setCreateOpen(true)} className="h-9">
            <Plus className="mr-1 size-4" />
            {VENDORS_STRINGS.list.addVendor}
          </Button>
        ) : undefined
      }
    >
      <BusinessMetricsTable
        className="ims-bmt-compact-filters"
        tabs={[vendorsTab]}
        cellFormatter={cellFormatter}
        pageSize={pageSize}
        searchable
        searchValue={search}
        searchPlaceholder={VENDORS_STRINGS.list.searchPlaceholder}
        onSearchChange={(q) => {
          setSearch(q)
          setPage(1)
        }}
        toolbarFilters={toolbarFilters}
        onToolbarFilterChange={handleToolbarFilterChange}
        onClearFilters={() => {
          setSelectedStatus(ALL)
          setPage(1)
        }}
        // Bumped from "procurement-vendors" so the stale `bmt:procurement-vendors:tab`
        // ("active" / "all") left in sessionStorage from the legacy mock-driven page
        // doesn't shadow the single "vendors" tab — `tabs.find` returned undefined
        // there and the table rendered no rows even when the API returned data.
        persistKey="procurement-vendors-v2"
        onRowClick={(row) => navigate(`/procurement/vendors/${row.id}`)}
        serverPagination={{
          page,
          pageSize,
          total,
          isFetching,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size)
            setPage(1)
          },
          sort: { column: sortColumn, direction: sortDirection },
          onSortChange: (col, dir) => {
            setSortColumn(col)
            setSortDirection(dir)
            setPage(1)
          },
        }}
        // Loading is handled by BMT via serverPagination.isFetching. A first-load
        // failure surfaces as the table's own error slot (title + Retry).
        error={
          isError
            ? {
                title: VENDORS_STRINGS.list.error.title,
                description: VENDORS_STRINGS.list.error.description,
                onRetry: () => void refetch(),
              }
            : undefined
        }
        emptyState={{
          title: VENDORS_STRINGS.list.empty.title,
          description: VENDORS_STRINGS.list.empty.description,
          action: canWrite
            ? {
                label: VENDORS_STRINGS.list.empty.action,
                onClick: () => setCreateOpen(true),
              }
            : undefined,
        }}
      />

      <VendorFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(saved) => navigate(`/procurement/vendors/${saved.id}`)}
      />
    </ListPageShell>
  )
}
