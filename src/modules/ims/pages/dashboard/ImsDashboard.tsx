import { useMemo } from 'react'
import {
  Package,
  AlertTriangle,
  FolderTree,
  Layers,
  Boxes,
  Building2,
} from 'lucide-react'

import { StatsRow } from '@/components/common/display/StatsRow'
import { PageHeader } from '@/components/page-shells'
import { Typography } from '@/components/ui/typography'
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from '@/components/common/tables/BusinessMetricsTable'

import { useStatsOverview } from '../../hooks/dashboard/useStats'
import { useAllCategories } from '../../hooks/categories/useCategories'
import { IMS_DASHBOARD_STRINGS } from './dashboard.strings'

const numberFmt = new Intl.NumberFormat('en-IN')
const qtyFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 })

export default function ImsDashboard() {
  const { data: stats, isLoading: statsLoading, isError: statsError } = useStatsOverview()
  // Full category list (all pages) so the Stock Summary tab's filter /
  // search operates over every category, not just the first page.
  const { data: categories = [], isLoading: catsLoading } = useAllCategories()

  const totals = stats?.totals

  // ── Stat row from `/stats/overview` ───────────────────────────────────────
  const headlineStats = [
    {
      label: IMS_DASHBOARD_STRINGS.stats.parts,
      value: totals?.parts != null ? numberFmt.format(totals.parts) : '—',
      icon: Package,
      accent: 'primary' as const,
    },
    {
      label: IMS_DASHBOARD_STRINGS.stats.variants,
      value: totals?.variants != null ? numberFmt.format(totals.variants) : '—',
      icon: Layers,
      accent: 'violet' as const,
    },
    {
      label: IMS_DASHBOARD_STRINGS.stats.stockItems,
      value: totals?.stock_items != null ? numberFmt.format(totals.stock_items) : '—',
      icon: Boxes,
      accent: 'teal' as const,
    },
    {
      label: IMS_DASHBOARD_STRINGS.stats.categories,
      value: totals?.categories != null ? numberFmt.format(totals.categories) : '—',
      icon: FolderTree,
      accent: 'primary' as const,
    },
    {
      label: IMS_DASHBOARD_STRINGS.stats.brandOems,
      value: totals?.oems != null ? numberFmt.format(totals.oems) : '—',
      icon: Building2,
      accent: 'violet' as const,
    },
    {
      label: IMS_DASHBOARD_STRINGS.stats.zeroStockVariants,
      value:
        stats?.zero_stock_variants != null
          ? numberFmt.format(stats.zero_stock_variants)
          : '—',
      icon: AlertTriangle,
      accent: 'warning' as const,
      // `trend` removed 2026-05-29 per product request — the StatCard
      // renders trend.value as a percentage pill ("2171%"), but the
      // underlying number is the raw count of zero-stock variants, not
      // a percentage delta. The count is already the main `value`
      // above, so the trend was both visually wrong and redundant.
    },
  ]

  // ── Stock Summary tab — server-rolled `part_count` (Items Count) and
  //    `available_stock_qty` (Total Qty). A "Total Value" (₹) column was
  //    requested but the backend's CategoryResponse carries no monetary
  //    rollup, so it's intentionally omitted rather than faked. ──────────────
  const categoryRows = useMemo(
    () =>
      categories.map((c) => ({
        name: c.name,
        itemsCount: c.part_count ?? 0,
        totalQty: Number(c.available_stock_qty ?? 0),
      })),
    [categories],
  )

  const categoriesTab: TabConfig = {
    id: 'by-category',
    label: IMS_DASHBOARD_STRINGS.stockSummary.title,
    columns: [
      { key: 'name', label: IMS_DASHBOARD_STRINGS.stockSummary.category, sortable: true, filterable: true },
      { key: 'itemsCount', label: IMS_DASHBOARD_STRINGS.stockSummary.itemsCount, sortable: true, align: 'right' },
      { key: 'totalQty', label: IMS_DASHBOARD_STRINGS.stockSummary.totalQty, sortable: true, align: 'right' },
    ],
    data: categoryRows,
  }

  const cellFormatter: CellFormatter = (value, key) => {
    if (typeof value === 'number' && key === 'itemsCount') {
      return { display: numberFmt.format(value) }
    }
    if (typeof value === 'number' && key === 'totalQty') {
      return { display: qtyFmt.format(value) }
    }
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={IMS_DASHBOARD_STRINGS.page.title}
        subtitle={IMS_DASHBOARD_STRINGS.page.subtitle}
      />

      {statsError ? (
        <Typography asChild variant="body" tone="danger">
          <div
            className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3"
            role="alert"
          >
            {IMS_DASHBOARD_STRINGS.page.statsError}
          </div>
        </Typography>
      ) : null}

      <StatsRow stats={headlineStats} />

      <BusinessMetricsTable
        className="ims-bmt-compact-filters"
        tabs={[categoriesTab]}
        alwaysShowTabs
        showIndex
        cellFormatter={cellFormatter}
        emptyState={{
          title: statsLoading || catsLoading ? IMS_DASHBOARD_STRINGS.table.loadingTitle : IMS_DASHBOARD_STRINGS.table.emptyTitle,
          description:
            statsLoading || catsLoading
              ? IMS_DASHBOARD_STRINGS.table.loadingDescription
              : IMS_DASHBOARD_STRINGS.table.emptyDescription,
        }}
      />
    </div>
  )
}
