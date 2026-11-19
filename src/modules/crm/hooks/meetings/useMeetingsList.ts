import { useCallback, useState } from "react"

import { usePersistedState } from "@/hooks/use-persisted-state"
import type { StatCardData } from "@/components/common/display/StatsRow"
import type { DateRange } from "@/components/common/pickers/DateRangePicker"
import { useDebounce } from "@/shared/hooks"
import { PAGINATION } from "@/shared/constants"
import { dateRangeToParams } from "@/shared/lib/date"
import { usePermission } from "@shared/rbac"

import type { MeetingStatus, MeetingType, MeetingWire } from "../../api"
import { MEETINGS_STRINGS } from "../../components/meetings/meetings.strings"
import { crmCan } from "../../permissions"
import {
  useCancelMeeting,
  useCompleteMeeting,
  useCreateMeeting,
  useMeetingsPaged,
  useMeetingsSummary,
  useUpdateMeeting,
} from "./useMeetings"

// Single-source page size (§16.6); the list is server-paginated (§16.7).
export const MEETINGS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

// Container logic for the Meetings list page: persisted filters, paged list +
// summary queries, and the meeting mutations.
export function useMeetingsList() {
  const [search, setSearch] = usePersistedState("crm-meetings:search", "")
  const [statusFilter, setStatusFilter] = usePersistedState<string>("crm-meetings:status", "all")
  const [typeFilter, setTypeFilter] = usePersistedState<string>("crm-meetings:type", "all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(MEETINGS_PAGE_SIZE)
  // Meeting-date range filter. NOTE: the backend filters `meeting_date` (the
  // scheduled date) here, NOT created_at — so the UI labels it "Meeting Date".
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const { date_from, date_to } = dateRangeToParams(dateRange)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<MeetingWire | null>(null)

  const { can } = usePermission()
  const canWrite = can([...crmCan.writeMeeting])

  const debouncedSearch = useDebounce(search, 300)

  // Filter changes reset the page (§16.7).
  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [setSearch])
  const handleStatus = useCallback((value: string) => {
    setStatusFilter(value)
    setPage(1)
  }, [setStatusFilter])
  const handleType = useCallback((value: string) => {
    setTypeFilter(value)
    setPage(1)
  }, [setTypeFilter])
  const handleDateRange = useCallback((next: DateRange | undefined) => {
    setDateRange(next)
    setPage(1)
  }, [])
  // Page-size change resets to page 1 so the user never lands past the last page.
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size)
    setPage(1)
  }, [])

  const statusParam =
    statusFilter !== "all" ? [statusFilter as MeetingStatus] : undefined
  const typeParam =
    typeFilter !== "all" ? [typeFilter as MeetingType] : undefined

  const { data, isLoading, isError, error, isFetching } = useMeetingsPaged(
    {
      search: debouncedSearch,
      status: statusParam,
      meeting_type: typeParam,
      date_from,
      date_to,
      page,
    },
    { pageSize },
  )

  const meetings = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  const summary = useMeetingsSummary()
  const stats: StatCardData[] = [
    { label: MEETINGS_STRINGS.list.stats.scheduled, value: summary.data?.scheduled ?? 0, accent: "info" },
    { label: MEETINGS_STRINGS.list.stats.completed, value: summary.data?.completed ?? 0, accent: "success" },
    { label: MEETINGS_STRINGS.list.stats.thisWeek, value: summary.data?.this_week ?? 0, accent: "violet" },
    { label: MEETINGS_STRINGS.list.stats.total, value: summary.data?.total ?? 0, accent: "primary" },
  ]

  const createMut = useCreateMeeting()
  const updateMut = useUpdateMeeting()
  const completeMut = useCompleteMeeting()
  const cancelMut = useCancelMeeting()

  const hasFilters =
    search !== "" ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    !!(dateRange?.from || dateRange?.to)

  return {
    search, statusFilter, typeFilter,
    dateRange,
    page, setPage,
    pageSize, handlePageSizeChange,
    createOpen, setCreateOpen,
    editingMeeting, setEditingMeeting,
    canWrite,
    handleSearch, handleStatus, handleType, handleDateRange,
    meetings, total, totalPages, rangeStart, rangeEnd,
    isLoading, isError, error, isFetching,
    stats,
    createMut, updateMut, completeMut, cancelMut,
    hasFilters,
  }
}
