import { useNavigate } from 'react-router-dom'

import { WMS_LIST_MAX_CELL_CHARS } from '../../constants'

import { Checkbox } from '@/components/ui/checkbox'
import { Typography } from '@/components/ui/typography'
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from '@/components/common/tables/BusinessMetricsTable'

import {
  isActionableLineState,
  type useWorkAssignmentLinesView,
} from '../../hooks/work-assignments/useWorkAssignmentLinesView'
import { WorkAssignmentLineStateCell } from './WorkAssignmentLineStateCell'
import { WorkAssignmentLineStateFilter } from './WorkAssignmentLineStateFilter'
import {
  WORK_ASSIGNMENT_LINE_COLUMNS,
  WORK_ASSIGNMENT_LINE_STATE_OPTIONS,
} from './work-assignment-line.columns'
import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

interface WorkAssignmentLinesSectionProps {
  id: string
  isOpen: boolean
  lv: ReturnType<typeof useWorkAssignmentLinesView>
  lineRows: Record<string, unknown>[]
}

/** The server-paginated line table with its select column and state filter. */
export function WorkAssignmentLinesSection({ id, isOpen, lv, lineRows }: WorkAssignmentLinesSectionProps) {
  const navigate = useNavigate()
  const { selectedIds, page, pageSize, linesQuery, total } = lv

  // Leading select checkbox (actionable lines only) + the state badge; every
  // other column renders by default.
  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === 'select') {
      // Same gate as the header tick: a closed lot has nothing to act on.
      if (!isOpen || !isActionableLineState(row._stateRaw)) return { display: null }
      const lineId = String(row.id)
      return {
        display: (
          // Stop the row's navigate-to-device click when ticking the box.
          <span className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedIds.includes(lineId)}
              onCheckedChange={() => lv.toggle(lineId)}
              aria-label={String(row.serial)}
            />
          </span>
        ),
      }
    }
    if (key === 'state') return { display: <WorkAssignmentLineStateCell value={value} row={row} /> }
    return null
  }

  const tabs: TabConfig[] = [
    {
      id: 'lines',
      label: S.detail.lines,
      columns: WORK_ASSIGNMENT_LINE_COLUMNS,
      data: lineRows,
      count: total,
    },
  ]

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <Typography variant="card-title">
          {S.detail.lines} ({total})
        </Typography>
        {selectedIds.length > 0 ? (
          <Typography variant="helper" tone="muted">
            {S.detail.selectedCount(selectedIds.length)}
          </Typography>
        ) : null}
      </div>
      <div className="bmt-search-md">
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
          cellFormatter={cellFormatter}
          renderHeaderCell={(col) =>
            col.key === 'select' && lv.pageActionableIds.length > 0 ? (
              <span className="flex justify-center">
                <Checkbox
                  checked={lv.allPageSelected}
                  onCheckedChange={lv.toggleAllOnPage}
                  aria-label={S.detail.selectAll}
                />
              </span>
            ) : null
          }
          tabs={tabs}
          persistKey={`wms-wa-lines-${id}`}
          searchPlaceholder={S.detail.linesSearch}
          searchValue={lv.search}
          onSearchChange={lv.setSearch}
          onRowClick={(row) => navigate(`/wms/devices/${String(row._stockItemId)}`)}
          // Status filter shows the human LABEL (Outstanding / Completed / …);
          // the raw derived-state value is what's sent to the API (§18).
          renderFilter={(args) =>
            args.column.key === 'state' ? (
              <WorkAssignmentLineStateFilter value={args.value} onChange={args.onChange} />
            ) : null
          }
          onClearFilters={lv.clearFilters}
          serverPagination={{
            page,
            pageSize,
            total,
            isFetching: linesQuery.isFetching,
            onPageChange: lv.setPage,
            onPageSizeChange: lv.setPageSize,
            filters: lv.stateFilter ? { state: lv.stateFilter } : {},
            onFiltersChange: (next) => lv.setStateFilter(next.state),
            filterOptions: { state: [...WORK_ASSIGNMENT_LINE_STATE_OPTIONS] },
            sort: { column: lv.sortColumn, direction: lv.sortDirection },
            onSortChange: lv.setSort,
          }}
          emptyState={{ title: S.detail.linesEmpty }}
          error={
            linesQuery.isError
              ? { title: S.detail.linesLoadFailed, onRetry: () => void linesQuery.refetch() }
              : undefined
          }
        />
      </div>
    </section>
  )
}
