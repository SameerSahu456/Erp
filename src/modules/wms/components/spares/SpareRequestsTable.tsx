import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { Typography } from '@/components/ui/typography'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/tables/BusinessMetricsTable'
import { LoadErrorState } from '@shared/components/feedback/LoadErrorState'

import { SPARE_TAB_IDS, type SpareTab, type useSparesList } from '../../hooks/spares/useSparesList'
import { DeviceQueueFilter } from '../shared/DeviceQueueFilter'
import { WMS_LIST_MAX_CELL_CHARS } from '../../constants'
import type { FulfillSubject } from './FulfillSpareDialog'
import type { ReturnSubject } from './ReturnSpareDialog'
import { SpareIssuedUnitsCell } from './SpareIssuedUnitsCell'
import { SpareRequestActionsCell } from './SpareRequestActionsCell'
import {
  requestColumns,
  SPARE_TAB_EMPTY_DESCRIPTION,
  toSpareRequestRow,
} from './spares-body-helpers'
import { SPARES_STRINGS } from './spares.strings'
import {
  SPARE_REQUEST_STATUS_LABELS,
  SPARE_REQUEST_STATUS_VARIANT,
} from '../../constants/spare-status'
import { deviceDetailPath } from '../devices/device-detail/helpers'

type SparesList = ReturnType<typeof useSparesList>

interface SpareRequestHandlers {
  onFulfill: (subject: FulfillSubject) => void
  onReturn: (subject: ReturnSubject) => void
  onCancel: (reqId: string) => void
}

function buildRequestCellFormatter(
  sl: SparesList,
  { onFulfill, onReturn, onCancel }: SpareRequestHandlers,
): CellFormatter {
  return (value, key, row) => {
    if (key === 'barcode') {
      // The device the spare was raised against. The whole row navigates to its
      // dossier (see onRowClick), so this is just the identifier, in mono.
      const bc = String(value)
      const isEmpty = !bc || bc === '—'
      return {
        display: (
          <Typography variant={isEmpty ? 'helper' : 'body'} tone={isEmpty ? 'muted' : 'default'} asChild>
            <span className="font-mono">{bc}</span>
          </Typography>
        ),
      }
    }
    // `partNo` is left to BusinessMetricsTable's default cell rendering so it
    // truncates to the column width with a hover tooltip, exactly like the
    // device listing's Part column (no custom PartCell / SKU line).
    if (key === 'status') {
      const s = value as string
      if (!s) {
        return {
          display: (
            <Typography variant="helper" tone="muted" asChild>
              <span>—</span>
            </Typography>
          ),
        }
      }
      // A returned spare keeps the wire status 'fulfilled', so show it as
      // "Spare Returned" (the synthetic key) once anything has been put back.
      const key2 = (row.returned as number) > 0 ? 'returned' : s
      return {
        display: (
          <StatusBadge variant={SPARE_REQUEST_STATUS_VARIANT[key2] ?? 'neutral'}>
            {SPARE_REQUEST_STATUS_LABELS[key2] ?? s}
          </StatusBadge>
        ),
      }
    }
    if (key === 'issuedUnit') {
      const units = (row.issuedUnits ?? []) as { stock_item_id: string; serial: string | null }[]
      return { display: <SpareIssuedUnitsCell units={units} /> }
    }
    if (key === 'actions') {
      // Gate Return on THIS spare's warehouse, not the navbar selection — a
      // manager viewing several warehouses has no single `whId`, which left the
      // global `canReturn` false and hid the button for them.
      const rowCanReturn = sl.canReturnSpare((row.warehouseId as string | null) ?? undefined)
      return {
        display: (
          <SpareRequestActionsCell
            row={row}
            access={{ ...sl.access, canReturn: rowCanReturn }}
            canCancel={sl.access.canManageSpares}
            onFulfill={onFulfill}
            onReturn={onReturn}
            onCancel={onCancel}
          />
        ),
      }
    }
    return null
  }
}

/** The spare-request tabs table; each tab is its own server query. */
export function SpareRequestsTable({
  sl,
  onFulfill,
  onReturn,
  onCancel,
}: SpareRequestHandlers & { sl: SparesList }) {
  const navigate = useNavigate()
  const { lv, spareTab, controls, requestsQuery, total } = sl
  const { search, sortColumn, sortDirection, page, pageSize } = lv.view

  const requestItems = useMemo(() => requestsQuery.data?.items ?? [], [requestsQuery.data])
  const requestRows = useMemo(() => requestItems.map(toSpareRequestRow), [requestItems])

  // Each tab is its own server query, so rows come straight from the API.
  const requestTabs: TabConfig[] = SPARE_TAB_IDS.map((id) => ({
    id,
    label: SPARES_STRINGS.bodyView.tabs[id],
    count: sl.countFor(id),
    // Pending requests have nothing issued yet, so the Issued Unit column is
    // dead weight there — drop it on that tab only.
    columns:
      id === 'pending'
        ? requestColumns.filter((c) => c.key !== 'issuedUnit')
        : requestColumns,
    data: requestRows,
  }))

  const requestCellFormatter = buildRequestCellFormatter(sl, { onFulfill, onReturn, onCancel })

  return (
    <section className="space-y-3">
      <BusinessMetricsTable
        maxCellChars={WMS_LIST_MAX_CELL_CHARS}
        filterSize="default" showIndex
        tabs={requestTabs}
        activeTab={spareTab}
        onTabChange={(id) => lv.setActiveTab(id as SpareTab)}
        cellFormatter={requestCellFormatter}
        // Whole row → the device's detail page (the Fulfill / Cancel action
        // cell stops propagation so its buttons don't trigger this).
        onRowClick={(row) => {
          const sid = row.stockItemId as string | undefined
          if (sid) navigate(deviceDetailPath(sid, 'spares'))
        }}
        persistKey="wms-spares-req"
        searchValue={search}
        searchPlaceholder={SPARES_STRINGS.requestTable.searchPlaceholder}
        onSearchChange={(q) => lv.setSearch(q)}
        dateRange={{
          value: sl.dateRange,
          onChange: (r) => lv.setFilters({ dateRange: r }),
        }}
        renderFilter={({ column, value, onChange }) => {
          const kind = controls.filterKindFor(column.key)
          return kind ? <DeviceQueueFilter kind={kind} value={value} onChange={onChange} /> : null
        }}
        onClearFilters={() => lv.clearFilters()}
        serverPagination={{
          page,
          pageSize,
          total,
          isFetching: requestsQuery.isFetching,
          onPageChange: lv.setPage,
          onPageSizeChange: (s) => lv.setPageSize(s),
          sort: { column: sortColumn, direction: sortDirection },
          onSortChange: (col, dir) => lv.setSort(col, dir),
          filters: controls.filters,
          onFiltersChange: controls.onFiltersChange,
        }}
        // A load error must not look like "no results" (§12).
        emptyNode={
          requestsQuery.isError ? (
            <LoadErrorState
              error={requestsQuery.error}
              fallback={SPARES_STRINGS.bodyView.requestsEmpty.loadErrorTitle}
              noAccessTitle={SPARES_STRINGS.bodyView.requestsEmpty.noAccessTitle}
              className="m-4"
            />
          ) : undefined
        }
        emptyState={{
          title: SPARES_STRINGS.bodyView.requestsEmpty.emptyTitle,
          description: SPARE_TAB_EMPTY_DESCRIPTION[spareTab],
        }}
      />
    </section>
  )
}
