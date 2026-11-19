import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { recordLabelState } from '@shared/routing/record-label'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { OverflowPillList } from '@/components/common/display/OverflowPillList'
import {
  BusinessMetricsTable,
  type CellFormatter,
} from '@/components/common/tables/BusinessMetricsTable'
import { ListPageShell } from '@/components/page-shells'

import { WmsStatsCards } from '../shared/WmsStatsCards'
import { useInwardListView } from '../../hooks/inwards/useInwardListView'
import type { GrnBatchStatus, InwardType } from '../../api'
import {
  INWARD_TYPE_LABELS,
  INWARD_TYPE_VARIANT,
  GRN_STATUS_LABELS,
  GRN_STATUS_VARIANT,
  WMS_LIST_MAX_CELL_CHARS,
} from '../../constants'
import { INWARD_PAGE_STRINGS } from './inward-list.strings'
import type { InwardTabId } from './inward-list-helpers'
import { InwardTypeColumnFilter } from './InwardTypeColumnFilter'

const renderFilter = ({
  column,
  value,
  onChange,
}: {
  column: { key: string }
  value: string | undefined
  onChange: (v: string) => void
}) => {
  if (column.key !== 'inwardType') return null
  return <InwardTypeColumnFilter value={value} onChange={onChange} />
}

const cellFormatter: CellFormatter = (value, key) => {
  if (key === 'batchNumber') {
    // Plain text, not a link — the whole row already navigates to the batch
    // (onRowClick). A blue underlined GRN read as a separate action.
    return {
      display: <Typography variant="body-strong">{value as string}</Typography>,
    }
  }
  if (key === 'category') {
    const cats = (value as { id: string; name: string }[]) ?? []
    return {
      display: (
        <OverflowPillList
          items={cats}
          getItemKey={(c) => c.id}
          getItemLabel={(c) => c.name}
          size="default"
          summaryLabel={INWARD_PAGE_STRINGS.categoryPills.summaryLabel}
          hoverTitle={INWARD_PAGE_STRINGS.categoryPills.hoverTitle}
        />
      ),
    }
  }
  if (key === 'inwardType') {
    const typeCode = value as InwardType
    return {
      display: (
        <StatusBadge variant={INWARD_TYPE_VARIANT[typeCode] ?? 'neutral'}>
          {INWARD_TYPE_LABELS[typeCode] ?? typeCode}
        </StatusBadge>
      ),
    }
  }
  if (key === 'status') {
    const status = value as GrnBatchStatus
    return {
      display: (
        <StatusBadge variant={GRN_STATUS_VARIANT[status] ?? 'neutral'}>
          {GRN_STATUS_LABELS[status] ?? status}
        </StatusBadge>
      ),
    }
  }
  return null
}

/** Inward (GRN batch) list — thin shell over useInwardListView. */
export function InwardListBody() {
  const navigate = useNavigate()
  const lv = useInwardListView()
  const { view, patchView, batchesQuery, canManageInward } = lv
  const { search, inwardType, sortColumn, sortDirection, page, pageSize } = view

  return (
    <ListPageShell
      title={INWARD_PAGE_STRINGS.page.title}
      subtitle={INWARD_PAGE_STRINGS.page.subtitle}
      actions={
        // Read-only inward users would only get a 403 on the create route.
        canManageInward ? (
          <Button onClick={() => navigate('/wms/inward/new')}>
            <Plus className="size-4" data-icon="inline-start" />
            {INWARD_PAGE_STRINGS.page.createButton}
          </Button>
        ) : null
      }
    >
      <div className="mb-6">
        <WmsStatsCards scope="inward" warehouseIds={lv.selectedWarehouseIds} />
      </div>
      <div className="bmt-search-md">
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default" showIndex
          searchPlaceholder={INWARD_PAGE_STRINGS.search.placeholder}
          tabs={lv.tabs}
          activeTab={lv.activeTab}
          onTabChange={(tabId) => {
            // Switch the GRN-status bucket; filters/sort stay (global) and the
            // page resets to 1 for the new bucket.
            lv.changeTab(tabId as InwardTabId)
          }}
          cellFormatter={cellFormatter}
          persistKey="wms-inward"
          onRowClick={(row) =>
            navigate(`/wms/inward/${row.id}/devices`, {
              state: recordLabelState(row.batchNumber),
            })
          }
          searchValue={search}
          onSearchChange={(q) => {
            // Per tab: patch only this tab's search + reset its page.
            patchView({ search: q, page: 1 })
          }}
          renderFilter={renderFilter}
          dateRange={{
            value: lv.dateRange,
            // Received/created date filter — a future date is never valid.
            disableFuture: true,
            onChange: (r) => {
              // A lone start date means that single day, not an open-ended range.
              const range = r?.from && !r.to ? { from: r.from, to: r.from } : r
              patchView({ dateRange: range, page: 1 })
            },
          }}
          onClearFilters={() => {
            // Clear only THIS tab's filters + search and reset its page.
            patchView({ inwardType: '', dateRange: undefined, search: '', page: 1 })
          }}
          serverPagination={{
            page,
            pageSize,
            total: lv.total,
            isFetching: batchesQuery.isFetching,
            onPageChange: lv.setPage,
            onPageSizeChange: (size) => {
              // Page size is per tab — patch only this tab and reset its page.
              patchView({ pageSize: size, page: 1 })
            },
            sort: { column: sortColumn, direction: sortDirection },
            onSortChange: (col, dir) => {
              // Sort is per tab — patch only this tab and reset its page.
              patchView({ sortColumn: col, sortDirection: dir, page: 1 })
            },
            // Inward Type column filter → the per-tab `inwardType` value.
            filters: inwardType ? { inwardType } : {},
            onFiltersChange: (next) => {
              const raw = next.inwardType
              const clean = raw && raw !== '__all__' ? (raw as InwardType) : ''
              patchView({ inwardType: clean, page: 1 })
            },
          }}
          emptyState={{
            title: batchesQuery.isError
              ? INWARD_PAGE_STRINGS.empty.errorTitle
              : INWARD_PAGE_STRINGS.empty.title,
            description: batchesQuery.isError
              ? INWARD_PAGE_STRINGS.empty.errorDescription
              : INWARD_PAGE_STRINGS.empty.description,
            action: batchesQuery.isError || !canManageInward
              ? undefined
              : {
                  label: INWARD_PAGE_STRINGS.page.createButton,
                  onClick: () => navigate('/wms/inward/new'),
                },
          }}
        />
      </div>
    </ListPageShell>
  )
}
