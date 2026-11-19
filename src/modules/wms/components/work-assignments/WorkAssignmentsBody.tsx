/**
 * Work assignments — the list.
 *
 * Thin view over `useWorkAssignmentsList` (server-paginated, per-tab in-memory
 * list view, filter-aware tab counts — see the hook). This file only shapes
 * rows into tabs and wires the table callbacks.
 */
import { useMemo } from 'react'
import { WMS_LIST_MAX_CELL_CHARS } from "../../constants";
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { recordLabelState } from '@shared/routing/record-label'

import { Button } from '@/components/ui/button'
import { ListPageShell } from '@/components/page-shells'
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from '@/components/common/tables/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { EntityRef } from '@/components/common/display/EntityRef'
import { AsyncSelect } from '@/components/ui/async-select'
import { usePermission } from '@shared/rbac'

import { wmsCan } from '../../permissions'

import {
  useWorkAssignmentsList,
  WA_TAB_IDS,
  type WaTabId,
} from '../../hooks/work-assignments/useWorkAssignmentsList'
import { WORK_ASSIGNMENT_STATUS_VARIANT } from '../../constants/work-assignment-status'

import { WORK_ASSIGNMENT_COLUMNS, SORT_FIELD_MAP, toRow } from './work-assignment.columns'
import {
  PENDING_COLUMNS,
  toPendingRows,
  WA_TAB_LABEL,
  waEmptyState,
} from './work-assignment-pending.columns'
import { WorkAssignmentStageFilter } from './WorkAssignmentStageFilter'
import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

// Status renders as a coloured StatusBadge (§0.8/§1); the raw enum rides on
// `_statusRaw` so the variant survives the label mapping.
const cellFormatter: CellFormatter = (value, key, row) => {
  if (key === 'wa_number') {
    return {
      display: (
        <EntityRef
          kind="work_assignment"
          id={String(row.id)}
          value={String(value)}
          className="min-w-0 truncate font-semibold"
        >
          {String(value)}
        </EntityRef>
      ),
    }
  }
  if (key !== 'status') return null
  const raw = row._statusRaw as keyof typeof WORK_ASSIGNMENT_STATUS_VARIANT
  return {
    display: (
      <StatusBadge variant={WORK_ASSIGNMENT_STATUS_VARIANT[raw] ?? 'neutral'}>
        {String(value)}
      </StatusBadge>
    ),
  }
}

export function WorkAssignmentsBody() {
  const navigate = useNavigate()
  // Only holders of a manage code (the write-gated /new route) see "Issue".
  const canManage = usePermission().can(wmsCan.workAssignmentManage)
  const wa = useWorkAssignmentsList(SORT_FIELD_MAP)
  const { lv, tab, isPendingTab, listQuery, pending } = wa
  const { search, sortColumn, sortDirection, page, pageSize } = lv.view
  const { stage: stageFilter, issuedToUserId, dateRange } = lv.view.filters

  const rows = useMemo(() => wa.items.map(toRow), [wa.items])
  const pendingRows = useMemo(
    () => toPendingRows(pending.groups, wa.warehouseNameById, wa.debouncedSearch.toLowerCase()),
    [pending.groups, wa.warehouseNameById, wa.debouncedSearch],
  )
  // eligible-summary is a non-paginated grouped rollup (not a §16.7 list route),
  // so the only way to page it is to slice the bounded result client-side.
  const pendingPageRows = useMemo(
    () => pendingRows.slice((page - 1) * pageSize, page * pageSize),
    [pendingRows, page, pageSize],
  )

  // Which rows / total / states drive the active tab — the pending tab reads
  // from eligible-summary, every other tab from the work-assignment list.
  const activeRows = isPendingTab ? pendingPageRows : rows
  const activeTotal = isPendingTab ? pendingRows.length : wa.total
  const activeIsFetching = isPendingTab ? pending.isFetching : listQuery.isFetching
  const activeIsError = isPendingTab ? pending.isError : listQuery.isError

  const tabs: TabConfig[] = WA_TAB_IDS.map((id) => ({
    id,
    label: WA_TAB_LABEL[id],
    columns: id === 'pending' ? PENDING_COLUMNS : WORK_ASSIGNMENT_COLUMNS,
    data: tab === id ? activeRows : [],
    // When Pending is active its badge = the search-filtered row count shown
    // (the "active tab badge == its list total" rule); inactive Pending keeps
    // its unfiltered group count, so the active search doesn't move it.
    count: id === 'pending' && isPendingTab ? pendingRows.length : wa.tabTotal[id],
  }))

  // The stage column filter + sort belong to the list; the pending rollup takes
  // neither, so present it as unfiltered/unsorted.
  const listFilters: Record<string, string> = stageFilter ? { stage: stageFilter } : {}

  const onRowClick = (row: Record<string, unknown>) => {
    // A pending row is a GRN: open the issue wizard (manage-gated), not a WA.
    if (isPendingTab) {
      if (!canManage) return
      const grnBatchId = row._grnBatchId as string | null
      const warehouseId = row._warehouseId as string | undefined
      if (!grnBatchId || !warehouseId) return
      navigate(`/wms/work-assignments/new?warehouse_id=${warehouseId}&grn_batch_id=${grnBatchId}`)
      return
    }
    navigate(`/wms/work-assignments/${String(row.id)}`, {
      state: recordLabelState(row.wa_number as string | undefined),
    })
  }

  return (
    <ListPageShell
      title={S.list.title}
      subtitle={S.list.subtitle}
      actions={
        canManage ? (
          <Button onClick={() => navigate('/wms/work-assignments/new')}>
            <Plus className="size-4" />
            {S.list.newAction}
          </Button>
        ) : undefined
      }
    >
      <div className="bmt-search-md">
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
          showIndex
          cellFormatter={cellFormatter}
          tabs={tabs}
          activeTab={tab}
          onTabChange={(id) => lv.setActiveTab(id as WaTabId)}
          persistKey="wms-work-assignments"
          searchPlaceholder={S.list.searchPlaceholder}
          searchValue={search}
          onSearchChange={(q) => lv.setSearch(q)}
          // The issued-date range and engineer filter act on the work-assignment
          // list; they mean nothing for the pending GRN rollup, so hide them there.
          dateRange={
            isPendingTab
              ? undefined
              : {
                  value: dateRange,
                  onChange: (r) => lv.setFilters({ dateRange: r }),
                }
          }
          // Engineer ("Issued to") filter. A render-prop toolbar filter
          // so it can be the searchable AsyncSelect; `value` is kept set purely
          // so "Clear filters" detects it as active.
          toolbarFilters={
            isPendingTab
              ? []
              : [
                  {
                    key: 'issued_to_user_id',
                    label: S.columns.issuedTo,
                    value: issuedToUserId,
                    options: [],
                    render: () => (
                      <AsyncSelect
                        value={wa.engineerValue}
                        onValueChange={(next) =>
                          lv.setFilters({
                            issuedToUserId: next?.id ?? '',
                            issuedToName: next?.label ?? '',
                          })
                        }
                        useOptions={wa.useEngineerOptions}
                        toLabel={(e) => e.label}
                        searchable
                        loadOnOpen
                        clearable
                        placeholder={S.list.engineerFilterAll}
                        className="w-[190px]"
                      />
                    ),
                  },
                ]
          }
          renderFilter={(args) =>
            args.column.key === 'stage' ? (
              <WorkAssignmentStageFilter
                value={args.value}
                onChange={args.onChange}
                stageValues={wa.stageValues}
                stageLabel={wa.stageLabel}
              />
            ) : null
          }
          onClearFilters={() => lv.clearFilters()}
          onRowClick={onRowClick}
          serverPagination={{
            page,
            pageSize,
            total: activeTotal,
            isFetching: activeIsFetching,
            onPageChange: lv.setPage,
            onPageSizeChange: (size) => lv.setPageSize(size),
            filters: isPendingTab ? {} : listFilters,
            onFiltersChange: (next) => lv.setFilters({ stage: next.stage ?? '' }),
            filterOptions: isPendingTab ? {} : { stage: wa.stageValues },
            sort: isPendingTab
              ? { column: null, direction: null }
              : { column: sortColumn, direction: sortDirection },
            onSortChange: (col, dir) => lv.setSort(col, dir),
          }}
          emptyState={waEmptyState({
            isPendingTab,
            isError: activeIsError,
            hasPendingWarehouses: wa.pendingWarehouseIds.length > 0,
          })}
        />
      </div>
    </ListPageShell>
  )
}
