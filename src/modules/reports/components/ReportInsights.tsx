import {
  ArrowDownToLine,
  Clock,
  Minus,
  Sigma,
  TrendingDown,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

import { Typography } from '@/components/ui/typography'

import type { InsightKind, ReportInsight } from '../utils/report-insights'
import { formatValue } from '../utils/report-format'
import { REPORT_BUILDER_STRINGS as S } from './report-builder.strings'

interface ReportInsightsProps {
  insights: ReportInsight[]
  rowCount: number
}

const KIND_ICON: Record<InsightKind, LucideIcon> = {
  highest: Trophy,
  lowest: ArrowDownToLine,
  average: Sigma,
  peak: Trophy,
  latest: Clock,
  change: TrendingUp,
}

const signedPercent = (v: number) => `${v > 0 ? '+' : ''}${formatValue(v, 'percent')}`

/** What to print for one takeaway: the headline (a name or a number) and the
 *  supporting line under it. */
function describe(insight: ReportInsight, rowCount: number) {
  const value = formatValue(insight.value, insight.format)
  switch (insight.kind) {
    case 'average':
      return { icon: KIND_ICON.average, headline: value, detail: S.insights.acrossRows(rowCount) }
    case 'change': {
      const icon = insight.value > 0 ? TrendingUp : insight.value < 0 ? TrendingDown : Minus
      return {
        icon,
        headline: insight.value === 0 ? S.insights.noChange : signedPercent(insight.value),
        detail: S.insights.changeDetail(insight.fromName ?? '', insight.toName ?? ''),
      }
    }
    default: {
      const share =
        insight.sharePct === undefined
          ? ''
          : ` · ${S.insights.shareOfTotal(formatValue(insight.sharePct, 'percent'))}`
      return {
        icon: KIND_ICON[insight.kind],
        headline: insight.name || '—',
        detail: `${value}${share}`,
      }
    }
  }
}

/** "At a glance" strip: the two or three things a reader would otherwise have
 *  to work out from the chart themselves, stated in words. */
export function ReportInsights({ insights, rowCount }: ReportInsightsProps) {
  if (insights.length === 0) return null
  return (
    <section aria-label={S.insights.title} className="border-b border-border bg-muted/40">
      <ul className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {insights.map((insight) => {
          const { icon: Icon, headline, detail } = describe(insight, rowCount)
          return (
            <li key={insight.kind} className="flex min-w-0 items-start gap-3 px-5 py-3.5">
              <span
                className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"
                aria-hidden="true"
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <Typography variant="badge" tone="muted" className="block">
                  {S.insights[insight.kind]}
                </Typography>
                <Typography variant="body-strong" truncate numeric title={headline}>
                  {headline}
                </Typography>
                <Typography variant="helper" tone="muted" truncate numeric title={detail}>
                  {detail}
                </Typography>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
