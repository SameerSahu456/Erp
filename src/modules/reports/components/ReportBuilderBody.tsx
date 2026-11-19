import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { BarChart3, Download, Info, List, Printer, type LucideIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import type { CellFormatter } from '@/components/common/tables/BusinessMetricsTable'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { PageHeader } from '@/components/page-shells'

import { REPORT_STATUS_TONE } from '../constants/status-tone'
import { useReportBuilder, type ReportView } from '../hooks/useReportBuilder'
import { useReportData } from '../hooks/useReportData'
import type { ReportColumn, ReportRow } from '../types'
import { buildCsv, downloadCsv } from '../utils/export-csv'
import { formatValue, isNumericFormat } from '../utils/report-format'
import { ReportNav } from './ReportNav'
import { ReportResult } from './ReportResult'
import { ReportToolbar } from './ReportToolbar'
import { REPORT_BUILDER_STRINGS as S } from './report-builder.strings'

/** Stable empty list so memoised children don't re-run while rows load. */
const NO_ROWS: ReportRow[] = []

const VIEW_OPTIONS: { view: ReportView; icon: LucideIcon; label: string }[] = [
  { view: 'list', icon: List, label: S.actions.listView },
  { view: 'chart', icon: BarChart3, label: S.actions.chartView },
]

function makeCellFormatter(columns: ReportColumn[]): CellFormatter {
  const byKey = new Map(columns.map((c) => [c.key, c]))
  return (value, key) => {
    const col = byKey.get(key)
    if (!col) return null
    if (col.format === 'status' && typeof value === 'string') {
      return {
        display: (
          <StatusBadge variant={REPORT_STATUS_TONE[value] ?? 'neutral'}>{value}</StatusBadge>
        ),
      }
    }
    if (isNumericFormat(col.format) && typeof value === 'number') {
      const negative = value < 0
      return {
        display: formatValue(value, col.format),
        className: negative ? 'tabular-nums text-destructive' : 'tabular-nums',
      }
    }
    if (col.format === 'date') return { display: formatValue(value, 'date') }
    return null
  }
}

export function ReportBuilderBody() {
  const rb = useReportBuilder()
  const { report } = rb
  const CategoryIcon = report.categoryIcon
  // A report with nothing to plot always shows its list.
  const activeView: ReportView = report.chart ? rb.view : 'list'

  const data = useReportData(report.id, rb.range)
  const result = data.data
  const rows = result?.available ? result.rows : NO_ROWS
  // Nothing to export until rows have actually arrived.
  const canExport = !!result?.available && rows.length > 0

  const cellFormatter = useMemo(() => makeCellFormatter(report.columns), [report.columns])

  const handleExportCsv = useCallback(() => {
    const csv = buildCsv(report.columns, rows)
    const stamp = rb.range.from && rb.range.to ? `_${rb.range.from}_to_${rb.range.to}` : ''
    downloadCsv(`${report.id}${stamp}.csv`, csv)
    toast.success(S.toast.exported(report.label))
  }, [report, rows, rb.range])

  const handlePrint = useCallback(() => window.print(), [])

  const periodText =
    rb.range.from && rb.range.to
      ? `${formatValue(rb.range.from, 'date')} – ${formatValue(rb.range.to, 'date')}`
      : null

  return (
    <div className="space-y-5">
      <PageHeader
        title={S.page.title}
        subtitle={S.page.subtitle}
        breadcrumbs={[{ label: S.page.breadcrumb }]}
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-[272px]">
          <ReportNav
            categories={rb.visibleCategories}
            selectedId={report.id}
            selectedCategoryId={report.categoryId}
            onSelect={rb.selectReport}
            query={rb.query}
            onQueryChange={rb.setQuery}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {rb.unknownReportId && (
            <Alert className="print:hidden">
              <Info className="size-4" />
              <AlertDescription>
                {S.header.unknownReport(rb.unknownReportId, report.label)}
              </AlertDescription>
            </Alert>
          )}

          {/* Report header: what this report is, then the one filter (period). */}
          <Card className="gap-0 py-0">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 px-5 py-5">
              <div className="flex min-w-0 flex-1 basis-80 items-start gap-4">
                <span
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_4px_10px_-4px_rgb(var(--shadow-rgb)/0.35)]"
                  aria-hidden="true"
                >
                  <CategoryIcon className="size-5" />
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Typography asChild variant="helper" tone="default" className="font-medium">
                      <span>{report.categoryLabel}</span>
                    </Typography>
                    <Typography asChild variant="helper" tone="muted" numeric>
                      <span>· {S.header.position(report.position, report.categorySize)}</span>
                    </Typography>
                  </div>
                  <Typography variant="section-title">{report.label}</Typography>
                  <Typography variant="body" tone="muted" className="max-w-2xl">
                    {report.description}
                  </Typography>
                  {periodText && (
                    <Typography variant="helper" tone="muted" numeric className="hidden print:block">
                      {S.filters.period}: {periodText}
                    </Typography>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
                {report.chart && (
                  <div
                    role="group"
                    aria-label={S.actions.viewLabel}
                    className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
                  >
                    {VIEW_OPTIONS.map(({ view, icon: Icon, label }) => {
                      const active = view === activeView
                      return (
                        <Button
                          key={view}
                          type="button"
                          size="sm"
                          variant={active ? 'outline' : 'ghost'}
                          aria-pressed={active}
                          onClick={() => rb.setView(view)}
                          className={
                            active
                              ? 'border-border shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.08)] hover:bg-card'
                              : 'text-muted-foreground hover:bg-transparent hover:text-foreground'
                          }
                        >
                          <Icon className="size-4" />
                          {label}
                        </Button>
                      )
                    })}
                  </div>
                )}
                <Button type="button" size="sm" onClick={handleExportCsv} disabled={!canExport}>
                  <Download className="size-4" />
                  {S.actions.exportCsv}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="size-4" />
                  {S.actions.print}
                </Button>
              </div>
            </div>

            <div className="border-t border-border bg-muted/40 px-5 py-3 print:hidden">
              <ReportToolbar
                preset={rb.preset}
                range={rb.range}
                onPresetChange={rb.setPreset}
                onRangeChange={rb.setRange}
              />
            </div>
          </Card>

          <ReportResult
            report={report}
            query={data}
            rows={rows}
            view={activeView}
            cellFormatter={cellFormatter}
          />
        </div>
      </div>
    </div>
  )
}
