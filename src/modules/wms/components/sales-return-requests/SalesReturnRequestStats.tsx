import { CheckCircle2, Clock, PackageCheck, XCircle } from "lucide-react"

import { StatsRow } from "@/components/common/display/StatsRow"

import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"

/** Read-only KPI strip — the tab strip is the one place that switches views. */
export function SalesReturnRequestStats({ counts }: { counts: Partial<Record<string, number>> }) {
  return (
    <StatsRow
      stats={[
        { label: S.list.stats.pending, value: counts.pending_approval ?? 0, icon: Clock, accent: "warning" },
        { label: S.list.stats.approved, value: counts.approved ?? 0, icon: PackageCheck, accent: "info" },
        { label: S.list.stats.completed, value: counts.completed ?? 0, icon: CheckCircle2, accent: "success" },
        { label: S.list.stats.rejected, value: counts.rejected ?? 0, icon: XCircle, accent: "danger" },
      ]}
    />
  )
}
