import type { ReactNode } from "react"
import { WORKFLOW_LABELS } from "@modules/wms"

import { cn } from "@/lib/utils"

import { DETAIL_S } from "./po-detail-helpers"

const T = DETAIL_S.devices.stageTabs

interface StageTab {
  /** Workflow stage code; "" = All. */
  value: string
  label: string
  count: number
}

/** Tabs to show: All, then every stage holding at least one of this PO's
 *  devices (in pipeline order). The selected stage stays visible even when a
 *  filter drops its count to 0, so the user can always see — and leave — it. */
function buildTabs(
  total: number,
  byStage: Record<string, number>,
  selected: string,
): StageTab[] {
  const stages = Object.entries(WORKFLOW_LABELS)
    .filter(([code]) => (byStage[code] ?? 0) > 0 || code === selected)
    .map(([code, label]) => ({ value: code, label, count: byStage[code] ?? 0 }))
  return [{ value: "", label: T.all, count: total }, ...stages]
}

/** Stage tabs above the Devices table, drawn like every list page's status tabs
 *  (`cpt-tab`). Counts come from one /devices/stats call under every OTHER
 *  active filter, so they move with the filter bar (§1.1-H). */
export function PODeviceStageTabs({
  total,
  byStage,
  value,
  onChange,
  trailing,
}: {
  total: number
  byStage: Record<string, number>
  value: string
  onChange: (stage: string) => void
  /** Shown at the right end of the row (the filter bar's Clear). */
  trailing?: ReactNode
}) {
  const tabs = buildTabs(total, byStage, value)
  return (
    <div role="tablist" aria-label={T.ariaLabel} className="cpt-tabs px-[18px]">
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value || "all"}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn("cpt-tab", active && "active")}
          >
            {tab.label}
            <span className={cn("cpt-tab-count", active && "active")}>{tab.count}</span>
          </button>
        )
      })}
      {trailing}
    </div>
  )
}
