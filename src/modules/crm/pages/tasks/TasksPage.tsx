import { Plus, Search, X } from "lucide-react"

import { UI } from "@/shared/constants"
import { Button } from "@/components/ui/button"
import { StatsRow } from "@/components/common/display/StatsRow"
import { ListPageShell } from "@/components/page-shells"
import { useMirroredValue } from "@/shared/hooks"

import { TaskFormDialog } from "../../components/tasks/TaskFormDialog"
import { TasksListBody } from "../../components/tasks/TasksListBody"
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from "../../components/tasks/taskListHelpers"
import { TASKS_STRINGS } from "../../components/tasks/tasks.strings"
import { CRM_SHARED_STRINGS } from "../../components/shared/crm-shared.strings"
import {
  CrmToolbarDateRange,
  CrmToolbarFilterSelect,
} from "../../components/shared/crm-data-table/toolbarFilterControls"
import { useTasksList } from "../../hooks/tasks/useTasksList"

function TasksPage() {
  const list = useTasksList()

  // Caret-safe search: local state updated synchronously per keystroke so the
  // caret never jumps, while changes still flow up to the URL-backed setter —
  // same pattern as the CRM table toolbar (CrmTableToolbar).
  const [searchText, onSearchType] = useMirroredValue(list.search, list.setSearch)

  return (
    <>
      <ListPageShell
        title={TASKS_STRINGS.list.pageTitle}
        subtitle={TASKS_STRINGS.list.pageSubtitle}
        breadcrumbs={[
          { label: TASKS_STRINGS.list.breadcrumbCrm },
          { label: TASKS_STRINGS.list.breadcrumbTasks },
        ]}
        actions={
          list.canWrite ? (
            <Button size="sm" onClick={() => list.setCreateOpen(true)}>
              <Plus className="size-3.5" data-icon="inline-start" />
              {TASKS_STRINGS.list.newTask}
            </Button>
          ) : undefined
        }
        stats={<StatsRow stats={list.stats} />}
        toolbar={
          // Same toolbar band + controls as the CRM data-table: `.cpt-search-field`
          // search box and inline filter-chip dropdowns/date-ranges.
          <div className="crm-tasks-toolbar cpt-table-toolbar rounded-xl border border-border">
            <div className="cpt-search-field focus-within:!shadow-none">
              <Search className="size-[14px] opacity-60" />
              <input
                placeholder={TASKS_STRINGS.list.searchPlaceholder}
                maxLength={UI.FILTER_SEARCH_MAX_LENGTH}
                value={searchText}
                onChange={(e) => onSearchType(e.target.value)}
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => onSearchType("")}
                  className="opacity-40 transition-opacity hover:opacity-70"
                  aria-label={CRM_SHARED_STRINGS.tableToolbar.clearSearch}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <CrmToolbarFilterSelect
              filter={{
                kind: "select",
                key: "status",
                label: TASKS_STRINGS.filters.statusLabel,
                value: list.statusFilter === "all" ? "" : list.statusFilter,
                options: STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                allLabel: TASKS_STRINGS.filters.allStatus,
              }}
              onChange={(_key, value) => list.setStatusFilter(value === "" ? "all" : value)}
            />

            <CrmToolbarFilterSelect
              filter={{
                kind: "select",
                key: "priority",
                label: TASKS_STRINGS.filters.priorityLabel,
                value: list.priorityFilter === "all" ? "" : list.priorityFilter,
                options: PRIORITY_OPTIONS.map((p) => ({ value: p, label: p })),
                allLabel: TASKS_STRINGS.filters.allPriority,
              }}
              onChange={(_key, value) => list.setPriorityFilter(value === "" ? "all" : value)}
            />

            {/* Created Date filter — hidden for now (kept for easy re-enable).
            <CrmToolbarDateRange
              filter={{
                kind: "daterange",
                key: "date",
                label: TASKS_STRINGS.filters.createdDateLabel,
                value: list.dateRange,
                placeholder: TASKS_STRINGS.filters.createdDateLabel,
              }}
              onChange={(_key, range) => list.setDateRange(range)}
            />
            */}

            <CrmToolbarDateRange
              filter={{
                kind: "daterange",
                key: "due_date",
                label: TASKS_STRINGS.filters.taskDateLabel,
                value: list.dueDateRange,
                placeholder: TASKS_STRINGS.filters.taskDateLabel,
              }}
              onChange={(_key, range) => list.setDueDateRange(range)}
            />

            <CrmToolbarFilterSelect
              filter={{
                kind: "select",
                key: "overdue",
                label: TASKS_STRINGS.filters.overdueLabel,
                value: list.overdueOnly ? "overdue" : "",
                options: [{ value: "overdue", label: TASKS_STRINGS.filters.overdueOnly }],
                allLabel: TASKS_STRINGS.filters.overdueAll,
              }}
              onChange={(_key, value) => list.setOverdueOnly(value === "overdue")}
            />

            {list.hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={list.clearFilters}
              >
                {TASKS_STRINGS.filters.clearAll}
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-2">
          <TasksListBody list={list} />
        </div>
      </ListPageShell>

      <TaskFormDialog
        mode="create"
        scope="global"
        open={list.createOpen}
        onOpenChange={list.setCreateOpen}
        isPending={list.createMut.isPending}
        onSubmit={(body) => {
          list.createMut.mutate(body, {
            onSuccess: () => list.setCreateOpen(false),
          })
        }}
      />

      {list.editingTask && (
        <TaskFormDialog
          key={list.editingTask.id}
          mode="edit"
          task={list.editingTask}
          open
          onOpenChange={(o) => !o && list.setEditingTask(null)}
          isPending={list.updateMut.isPending}
          onSubmit={(body) => {
            list.updateMut.mutate(
              { taskId: list.editingTask!.id, body },
              { onSuccess: () => list.setEditingTask(null) },
            )
          }}
        />
      )}
    </>
  )
}

export { TasksPage }
export default TasksPage
