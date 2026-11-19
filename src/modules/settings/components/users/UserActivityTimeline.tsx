import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { TablePagination } from "@/components/common/tables/TablePagination"
import { USER_ACTIVITY_PAGE_SIZE } from "@modules/crm"

import { type UserActivityTimelineProps } from "./user-activity.types"
import { useUserActivityTimelineState } from "./useUserActivityTimelineState"
import { useUserActivityTimelineData } from "./useUserActivityTimelineData"
import { ActivityFilters } from "./ActivityFilters"
import { ActivityTimelineList } from "./ActivityTimelineList"

export function UserActivityTimeline({
  userId,
  mode = "pager",
  onBeforeNavigate,
  stackFilters = false,
  urlKey,
  fillHeight = false,
}: UserActivityTimelineProps) {
  const navigate = useNavigate()

  const {
    activeFilter,
    setActiveFilter,
    page,
    setPage,
    dateRange,
    setDateRange,
    date_from,
    date_to,
    expandedChanges,
    toggleChanges,
  } = useUserActivityTimelineState(urlKey)

  // Callback-ref state for the scroll-mode infinite loader (refs alone don't
  // re-run the effect when the sheet remounts the content). §16.11.
  const [scrollerNode, setScrollerNode] = useState<HTMLDivElement | null>(null)
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null)

  const {
    isLoading,
    isError,
    error,
    total,
    totalPages,
    groups,
    hasNextPage,
    onScroll,
    onWheel,
  } = useUserActivityTimelineData({
    userId,
    mode,
    activeFilter,
    page,
    dateFrom: date_from,
    dateTo: date_to,
    scrollerNode,
    sentinelNode,
  })

  const goTo = (link?: string) => {
    if (!link) return
    onBeforeNavigate?.()
    navigate(link)
  }

  const filtersBlock = (
    <ActivityFilters
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      dateRange={dateRange}
      onDateChange={setDateRange}
      stackFilters={stackFilters}
    />
  )

  const contentBlock = (
    <ActivityTimelineList
      isLoading={isLoading}
      isError={isError}
      error={error}
      groups={groups}
      expandedChanges={expandedChanges}
      onToggleChanges={toggleChanges}
      onNavigate={goTo}
      showSentinel={mode === "scroll" && hasNextPage}
      setSentinelNode={setSentinelNode}
    />
  )

  // Pager mode: numbered pagination (shared CRM component).
  const pagerBlock =
    mode === "pager" && !isLoading && !isError && total > 0 ? (
      <TablePagination
        page={page}
        totalPages={totalPages}
        pageSize={USER_ACTIVITY_PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        compact={fillHeight}
      />
    ) : null

  // Scroll mode owns its own scroll container so the IntersectionObserver root
  // is this element (the sheet gives it a bounded, flex-1 height).
  if (mode === "scroll") {
    return (
      <div
        ref={setScrollerNode}
        onScroll={onScroll}
        onWheel={onWheel}
        className="h-full overflow-y-auto"
      >
        <div className="space-y-4 p-4">
          {filtersBlock}
          {contentBlock}
        </div>
      </div>
    )
  }

  // Pager mode, bounded container (e.g. the activity-log sheet): fill the
  // parent height so only the list scrolls and the pager stays pinned to the
  // bottom instead of being pushed below the fold.
  if (fillHeight) {
    return (
      <div className="flex h-full flex-col">
        <div className="shrink-0 px-4 pb-3 pt-4">{filtersBlock}</div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{contentBlock}</div>
        {pagerBlock && <div className="shrink-0">{pagerBlock}</div>}
      </div>
    )
  }

  // Pager mode, inline document flow (detail page): everything stacks and the
  // page owns the scroll.
  return (
    <div className="space-y-4">
      {filtersBlock}
      {contentBlock}
      {pagerBlock}
    </div>
  )
}
