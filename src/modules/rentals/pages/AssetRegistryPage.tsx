import { useMemo, useCallback } from 'react'
import { toast } from 'sonner'

import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow } from '@/components/common/StatsRow'
import { BusinessMetricsTable, type TabConfig, type CellFormatter } from '@/components/common/BusinessMetricsTable'
import { ListPageShell } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Download, Plus } from 'lucide-react'
import type { DataCardProps } from '@/components/common/DataCard'
import { mockRentalAssets } from '../data/assets'
import { ASSET_CATEGORY_LABELS, type RentalAssetStatus } from '../types'

const STATUS_VARIANT: Record<RentalAssetStatus, StatusBadgeVariant> = {
  'In Warehouse': 'neutral',
  'Staged': 'info',
  'In Transit (Out)': 'info',
  'Deployed': 'success',
  'Return Initiated': 'warning',
  'Return In Transit': 'warning',
  'Received (GRN)': 'info',
  'In Repair': 'error',
  'Advance Replaced': 'warning',
  'Retired/Scrapped': 'error',
}

const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN')}`

function AssetRegistryPage() {
  const stats = useMemo(() => {
    const total = mockRentalAssets.length
    const deployed = mockRentalAssets.filter((a) => a.status === 'Deployed').length
    const warehouse = mockRentalAssets.filter((a) => a.status === 'In Warehouse' || a.status === 'Staged').length
    const inRepair = mockRentalAssets.filter((a) => a.status === 'In Repair').length
    const totalValue = mockRentalAssets.reduce((s, a) => s + a.bookValue, 0)
    return { total, deployed, warehouse, inRepair, totalValue }
  }, [])

  const kpiStats: DataCardProps[] = [
    { label: 'Total Assets', value: String(stats.total), sub: `Book value: ${fmtINR(stats.totalValue)}` },
    { label: 'Deployed', value: String(stats.deployed), sub: `${Math.round((stats.deployed / stats.total) * 100)}% utilization` },
    { label: 'In Warehouse', value: String(stats.warehouse) },
    { label: 'In Repair', value: String(stats.inRepair) },
  ]

  const rows = useMemo(() => mockRentalAssets.map((a) => ({
    id: a.id,
    uid: a.uid,
    category: ASSET_CATEGORY_LABELS[a.category],
    oem: a.oem,
    model: a.model,
    status: a.status,
    location: a.currentLocation,
    customer: a.customerName ?? '-',
    bookValue: a.bookValue,
    warranty: a.warrantyStatus,
    dataWipe: a.dataWipeCertStatus,
    _status: a.status,
  })), [])

  const columns = [
    { key: 'uid', label: 'UID', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'oem', label: 'OEM' },
    { key: 'model', label: 'Model', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'location', label: 'Location' },
    { key: 'customer', label: 'Customer' },
    { key: 'bookValue', label: 'Book Value', sortable: true, align: 'right' as const },
    { key: 'warranty', label: 'Warranty' },
    { key: 'dataWipe', label: 'Data Wipe' },
  ]

  const tabs: TabConfig[] = useMemo(() => [
    { id: 'all', label: `All (${rows.length})`, columns, data: rows },
    { id: 'deployed', label: `Deployed (${rows.filter((r) => r._status === 'Deployed').length})`, columns, data: rows.filter((r) => r._status === 'Deployed') },
    { id: 'warehouse', label: `In Warehouse (${rows.filter((r) => r._status === 'In Warehouse' || r._status === 'Staged').length})`, columns, data: rows.filter((r) => r._status === 'In Warehouse' || r._status === 'Staged') },
    { id: 'repair', label: `In Repair (${rows.filter((r) => r._status === 'In Repair').length})`, columns, data: rows.filter((r) => r._status === 'In Repair') },
  ], [rows])

  const cellFormatter: CellFormatter = useCallback((value, key) => {
    if (key === 'uid') return { display: <span className="cpt-mono" style={{ fontWeight: 550 }}>{String(value)}</span> }
    if (key === 'status') {
      const v = STATUS_VARIANT[value as RentalAssetStatus] ?? 'neutral'
      return { display: <StatusBadge variant={v}>{String(value)}</StatusBadge> }
    }
    if (key === 'bookValue') return { display: <span className="cpt-num" style={{ fontWeight: 550 }}>{fmtINR(value as number)}</span> }
    if (key === 'warranty') {
      const v = value === 'Active' ? 'success' : value === 'Expired' ? 'error' : 'neutral'
      return { display: <StatusBadge variant={v as StatusBadgeVariant}>{String(value)}</StatusBadge> }
    }
    if (key === 'dataWipe') {
      if (value === 'Not Requested') return { display: <span className="cpt-muted">-</span> }
      const v = value === 'Issued' || value === 'Delivered' ? 'success' : value === 'In Progress' ? 'warning' : 'info'
      return { display: <StatusBadge variant={v as StatusBadgeVariant}>{String(value)}</StatusBadge> }
    }
    return null
  }, [])

  return (
    <ListPageShell
      title="Asset Registry"
      subtitle={`UID-tracked assets across the Rentr fleet — ${stats.total} assets, ${fmtINR(stats.totalValue)} book value.`}
      breadcrumbs={[{ label: 'Rentals' }, { label: 'Assets' }]}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => toast.success('CSV exported')}>
            <Download className="mr-1.5 size-4" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => toast.success('New asset form')}>
            <Plus className="mr-1.5 size-4" />
            Register Asset
          </Button>
        </>
      }
      stats={<StatsRow stats={kpiStats} />}
    >
      <BusinessMetricsTable
        tabs={tabs}
        cellFormatter={cellFormatter}
        persistKey="rentals-assets"
        emptyState={{
          title: 'No assets registered',
          description: 'Register assets to make them available for rental contracts.',
        }}
      />
    </ListPageShell>
  )
}

export default AssetRegistryPage
