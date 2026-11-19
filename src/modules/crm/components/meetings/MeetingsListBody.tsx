import { CalendarDays } from "lucide-react"

import { EmptyState } from "@/components/common/feedback/EmptyState"
import { TablePagination } from "@/components/common/tables/TablePagination"
import { PAGINATION } from "@/shared/constants"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { isValidationError } from "@/shared/api/envelope"

import type { useMeetingsList } from "../../hooks/meetings/useMeetingsList"
import { MEETINGS_STRINGS } from "./meetings.strings"
import { MeetingRow } from "./MeetingRow"

export function MeetingsListBody({ list }: { list: ReturnType<typeof useMeetingsList> }) {
  if (list.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[78px] animate-pulse rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    )
  }

  // A 422 means the filters were rejected (e.g. a hand-edited link) — show the
  // normal "nothing found" state below instead of the validator text.
  if (list.isError && !isValidationError(list.error)) {
    return (
      <LoadErrorState error={list.error} fallback={MEETINGS_STRINGS.list.loadError} />
    )
  }

  if (list.meetings.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.04)]">
        <EmptyState
          icon={CalendarDays}
          title={
            list.hasFilters
              ? MEETINGS_STRINGS.list.empty.filteredTitle
              : MEETINGS_STRINGS.list.empty.title
          }
          description={
            list.hasFilters
              ? MEETINGS_STRINGS.list.empty.filteredDescription
              : MEETINGS_STRINGS.list.empty.description
          }
          action={
            list.hasFilters
              ? { label: MEETINGS_STRINGS.list.empty.filteredAction, onClick: () => { list.handleSearch(""); list.handleStatus("all"); list.handleType("all"); list.handleDateRange(undefined) } }
              : list.canWrite
                ? { label: MEETINGS_STRINGS.list.empty.action, onClick: () => list.setCreateOpen(true) }
                : undefined
          }
        />
      </div>
    )
  }

  return (
    <>
      {list.meetings.map((meeting) => (
        <MeetingRow key={meeting.id} meeting={meeting} list={list} />
      ))}
      <TablePagination
        page={list.page}
        totalPages={list.totalPages}
        pageSize={list.pageSize}
        total={list.total}
        isFetching={list.isFetching}
        onPageChange={list.setPage}
        onPageSizeChange={list.handlePageSizeChange}
        pageSizeOptions={PAGINATION.PAGE_SIZE_OPTIONS}
      />
    </>
  )
}
