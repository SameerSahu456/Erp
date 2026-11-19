import { useMemo } from "react"

import { toISTDateKey } from "@shared/lib/date"

import type { CrmTaskWire, MeetingWire } from "../../api"
import { useMeetingsPaged } from "../meetings/useMeetings"
import { useTasksPaged } from "../tasks/useTasks"

// A single calendar day groups the tasks and meetings that fall on it.
export type CalendarItem =
  | { kind: "task"; data: CrmTaskWire }
  | { kind: "meeting"; data: MeetingWire }

// One fetch per resource covers any realistic month — both list endpoints cap
// `limit` at 200. A month exceeding 200 tasks (or meetings) would truncate;
// see CALENDAR_DYNAMIC_PLAN.md §6 #1.
const CALENDAR_PAGE_SIZE = 200

// Month bounds as plain `YYYY-MM-DD` strings. The grid only ever renders the
// current month's days (adjacent-month cells are blank pads), so an exact
// month-range fetch is sufficient — no need to over-fetch neighbouring months.
function monthBounds(
  year: number,
  month: number,
): { monthStart: string; monthEnd: string } {
  const mm = String(month + 1).padStart(2, "0")
  const lastDay = new Date(year, month + 1, 0).getDate()
  return {
    monthStart: `${year}-${mm}-01`,
    monthEnd: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  }
}

// Month-scoped tasks + meetings for CalendarPage. `year` is the full year;
// `month` is 0-indexed (JS `Date` convention) to match the page's state.
//
// Tasks reuse `useTasksPaged` and meetings `useMeetingsPaged`, so the existing
// create-mutation invalidators (`useCreateTaskGlobal` / `useCreateMeeting`)
// already refresh the calendar after a write — no bespoke cache wiring. The
// month is part of each query key, so navigating months refetches.
export function useCalendar(year: number, month: number) {
  const { monthStart, monthEnd } = monthBounds(year, month)

  // Task `due_date` is a datetime — bound the range at IST day edges so a task
  // due late on the last day isn't missed and the 1st isn't pulled in early.
  const tasksQuery = useTasksPaged(
    {
      due_after: `${monthStart}T00:00:00+05:30`,
      due_before: `${monthEnd}T23:59:59+05:30`,
    },
    { pageSize: CALENDAR_PAGE_SIZE },
  )

  // Meeting `meeting_date` is a plain date — the range params are dates too.
  const meetingsQuery = useMeetingsPaged(
    { date_from: monthStart, date_to: monthEnd },
    { pageSize: CALENDAR_PAGE_SIZE },
  )

  const itemsByDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {}

    for (const task of tasksQuery.data?.items ?? []) {
      // A task with no due date never lands on the calendar.
      const key = toISTDateKey(task.due_date)
      if (!key) continue
      ;(map[key] ??= []).push({ kind: "task", data: task })
    }

    for (const meeting of meetingsQuery.data?.items ?? []) {
      const key = meeting.meeting_date
      ;(map[key] ??= []).push({ kind: "meeting", data: meeting })
    }

    return map
  }, [tasksQuery.data, meetingsQuery.data])

  return {
    itemsByDate,
    isLoading: tasksQuery.isLoading || meetingsQuery.isLoading,
    isError: tasksQuery.isError || meetingsQuery.isError,
    error: tasksQuery.error ?? meetingsQuery.error,
  }
}
