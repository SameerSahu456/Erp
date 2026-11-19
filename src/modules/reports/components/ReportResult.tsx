import type { UseQueryResult } from '@tanstack/react-query'
import { DatabaseZap, Info } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { EmptyState } from '@/components/common/feedback/EmptyState'
import { BusinessMetricsTable } from '@/components/common/tables/BusinessMetricsTable'
import type { CellFormatter } from '@/components/common/tables/BusinessMetricsTable'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'
import { PAGINATION } from '@/shared/constants'

import type { CatalogReportResponse } from '../api/catalog-report'
import type { ReportEntry } from '../data/report-catalog'
import type { ReportView } from '../hooks/useReportBuilder'
import type { ReportRow } from '../types'
import { ReportChart } from './ReportChart'
import { ReportSummary } from './ReportSummary'
import { REPORT_BUILDER_STRINGS as S } from './report-builder.strings'

const REPORTS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

interface ReportResultProps {
  report: ReportEntry
  query: UseQueryResult<CatalogReportResponse>
  /** The fetched rows, or an empty list while loading / unavailable. */
  rows: ReportRow[]
  view: ReportView
  cellFormatter: CellFormatter
}

/** Everything below the report header: the loading, error and "not available
 *  yet" states, then the headline numbers and the list or chart. */
export function ReportResult({ report, query, rows, view, cellFormatter }: ReportResultProps) {
  const result = query.data
  const isLoading = query.isPending && query.fetchStatus !== 'idle'
  const unavailableReason = result && !result.available ? result.unavailable_reason : null

  return (
    <>
      {result?.available && result.snapshot && (
        <Alert className="print:hidden">
          <Info className="size-4" />
          <AlertDescription>{S.notice.snapshot}</AlertDescription>
        </Alert>
      )}
      {result?.available && result.truncated && (
        <Alert className="print:hidden">
          <Info className="size-4" />
          <AlertDescription>{S.notice.truncated(rows.length)}</AlertDescription>
        </Alert>
      )}

      {query.isError ? (
        <LoadErrorState error={query.error} fallback={S.notice.loadFailed} />
      ) : isLoading ? (
        <div className="space-y-4" aria-busy="true" aria-label={S.notice.loading}>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : unavailableReason ? (
        <Card>
          <EmptyState
            icon={DatabaseZap}
            title={S.notice.unavailableTitle}
            description={unavailableReason}
          />
        </Card>
      ) : !result ? (
        <Card>
          <EmptyState title={S.notice.pickDatesTitle} description={S.notice.pickDatesDescription} />
        </Card>
      ) : (
        <>
          <ReportSummary kpis={report.kpis ?? []} rows={rows} />

          {view === 'chart' && report.chart ? (
            <ReportChart
              key={report.id}
              chart={report.chart}
              columns={report.columns}
              rows={rows}
            />
          ) : (
            <section className="space-y-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
                <div className="flex items-baseline gap-2">
                  <Typography variant="card-title">{S.table.title}</Typography>
                  <Typography variant="helper" tone="muted" numeric>
                    {S.header.rowCount(rows.length)}
                  </Typography>
                </div>
                <Typography variant="helper" tone="muted" className="print:hidden">
                  {S.table.hint}
                </Typography>
              </div>
              <BusinessMetricsTable
                key={report.id}
                tabs={[
                  {
                    id: report.id,
                    label: report.label,
                    columns: report.columns,
                    data: rows,
                  },
                ]}
                cellFormatter={cellFormatter}
                pageSize={REPORTS_PAGE_SIZE}
                showIndex={false}
                searchPlaceholder={S.table.searchPlaceholder}
                emptyState={{
                  title: S.table.emptyTitle,
                  description: result.snapshot
                    ? S.table.emptySnapshotDescription
                    : S.table.emptyDescription,
                }}
              />
            </section>
          )}
        </>
      )}
    </>
  )
}
