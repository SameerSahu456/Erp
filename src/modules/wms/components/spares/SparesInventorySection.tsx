/** Spares Inventory sub-table, server-paginated on its own (§16.7). */
import { useMemo } from 'react'

import { Typography } from '@/components/ui/typography'
import {
  BusinessMetricsTable,
  type CellFormatter,
  type TabConfig,
} from '@/components/common/tables/BusinessMetricsTable'
import { LoadErrorState } from '@shared/components/feedback/LoadErrorState'

import type { SparesInventoryPage } from '../../api'
import { WMS_PAGE_SIZE, WMS_LIST_MAX_CELL_CHARS } from '../../constants'
import { PartCell } from './PartCell'
import { inventoryColumns, toSpareInventoryRow } from './spares-body-helpers'
import { SPARES_STRINGS } from './spares.strings'

const inventoryCellFormatter: CellFormatter = (value, key, row) => {
  if (key === 'partNo') {
    return { display: <PartCell name={String(value)} sku={row.sku as string} /> }
  }
  if (key === 'available') {
    return {
      display: (
        <Typography variant="body-strong" asChild>
          <span>{String(value)}</span>
        </Typography>
      ),
    }
  }
  return null
}

interface SparesInventorySectionProps {
  query: {
    data: SparesInventoryPage | undefined
    isFetching: boolean
    isError: boolean
    error: unknown
  }
  page: number
  onPageChange: (page: number) => void
}

export function SparesInventorySection({ query, page, onPageChange }: SparesInventorySectionProps) {
  const inventoryItems = useMemo(() => query.data?.items ?? [], [query.data])
  const inventoryRows = useMemo(() => inventoryItems.map(toSpareInventoryRow), [inventoryItems])
  const inventoryTabs: TabConfig[] = [
    { id: 'inventory', label: SPARES_STRINGS.bodyView.tabs.inventory, columns: inventoryColumns, data: inventoryRows },
  ]

  return (
    <section className="space-y-3">
      <Typography variant="card-title" asChild>
        <h2>{SPARES_STRINGS.bodyView.inventoryHeading}</h2>
      </Typography>
      <BusinessMetricsTable
        maxCellChars={WMS_LIST_MAX_CELL_CHARS}
        filterSize="default" showIndex
        tabs={inventoryTabs}
        cellFormatter={inventoryCellFormatter}
        persistKey="wms-spares-inv"
        serverPagination={{
          page,
          pageSize: WMS_PAGE_SIZE,
          // `total` is the variant-group count from the API, never rows.length
          // — the table pages the server, no client-side slicing (§16.7).
          total: query.data?.total ?? 0,
          isFetching: query.isFetching,
          onPageChange,
        }}
        emptyNode={
          query.isError ? (
            <LoadErrorState
              error={query.error}
              fallback={SPARES_STRINGS.bodyView.inventoryEmpty.loadErrorTitle}
              noAccessTitle={SPARES_STRINGS.bodyView.inventoryEmpty.noAccessTitle}
              className="m-4"
            />
          ) : undefined
        }
        emptyState={{
          title: SPARES_STRINGS.bodyView.inventoryEmpty.emptyTitle,
          description: SPARES_STRINGS.bodyView.inventoryEmpty.defaultDescription,
        }}
      />
    </section>
  )
}
