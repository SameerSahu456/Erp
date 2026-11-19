import { CheckCircle2, Clock, Truck, XCircle } from "lucide-react"

import { StatsRow } from "@/components/common/display/StatsRow"

import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

interface Props {
  /** UNFILTERED counts — never the filter-aware tab-badge counts. */
  counts: Partial<Record<string, number>>
  onPick: (tabId: string) => void
}

/** Headline KPI strip; each card jumps to its status tab. */
export function ReplacementRequestStats({ counts, onPick }: Props) {
  return (
    <StatsRow
      stats={[
        {
          label: S.list.stats.pending,
          value: counts.pending_approval ?? 0,
          icon: Clock,
          accent: "warning",
          onClick: () => onPick("pending_approval"),
        },
        {
          label: S.list.stats.inProgress,
          value: counts.in_progress ?? 0,
          icon: Truck,
          accent: "info",
          onClick: () => onPick("in_progress"),
        },
        {
          label: S.list.stats.completed,
          value: counts.completed ?? 0,
          icon: CheckCircle2,
          accent: "success",
          onClick: () => onPick("completed"),
        },
        {
          label: S.list.stats.rejected,
          value: counts.rejected ?? 0,
          icon: XCircle,
          accent: "danger",
          onClick: () => onPick("rejected"),
        },
      ]}
    />
  )
}
