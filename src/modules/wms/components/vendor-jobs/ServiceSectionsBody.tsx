/**
 * The service-section master — the screen that makes "a new section is a row"
 * literally true for an operator, not just for a seed script.
 *
 * Search, sort and pagination are SERVER-SIDE (`useServiceSectionsSearch`): only
 * the current page is fetched and the tab count is the server total. The plain
 * `useServiceSections` array stays the sidebar-nav + picker source.
 */
import { WMS_LIST_MAX_CELL_CHARS } from "../../constants";
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ListPageShell } from '@/components/page-shells'
import {
  BusinessMetricsTable,
  type CellFormatter,
} from '@/components/common/tables/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { TruncatedText } from '@/components/common/display/TruncatedText'
import { OverflowPillList } from '@/components/common/display/OverflowPillList'

import { useServiceSectionsList } from '../../hooks/vendor-jobs/useServiceSectionsList'

import { ServiceSectionDialog } from './ServiceSectionDialog'
import { SERVICE_SECTIONS_STRINGS as S } from './service-sections.strings'

const formatSectionCell: CellFormatter = (value, key) => {
  if (key === 'active' || key === 'tracksReplacement' || key === 'appliesToServers') {
    return {
      display: (
        <StatusBadge variant={value === S.yes ? 'success' : 'neutral'}>
          {String(value)}
        </StatusBadge>
      ),
    }
  }
  if (key === 'name' || key === 'statusLabel') {
    return { display: <TruncatedText value={String(value)} className="max-w-full" /> }
  }
  if (key === 'items') {
    // Each suggested item is its own entity — shown as pills, the same
    // way the Inward listing renders its category column.
    const list = Array.isArray(value) ? (value as string[]) : []
    return {
      display: (
        <OverflowPillList
          items={list}
          getItemLabel={(x) => x}
          getItemKey={(x, i) => `${x}-${i}`}
          size="default"
          summaryLabel={S.itemsPillsSummary}
          hoverTitle={S.itemsPillsHover}
          emptyLabel={S.itemsEmpty}
        />
      ),
    }
  }
  return null
}

export function ServiceSectionsBody() {
  const c = useServiceSectionsList()
  const { page, pageSize, data, isError, canCreateSection, canEditSection, openCreate } = c
  // §12: on error, offer a retry; otherwise the add action (create tier, WM/SM).
  let emptyAction: { label: string; onClick: () => void } | undefined
  if (isError) emptyAction = { label: S.empty.retry, onClick: () => void c.refetch() }
  else if (canCreateSection) emptyAction = { label: S.addSection, onClick: openCreate }

  return (
    <>
      <ListPageShell
        title={S.title}
        subtitle={S.subtitle}
        actions={
          canCreateSection ? (
            <Button onClick={openCreate}>
              <Plus className="size-4" data-icon="inline-start" />
              {S.addSection}
            </Button>
          ) : undefined
        }
      >
        <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
          showIndex
          alwaysShowTabs
          tabs={c.tabs}
          activeTab="all"
          persistKey="wms-service-sections"
          searchValue={c.search}
          searchPlaceholder={S.searchPlaceholder}
          onSearchChange={c.changeSearch}
          toolbarFilters={c.toolbarFilters}
          onToolbarFilterChange={c.changeToolbarFilter}
          onClearFilters={c.clearFilters}
          serverPagination={{
            page,
            pageSize: data?.page_size ?? pageSize,
            total: data?.total ?? 0,
            isFetching: c.isFetching,
            onPageChange: c.setPage,
            onPageSizeChange: c.changePageSize,
            sort: { column: c.sortColumn, direction: c.sortDirection },
            onSortChange: c.changeSort,
          }}
          cellFormatter={formatSectionCell}
          onRowClick={
            // Edit is the service-vendor manage tier — no dead row affordance otherwise (§0.9).
            canEditSection ? (row) => c.openEdit(row.id) : undefined
          }
          emptyState={{
            title: isError ? S.empty.errorTitle : S.empty.title,
            description: isError ? S.empty.errorDescription : S.empty.description,
            action: emptyAction,
          }}
        />
      </ListPageShell>

      <ServiceSectionDialog
        key={c.editing?.id ?? 'create'}
        open={c.dialogOpen}
        editing={c.editing}
        onClose={() => c.setDialogOpen(false)}
      />
    </>
  )
}
