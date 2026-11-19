import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus,
  ClipboardList,
  PackageCheck,
  Truck,
  IndianRupee,
  FilePen,
  Clock,
  CircleX,
  Ban,
  PackageOpen,
  Archive,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { BusinessMetricsTable } from "@/components/common/tables/BusinessMetricsTable"
import type {
  CellFormatter,
  TabConfig,
} from "@/components/common/tables/BusinessMetricsTable"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { CopyableText } from "@/components/common/display/CopyableText"
import { StatsRow } from "@/components/common/display/StatsRow"
import { Typography } from "@/components/ui/typography"
import { ListPageShell } from "@/components/page-shells"
import { UI, PAGINATION } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks"
import { useMemoryState } from "@/shared/hooks/useMemoryState"
import { formatINRCompact, formatINRShort } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"
import { usePermission } from "@shared/rbac"

import { procurementCan } from "../../permissions"

import {
  poStatusLabel,
  poStatusVariant,
  poTabCount,
  PO_APPROVAL_LABELS,
  PO_APPROVAL_VARIANTS,
  PO_TABS,
  type PurchaseOrderTabId,
} from "../../constants"
import {
  usePurchaseOrders,
  usePurchaseOrderStats,
  usePurchaseOrderTabCounts,
} from "../../hooks/purchase-orders/usePurchaseOrders"
import { useVendorOptions } from "../../hooks/vendors/useVendors"
import { AsyncSelect, type AsyncSelectOption } from "@/components/ui/async-select"
import type { PurchaseOrderStatus, PurchaseOrderSortField } from "../../api"
import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"
import {
  LIST_S,
  SORT_FIELD_MAP,
  TAB_IDS,
  DASH,
  emptyPoView,
  type PoTabView,
} from "./purchase-orders-body-helpers"

export function PurchaseOrdersBody() {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canWrite = can(procurementCan.writePo)

  const [selectedStatus, setSelectedStatus] = useMemoryState<string>(
    "procurement-po:status",
    TAB_IDS[0],
  )
  // Guard the stored value: an old "__all__" (or anything not a tab) falls
  // back to the default tab, so the table always has a valid active tab.
  const activeTabId: PurchaseOrderTabId = (TAB_IDS as string[]).includes(selectedStatus)
    ? (selectedStatus as PurchaseOrderTabId)
    : TAB_IDS[0]
  const activeTab = PO_TABS.find((t) => t.id === activeTabId) ?? PO_TABS[0]

  // Each tab owns its OWN view — search, filters, sort, page, AND page size. The
  // map lives in an in-memory store, so a filter/page set on one tab neither
  // bleeds into another NOR is lost navigating list ↔ detail — but a browser
  // refresh (or leaving the PO section) resets it to defaults.
  const [viewByTab, setViewByTab] = useMemoryState<Record<string, PoTabView>>(
    "procurement-po:views",
    () => Object.fromEntries(TAB_IDS.map((id) => [id, emptyPoView()])),
  )
  const view = viewByTab[activeTabId] ?? emptyPoView()
  const { search, vendor, conditionFilter, sortColumn, sortDirection, page, pageSize } =
    view
  // Patch only the ACTIVE tab's slice.
  const patchView = (patch: Partial<PoTabView>) =>
    setViewByTab((prev) => ({
      ...prev,
      [activeTabId]: { ...(prev[activeTabId] ?? emptyPoView()), ...patch },
    }))
  const setPage = (p: number) => patchView({ page: p })

  const trimmedSearch = search.trim()
  const debouncedSearch = useDebounce(trimmedSearch, UI.DEBOUNCE_SEARCH_MS)
  // An empty search bypasses the debounce, so clearing it (e.g. on a tab switch)
  // updates the list immediately instead of the query lagging behind and first
  // refetching with the stale term.
  const effectiveSearch = trimmedSearch ? debouncedSearch : ""

  // Header-click sort → API sort field; defaults to newest-first server-side.
  const sortParam: PurchaseOrderSortField =
    sortColumn && sortDirection && SORT_FIELD_MAP[sortColumn]
      ? (`${sortDirection === "desc" ? "-" : ""}${SORT_FIELD_MAP[sortColumn]}` as PurchaseOrderSortField)
      : "-created_at"

  // Server pagination: reset to page 1 whenever a result-affecting filter
  // changes (§16.7), handled in the change callbacks rather than an effect.
  // Every result-affecting change patches ONLY the active tab and resets ITS
  // page to 1 — other tabs keep their own search / filters / sort / page.
  function changeSearch(v: string) {
    patchView({ search: v, page: 1 })
  }
  function changeStatus(v: string) {
    // Just switch the active tab; its view (search / filters / sort / page) is
    // restored from the persisted per-tab map.
    setSelectedStatus(v)
  }
  function changeVendor(v: AsyncSelectOption | null) {
    patchView({ vendor: v, page: 1 })
  }
  function changeCondition(v: string) {
    patchView({ conditionFilter: v, page: 1 })
  }

  const queryParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      q: effectiveSearch || undefined,
      // The active tab contributes its own status / approval_status filters —
      // the Rejected tab sends no status at all (rejected ⟹ draft).
      ...activeTab.filters,
      supplier_id: vendor?.id || undefined,
      condition: (conditionFilter as "new" | "refurbished") || undefined,
      sort: sortParam,
    }),
    [page, pageSize, effectiveSearch, activeTab, vendor, conditionFilter, sortParam],
  )

  const { data, isError, isFetching, refetch } = usePurchaseOrders(queryParams)
  const total = data?.total ?? 0

  // One GLOBAL stats call feeds the KPI tiles + tab badges. It intentionally
  // ignores the search / vendor / condition filters AND the active tab, so the
  // headline numbers stay a stable overview that doesn't shift as the user
  // filters or moves between tabs.
  const { data: poStats } = usePurchaseOrderStats()

  // Each tab's badge must reflect ITS OWN filters. The active tab uses `total`
  // (its filtered list total); a tab with no filter uses the global stats count.
  // The gap — INACTIVE tabs that carry a filter — gets a dedicated count query
  // here, so their badge keeps the filtered number even while another tab shows.
  const filteredCountEntries = useMemo(
    () =>
      PO_TABS.filter((t) => t.id !== activeTabId)
        .map((t) => ({ t, v: viewByTab[t.id] ?? emptyPoView() }))
        .filter(({ v }) => Boolean(v.search.trim() || v.vendor || v.conditionFilter))
        .map(({ t, v }) => ({
          id: t.id,
          params: {
            page: 1,
            page_size: 1,
            q: v.search.trim() || undefined,
            ...t.filters,
            supplier_id: v.vendor?.id || undefined,
            condition: (v.conditionFilter as "new" | "refurbished") || undefined,
          },
        })),
    [activeTabId, viewByTab],
  )
  const filteredTabCounts = usePurchaseOrderTabCounts(filteredCountEntries)

  const columns = useMemo(
    () => [
      { key: "po_number", label: LIST_S.columns.poNumber, sortable: true, width: "190px" },
      { key: "supplier", label: LIST_S.columns.vendor, width: "300px" },
      { key: "requested_by", label: LIST_S.columns.contactedTo, width: "200px" },
      { key: "warehouse", label: LIST_S.columns.warehouse, width: "180px" },
      { key: "items", label: LIST_S.columns.items, align: "center" as const, sortable: true, width: "80px" },
      { key: "ordered", label: LIST_S.columns.ordered, align: "center" as const, sortable: true, width: "100px" },
      { key: "received", label: LIST_S.columns.received, align: "center" as const, sortable: true, width: "100px" },
      { key: "pending", label: LIST_S.columns.pending, align: "center" as const, sortable: true, width: "100px" },
      { key: "returned", label: LIST_S.columns.returned, align: "center" as const, sortable: true, width: "90px" },
      { key: "grand_total", label: LIST_S.columns.grandTotal, align: "right" as const, width: "140px" },
      { key: "status", label: LIST_S.columns.status, width: "150px" },
      { key: "condition", label: LIST_S.columns.condition, width: "130px" },
      {
        key: "expected_delivery_date",
        label: LIST_S.columns.expectedDelivery,
        sortable: true,
        width: "170px",
      },
      { key: "created_by", label: LIST_S.columns.createdBy, width: "180px" },
      // Created At is server-sortable (created_by is not); the header toggles
      // -created_at / created_at. Backend already supports this sort.
      {
        key: "created_at",
        label: LIST_S.columns.createdAt,
        sortable: true,
        width: "170px",
      },
    ],
    [],
  )

  const rows = useMemo(
    () =>
      (data?.items ?? []).map((po) => ({
        id: po.id,
        po_number: po.po_number,
        supplier: po.supplier?.name ?? DASH,
        requested_by: po.vendor_contact_name ?? DASH,
        warehouse: po.warehouse_name ?? DASH,
        items: po.item_count,
        ordered: po.ordered_quantity,
        received: po.received_quantity,
        pending: po.pending_quantity,
        // Returned-for-refund units across the PO's lines. A real 0 is a value
        // (§0.7) — show it; only a missing count dashes.
        returned: po.returned_quantity ?? DASH,
        // The list item only carries grand_total; tax is no longer applied on
        // POs so it equals the pre-tax total we show as "Total".
        grand_total: po.grand_total,
        status: po.status,
        approvalStatus: po.approval_status,
        condition: po.condition,
        expected_delivery_date: po.expected_delivery_date ?? DASH,
        created_by: po.created_by_name ?? DASH,
        // Always present on the list item — rendered in IST by the formatter.
        created_at: po.created_at,
      })),
    [data?.items],
  )

  // Server-paged, so only the ACTIVE tab carries the fetched page; the others
  // render empty until selected (which triggers a refetch for that tab).
  const tabs: TabConfig[] = useMemo(
    () =>
      PO_TABS.map((t) => ({
        id: t.id,
        label: t.label,
        columns,
        data: t.id === activeTabId ? rows : [],
        // Each tab's badge reflects ITS OWN filters: the active tab uses its
        // filtered list total; an inactive tab WITH a filter uses its dedicated
        // filtered count query; an inactive tab with no filter keeps the global
        // stats count. So filtering one tab moves only that tab's badge, and the
        // filtered count sticks even after switching away.
        count:
          t.id === activeTabId
            ? total
            : (filteredTabCounts[t.id] ?? poTabCount(t.id, poStats)),
      })),
    [columns, rows, activeTabId, poStats, total, filteredTabCounts],
  )

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "po_number" && typeof value === "string") {
      // PO No is plain reference text that copies on click (§1/§5 — no blue
      // link; the whole row already opens the detail). stopPropagation so the
      // copy click doesn't also fire the row's onRowClick.
      return {
        display: (
          <div onClick={(e) => e.stopPropagation()} className="max-w-full">
            <CopyableText value={value} className="font-medium" />
          </div>
        ),
      }
    }
    if (key === "status" && typeof value === "string") {
      const s = value as PurchaseOrderStatus
      // A rejected approval keeps the PO in draft — show a single "Rejected"
      // badge (not "Draft" + "Rejected") so the status reads cleanly.
      const rejected = row.approvalStatus === "rejected"
      return {
        display: rejected ? (
          <StatusBadge variant={PO_APPROVAL_VARIANTS.rejected}>
            {PO_APPROVAL_LABELS.rejected}
          </StatusBadge>
        ) : (
          <StatusBadge variant={poStatusVariant(s)}>{poStatusLabel(s)}</StatusBadge>
        ),
      }
    }
    if (key === "condition" && typeof value === "string") {
      return {
        display: (
          <StatusBadge variant={value === "refurbished" ? "warning" : "info"}>
            {value === "refurbished" ? LIST_S.condition.refurbished : LIST_S.condition.new}
          </StatusBadge>
        ),
      }
    }
    if (key === "grand_total" && typeof value === "string") {
      return {
        display: (
          <Typography variant="body-strong" numeric asChild>
            <span>{formatINRCompact(Number(value), { decimals: true })}</span>
          </Typography>
        ),
      }
    }
    if (
      key === "expected_delivery_date" &&
      typeof value === "string" &&
      value &&
      value !== DASH
    ) {
      return {
        display: (
          <Typography variant="body" tone="muted" asChild>
            <span>{formatIST_date(value)}</span>
          </Typography>
        ),
      }
    }
    if (key === "created_at" && typeof value === "string" && value) {
      return {
        display: (
          <Typography variant="body" tone="muted" asChild>
            <span>{formatIST_date(value)}</span>
          </Typography>
        ),
      }
    }
    return null
  }

  const stats = [
    {
      label: LIST_S.stats.totalPOs,
      value: poStats?.total ?? total,
      icon: ClipboardList,
      accent: "primary" as const,
    },
    {
      label: LIST_S.stats.open,
      value: poStats?.by_status.issued ?? 0,
      icon: Truck,
      accent: "info" as const,
    },
    {
      label: LIST_S.stats.partiallyReceived,
      value: poStats?.by_status.partially_received ?? 0,
      icon: PackageOpen,
      accent: "warning" as const,
    },
    {
      label: LIST_S.stats.fullyReceived,
      value: poStats?.by_status.received ?? 0,
      icon: PackageCheck,
      accent: "success" as const,
    },
    {
      label: LIST_S.stats.closed,
      value: poStats?.by_status.closed ?? 0,
      icon: Archive,
      accent: "teal" as const,
    },
    {
      label: LIST_S.stats.draft,
      // A rejected PO stays status=draft; count it only under Rejected, as the tab does.
      value: poTabCount("draft", poStats) ?? 0,
      icon: FilePen,
      accent: "violet" as const,
    },
    {
      label: LIST_S.stats.pendingApproval,
      value:
        (poStats?.by_approval_status.pending ?? 0) +
        (poStats?.by_approval_status.partially_approved ?? 0),
      icon: Clock,
      accent: "warning" as const,
    },
    {
      label: LIST_S.stats.rejected,
      value: poStats?.by_approval_status.rejected ?? 0,
      icon: CircleX,
      accent: "danger" as const,
    },
    {
      label: LIST_S.stats.cancelled,
      value: poStats?.by_status.cancelled ?? 0,
      icon: Ban,
      accent: "teal" as const,
    },
    {
      label: LIST_S.stats.totalOrderValue,
      // Abbreviate to Indian units (₹1.71Cr / ₹45.60L) so a large total fits
      // the KPI tile instead of a long grouped number crowding the icon.
      value: formatINRShort(poStats?.total_order_value ?? 0),
      icon: IndianRupee,
      accent: "warning" as const,
    },
  ]

  // Status now lives in the tab strip; the toolbar carries the vendor +
  // condition (new / refurbished) filters, both applied server-side.
  const toolbarFilters = useMemo(
    () => [
      {
        key: "vendor",
        label: LIST_S.filters.vendor,
        // Keep `value` set so "clear filters" still detects the vendor filter
        // as active; the custom AsyncSelect below owns the real value/change.
        value: vendor?.id ?? "",
        allLabel: LIST_S.filters.allVendors,
        options: [],
        // §16.11 — server-backed infinite picker (debounced search, scroll to
        // load) instead of a fetch-all-100 client filter.
        render: () => (
          <AsyncSelect
            value={vendor}
            onValueChange={changeVendor}
            useOptions={useVendorOptions}
            toLabel={(v) => v.name}
            searchable
            loadOnOpen
            clearable
            placeholder={LIST_S.filters.allVendors}
            // Match the sibling condition dropdown exactly: the toolbar
            // Select renders at size="sm" (h-8, rounded-[5px], w-[185px]), but
            // AsyncSelect's trigger defaults to h-10/rounded-[7px] — so the
            // vendor box was taller and more rounded. These call-site classes
            // win via cn(), aligning the two filters. (async-select.tsx is
            // shared with CRM — never resize it there.)
            className="h-8 w-[185px] rounded-[5px]"
          />
        ),
      },
      {
        key: "condition",
        label: LIST_S.filters.condition,
        value: conditionFilter,
        allLabel: LIST_S.filters.allConditions,
        options: [
          { value: "new", label: LIST_S.condition.new },
          { value: "refurbished", label: LIST_S.condition.refurbished },
        ],
      },
    ],
    [vendor, conditionFilter],
  )

  function handleToolbarFilterChange(key: string, value: string) {
    // Vendor is a custom AsyncSelect (owns its own change); only condition
    // flows through the default toolbar select here.
    if (key === "condition") changeCondition(value)
  }

  return (
    <ListPageShell
      title={LIST_S.title}
      subtitle={LIST_S.subtitle}
      stats={<StatsRow stats={stats} />}
      actions={
        canWrite ? (
          <Button onClick={() => navigate("/procurement/po/new")} className="h-9">
            <Plus className="mr-1 size-4" />
            {LIST_S.createButton}
          </Button>
        ) : undefined
      }
    >
      <BusinessMetricsTable
        showIndex
        className="ims-bmt-compact-filters"
        tabs={tabs}
        activeTab={activeTabId}
        onTabChange={(tabId) => changeStatus(tabId)}
        cellFormatter={cellFormatter}
        pageSize={pageSize}
        searchable
        searchValue={search}
        searchPlaceholder={LIST_S.searchPlaceholder}
        onSearchChange={changeSearch}
        toolbarFilters={toolbarFilters}
        onToolbarFilterChange={handleToolbarFilterChange}
        onClearFilters={() => {
          // Clear only THIS tab's filters + search + sort and reset its page
          // (§1 — "Clear filters" resets everything, sort included).
          patchView({
            vendor: null,
            conditionFilter: "",
            search: "",
            sortColumn: null,
            sortDirection: null,
            page: 1,
          })
        }}
        persistKey="procurement-po-v3"
        onRowClick={(row) => navigate(`/procurement/po/${row.id}`)}
        serverPagination={{
          page,
          pageSize,
          total,
          isFetching,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            // Page size is per tab — patch only this tab and reset its page.
            patchView({ pageSize: size, page: 1 })
          },
          pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
          sort: { column: sortColumn, direction: sortDirection },
          onSortChange: (col, dir) => {
            // Sort is per tab — patch only this tab and reset its page.
            patchView({ sortColumn: col, sortDirection: dir, page: 1 })
          },
        }}
        // Loading is handled by BMT via serverPagination.isFetching. A first-load
        // failure surfaces as the table's own error slot (title + Retry).
        error={
          isError
            ? {
                title: PURCHASE_ORDERS_STRINGS.list.error.title,
                description: PURCHASE_ORDERS_STRINGS.list.error.description,
                onRetry: () => void refetch(),
              }
            : undefined
        }
        emptyState={{
          title: LIST_S.empty.title,
          description: LIST_S.empty.description,
          action: canWrite
            ? {
                label: LIST_S.empty.action,
                onClick: () => navigate("/procurement/po/new"),
              }
            : undefined,
        }}
      />
    </ListPageShell>
  )
}
