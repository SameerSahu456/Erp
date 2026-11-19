import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { TablePagination } from '@/components/common/tables/TablePagination'
import { PAGINATION } from '@/shared/constants'
import { usePermission } from '@shared/rbac'
import { useScrollToHashTarget } from '@shared/notifications/use-scroll-to-hash-target'

import {
  useCompleteTask,
  useCreateTask,
  useDeleteTask,
  useTasksPaged,
  useUpdateTask,
} from '../../hooks/tasks/useTasks'
import type { CrmTaskWire, TaskEntityType } from '../../api'
import { crmCan } from '../../permissions'
import { TaskFormDialog } from './TaskFormDialog'
import { TaskItem } from './TaskItem'
import { TASKS_STRINGS } from './tasks.strings'

interface TasksSectionProps {
  entityType: TaskEntityType   // "lead" | "deal" — backend rejects others
  entityId: string
  /** Used as a context label in the create dialog (e.g. the deal title);
   *  not transmitted to the backend. */
  entityName: string
  /** View-only access (user reached the lead/deal only via an @mention):
   *  hides every write affordance. Defaults to false. */
  readOnly?: boolean
}

export function TasksSection({
  entityType,
  entityId,
  entityName,
  readOnly = false,
}: TasksSectionProps) {
  // Status filter tabs were removed from the Lead/Deal Tasks tab — the
  // section now lists every task for the entity (newest first), matching
  // the erp-demo Tasks tab. The global TasksPage still owns status filters.
  //
  // Numbered pagination (Coding-guideline §16.7) — one page at a time via
  // `useTasksPaged`, with the shared `TablePagination` footer (Prev/Next +
  // page-size selector) below the list. `page` resets to 1 on filter-less
  // create so the newest task is visible.
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE)

  const { data, isLoading, isError, isFetching } = useTasksPaged(
    { entity_type: entityType, entity_id: entityId, page },
    { pageSize },
  )

  const createMut = useCreateTask(entityType, entityId)
  const updateMut = useUpdateTask(entityType, entityId)
  const completeMut = useCompleteTask(entityType, entityId)
  const deleteMut = useDeleteTask(entityType, entityId)

  // RBAC — task endpoints OR-gate the finer code alongside the broad one.
  // Create / edit / complete / cancel all share the write gate; delete is
  // its own code (only product_manager holds it among per-resource roles).
  // Without these gates the buttons render for everyone and the backend
  // 403s the request — see §6.7 silent-mismatch list.
  const { can } = usePermission()
  const canWrite = can([...crmCan.writeTask]) && !readOnly
  const canDelete = can([...crmCan.deleteTask]) && !readOnly

  // Sort newest-first defensively (backend already orders created_at DESC).
  const tasks = useMemo<CrmTaskWire[]>(() => {
    const all = data?.items ?? []
    return all.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [data?.items])
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // ── Create dialog ──
  const [createOpen, setCreateOpen] = useState(false)

  // ── Edit dialog ──
  const [editingTask, setEditingTask] = useState<CrmTaskWire | null>(null)

  // Notification deep-link: scroll-and-highlight when the URL hash points at
  // one of these tasks (e.g. `#task-<uuid>` from a TASK_ASSIGNED /
  // TASK_REMINDER / TASK_OVERDUE / TASK_COMPLETED notification). Under
  // numbered pagination the hook page-walks to the page holding the row.
  useScrollToHashTarget({
    ready: tasks.length,
    expectedPrefix: 'task',
    isFetching,
    paginated: { page, totalPages, setPage },
  })

  return (
    <div className="space-y-4">
      {/* Header — create button only. The status filter tabs (To Do /
          In Progress / Completed / Cancelled / Overdue) were removed so
          this tab matches the erp-demo Lead/Deal Tasks tab. Hidden for
          users without task-write permission. */}
      {canWrite && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" data-icon="inline-start" />
            {TASKS_STRINGS.section.createTask}
          </Button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <Typography
          variant="body"
          tone="muted"
          align="center"
          className="rounded-lg border border-dashed p-8"
          asChild
        >
          <div>{TASKS_STRINGS.section.loading}</div>
        </Typography>
      ) : isError ? (
        <Typography
          variant="body"
          tone="danger"
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-4"
          asChild
        >
          <div>{TASKS_STRINGS.section.loadError}</div>
        </Typography>
      ) : tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Typography variant="body" tone="muted">
            {TASKS_STRINGS.section.empty(entityType)}
          </Typography>
          {canWrite && (
            <Typography variant="helper" className="mt-1" asChild>
              <p>{TASKS_STRINGS.section.emptyHelper}</p>
            </Typography>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              canWrite={canWrite}
              canDelete={canDelete}
              isCompleting={completeMut.isPending && completeMut.variables === task.id}
              isDeleting={deleteMut.isPending && deleteMut.variables === task.id}
              onEdit={() => setEditingTask(task)}
              onComplete={() => completeMut.mutate(task.id)}
              onDelete={() => deleteMut.mutate(task.id)}
            />
          ))}
          {total > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              total={total}
              isFetching={isFetching}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          )}
        </div>
      )}

      <TaskFormDialog
        mode="create"
        scope={{ entityType, entityId, entityName }}
        open={createOpen}
        onOpenChange={setCreateOpen}
        isPending={createMut.isPending}
        onSubmit={(body) => {
          createMut.mutate(body, {
            onSuccess: () => {
              setCreateOpen(false)
              // Newest-first list → jump back to page 1 so the new task is
              // visible even if the user was deeper in the pages.
              setPage(1)
            },
          })
        }}
      />

      {editingTask && (
        <TaskFormDialog
          key={editingTask.id}
          mode="edit"
          task={editingTask}
          open
          onOpenChange={(o) => !o && setEditingTask(null)}
          isPending={updateMut.isPending}
          onSubmit={(body) => {
            updateMut.mutate(
              { taskId: editingTask.id, body },
              { onSuccess: () => setEditingTask(null) },
            )
          }}
        />
      )}
    </div>
  )
}
