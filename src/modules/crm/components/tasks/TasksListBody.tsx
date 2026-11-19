import { ListChecks } from "lucide-react"

import { EmptyState } from "@/components/common/feedback/EmptyState"
import { Typography } from "@/components/ui/typography"
import { TablePagination } from "@/components/common/tables/TablePagination"
import { PAGINATION } from "@/shared/constants"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { isValidationError } from "@/shared/api/envelope"

import type { useTasksList } from "../../hooks/tasks/useTasksList"
import { TaskRow } from "./TaskRow"
import { TASKS_STRINGS } from "./tasks.strings"

export function TasksListBody({ list }: { list: ReturnType<typeof useTasksList> }) {
  if (list.isLoading && list.tasks.length === 0) {
    return (
      <Typography variant="body" tone="muted" align="center" asChild>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.04)]">
          {TASKS_STRINGS.list.loading}
        </div>
      </Typography>
    )
  }

  // A 422 means the filters were rejected (e.g. a hand-edited link) — show the
  // normal "nothing found" state below instead of the validator text.
  if (list.isError && !isValidationError(list.error)) {
    return (
      <LoadErrorState error={list.error} fallback={TASKS_STRINGS.list.loadError} />
    )
  }

  if (list.tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.04)]">
        <EmptyState
          icon={ListChecks}
          title={
            list.hasFilters
              ? TASKS_STRINGS.list.empty.filteredTitle
              : TASKS_STRINGS.list.empty.title
          }
          description={
            list.hasFilters
              ? TASKS_STRINGS.list.empty.filteredDescription
              : TASKS_STRINGS.list.empty.description
          }
          action={
            list.hasFilters
              ? {
                  label: TASKS_STRINGS.list.empty.clearFilters,
                  onClick: list.clearFilters,
                }
              : list.canWrite
                ? {
                    label: TASKS_STRINGS.list.empty.action,
                    onClick: () => list.setCreateOpen(true),
                  }
                : undefined
          }
        />
      </div>
    )
  }

  return (
    <>
      {list.tasks.map((task) => (
        <TaskRow key={task.id} task={task} list={list} />
      ))}
      <TablePagination
        page={list.page}
        totalPages={list.totalPages}
        pageSize={list.pageSize}
        total={list.totalTasks}
        isFetching={list.isFetching}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        pageSizeOptions={PAGINATION.PAGE_SIZE_OPTIONS}
      />
    </>
  )
}
