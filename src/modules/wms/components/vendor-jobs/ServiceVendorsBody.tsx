/**
 * The service-vendor master — one row per (section, vendor).
 *
 * A partner servicing two sections is TWO rows and appears in both pickers,
 * which is what the old paint-vendor master could not express. The default
 * flag is PER SECTION, so the label says which section it is default for —
 * anyone who remembers the old single global default would otherwise misread
 * it.
 *
 * Search, sort and pagination are all SERVER-SIDE (`useServiceVendorsSearch`):
 * only the current page is ever fetched, the tab count is the server total, and
 * a header click / search keystroke refetches. The plain `useServiceVendors`
 * array stays the picker source — a picker needs every vendor for its section.
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

import { useServiceVendorsList } from '../../hooks/vendor-jobs/useServiceVendorsList'

import { ServiceVendorDialog } from './ServiceVendorDialog'
import { SERVICE_VENDORS_STRINGS as S } from './service-vendors.strings'

const formatVendorCell: CellFormatter = (value, key) => {
  if (key === 'active') {
    return {
      display: (
        <StatusBadge variant={value === S.active.yes ? 'success' : 'neutral'}>
          {String(value)}
        </StatusBadge>
      ),
    }
  }
  if (
    key === 'vendor' ||
    key === 'contact' ||
    key === 'section' ||
    key === 'notes'
  ) {
    return { display: <TruncatedText value={String(value)} className="max-w-full" /> }
  }
  return null
}

export function ServiceVendorsBody() {
  const c = useServiceVendorsList()
  const { page, pageSize, data, isError, canManage, openCreate, items, editing } = c
  // §12: on error, offer a retry (even read-only); else add, only for someone who may create.
  let emptyAction: { label: string; onClick: () => void } | undefined
  if (isError) emptyAction = { label: S.empty.retry, onClick: () => void c.refetch() }
  else if (canManage) emptyAction = { label: S.addVendor, onClick: openCreate }

  return (
    <>
      <ListPageShell
        title={S.title}
        subtitle={S.subtitle}
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus className="size-4" data-icon="inline-start" />
              {S.addVendor}
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
          persistKey="wms-service-vendors"
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
          cellFormatter={formatVendorCell}
          onRowClick={
            // No dead clickable affordance for a read-only user — omit the handler (§0.9).
            canManage
              ? (row) => {
                  const match = items.find((v) => v.id === row.id)
                  if (match) c.openEdit(match)
                }
              : undefined
          }
          emptyState={{
            title: isError ? S.empty.errorTitle : S.empty.title,
            description: isError ? S.empty.errorDescription : S.empty.description,
            action: emptyAction,
          }}
        />
      </ListPageShell>

      <ServiceVendorDialog
        key={`${editing?.id ?? 'create'}-${c.dialogNonce}`}
        open={c.dialogOpen}
        editing={editing}
        onClose={() => c.setDialogOpen(false)}
      />
    </>
  )
}
