import { useCallback, useMemo, useState } from "react"

import type { StatCardData } from "@/components/common/display/StatsRow"
import {
  useDebounce,
  useFilterParams,
  useMemoryState,
  useUrlBoolFilter,
  useUrlDateRange,
  useUrlFilter,
  useUrlPagination,
} from "@/shared/hooks"
import { PAGINATION, UI } from "@/shared/constants"
import { dateRangeToParams } from "@/shared/lib/date"
import { usePermission } from "@shared/rbac"

import {
  useCancelTask,
  useCompleteTask,
  useCreateTaskGlobal,
  useDeleteTask,
  useTasksPaged,
  useTasksSummary,
  useUpdateTask,
} from "./useTasks"
import type { CrmTaskWire, TaskPriority, TaskStatus } from "../../api"
import { crmCan } from "../../permissions"

export const TASKS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

// Container logic for the global Tasks list page: persisted filter state,
// paged list + summary queries, task mutations, and derived stats/paging.
export function useTasksList() {
  // Every filter + page live in the URL (mirrors pagination) so they survive
  // refresh, detail round-trips, and browser back/forward. Each filter setter
  // clears `?page` for free, so no manual page reset is needed.
  const { setMany: setManyParams } = useFilterParams()
  const [search, setSearch] = useUrlFilter("search", "")
  const [statusFilter, setStatusFilter] = useUrlFilter("status", "all")
  const [priorityFilter, setPriorityFilter] = useUrlFilter("priority", "all")
  const [overdueOnly, setOverdueOnly] = useUrlBoolFilter("overdue_only")
  // Created-date range filter (URL-backed via date_from / date_to).
  const [dateRange, setDateRange] = useUrlDateRange()
  const { date_from, date_to } = dateRangeToParams(dateRange)
  // Task (due) date range filter — parallel to the created-date range above,
  // under its own due_date_from / due_date_to keys.
  const [dueDateRange, setDueDateRange] = useUrlDateRange("due_date_from", "due_date_to")
  const { date_from: due_date_from, date_to: due_date_to } =
    dateRangeToParams(dueDateRange)
  const [filtersOpen, setFiltersOpen] = useMemoryState("crm:tasks:filtersOpen", false)
  const [createOpen, setCreateOpen] = useState(false)
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    sizeKey: "tasks_size",
    defaultSize: TASKS_PAGE_SIZE,
  })

  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS)

  const statusList = useMemo<TaskStatus[] | undefined>(() => {
    return statusFilter === "all" ? undefined : [statusFilter as TaskStatus]
  }, [statusFilter])
  const priorityList = useMemo<TaskPriority[] | undefined>(() => {
    return priorityFilter === "all" ? undefined : [priorityFilter as TaskPriority]
  }, [priorityFilter])

  const { data, isLoading, isError, error, isFetching } = useTasksPaged(
    {
      page,
      search: debouncedSearch || undefined,
      status: statusList,
      priority: priorityList,
      overdue_only: overdueOnly || undefined,
      date_from,
      date_to,
      due_date_from,
      due_date_to,
    },
    { pageSize },
  )

  const summary = useTasksSummary()
  const createMut = useCreateTaskGlobal()
  const updateMut = useUpdateTask()
  const completeMut = useCompleteTask()
  const cancelMut = useCancelTask()
  const deleteMut = useDeleteTask()

  const { can } = usePermission()
  const canWrite = can([...crmCan.writeTask])
  const canDelete = can([...crmCan.deleteTask])

  const [editingTask, setEditingTask] = useState<CrmTaskWire | null>(null)

  const tasks = useMemo<CrmTaskWire[]>(() => data?.items ?? [], [data?.items])
  const totalTasks = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalTasks / pageSize))
  const rangeStart = totalTasks === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = totalTasks === 0 ? 0 : rangeStart + tasks.length - 1

  const stats: StatCardData[] = useMemo(() => {
    const s = summary.data
    return [
      { label: "To Do", value: s?.todo ?? 0, accent: "primary" },
      { label: "In Progress", value: s?.in_progress ?? 0, accent: "info" },
      { label: "Completed", value: s?.completed ?? 0, accent: "success" },
      { label: "Overdue", value: s?.overdue ?? 0, accent: "danger" },
    ]
  }, [summary.data])

  const hasFilters =
    debouncedSearch !== "" ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    overdueOnly ||
    !!(dateRange?.from || dateRange?.to) ||
    !!(dueDateRange?.from || dueDateRange?.to)
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (priorityFilter !== "all" ? 1 : 0) +
    (overdueOnly ? 1 : 0) +
    (dateRange?.from || dateRange?.to ? 1 : 0) +
    (dueDateRange?.from || dueDateRange?.to ? 1 : 0)

  // Clear every filter key in ONE navigation (sequential setters would stomp
  // each other on the shared URL). Page resets for free.
  const clearFilters = useCallback(() => {
    setManyParams({
      search: null,
      status: null,
      priority: null,
      overdue_only: null,
      date_from: null,
      date_to: null,
      due_date_from: null,
      due_date_to: null,
    })
  }, [setManyParams])

  return {
    search, setSearch,
    statusFilter, setStatusFilter,
    priorityFilter, setPriorityFilter,
    overdueOnly, setOverdueOnly,
    dateRange, setDateRange,
    dueDateRange, setDueDateRange,
    filtersOpen, setFiltersOpen,
    createOpen, setCreateOpen,
    page, setPage,
    pageSize, setPageSize,
    tasks,
    totalTasks,
    totalPages,
    rangeStart,
    rangeEnd,
    isLoading,
    isError,
    error,
    isFetching,
    createMut,
    updateMut,
    completeMut,
    cancelMut,
    deleteMut,
    canWrite,
    canDelete,
    editingTask,
    setEditingTask,
    stats,
    hasFilters,
    activeFilterCount,
    clearFilters,
  }
}
