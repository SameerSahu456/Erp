import { AlertTriangle, CheckCircle2, Pencil, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { ClampedText } from '@/components/common/display/ClampedText'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { getUserDisplayName, useUser } from '@modules/users'

import type { CrmTaskWire } from '../../api'
import {
  formatDue,
  isTerminal,
  priorityBadgeVariant,
  statusBadgeVariant,
  statusIcon,
  statusLabel,
} from './taskListHelpers'
import { TASKS_STRINGS } from './tasks.strings'

// Resolves the assigned user's display name for a task row. Read-only — the
// form picker lives in TaskFormDialog.
function AssigneeCell({ userId }: { userId: string | null }) {
  const { data, isLoading } = useUser(userId ?? '')
  if (!userId) return <span className="italic">{TASKS_STRINGS.item.unassigned}</span>
  if (isLoading) return <span>{TASKS_STRINGS.item.loadingAssignee}</span>
  if (!data) return <span className="italic">{TASKS_STRINGS.item.unknownAssignee}</span>
  return <span>{getUserDisplayName(data)}</span>
}

interface TaskItemProps {
  task: CrmTaskWire
  canWrite: boolean
  canDelete: boolean
  isCompleting: boolean
  isDeleting: boolean
  onEdit: () => void
  onComplete: () => void
  onDelete: () => void
}

// One task row: status icon + title/description/assignee/due, priority &
// status badges, and edit/complete/delete actions (permission- and
// terminal-state-gated). Pure presenter.
export function TaskItem({
  task,
  canWrite,
  canDelete,
  isCompleting,
  isDeleting,
  onEdit,
  onComplete,
  onDelete,
}: TaskItemProps) {
  const overdue = task.is_overdue
  const terminal = isTerminal(task.status)

  return (
    <div
      // Scroll target for notification deep links — see
      // shared/notifications/routing.ts (`#task-<id>`).
      id={`task-${task.id}`}
      className={cn(
        'flex items-start gap-3 rounded-lg border bg-card px-4 py-3',
        overdue && 'border-destructive/40 bg-destructive/5 dark:bg-destructive/10',
      )}
    >
      <div className="shrink-0 pt-0.5">{statusIcon(task.status)}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Typography variant="body-strong" truncate asChild>
            <span>{task.title}</span>
          </Typography>
          {overdue && (
            <>
              <AlertTriangle
                className="size-3.5 shrink-0 text-destructive"
                aria-label={TASKS_STRINGS.item.overdueIconLabel}
              />
              <StatusBadge variant="error">{TASKS_STRINGS.item.overdue}</StatusBadge>
            </>
          )}
        </div>
        {task.description && (
          <ClampedText text={task.description} lines={2} className="mt-1" />
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <AssigneeCell userId={task.assigned_to} />
          <span>&middot;</span>
          <span className={overdue ? 'text-destructive' : undefined}>
            {TASKS_STRINGS.item.due(formatDue(task.due_date))}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge variant={priorityBadgeVariant(task.priority)}>{task.priority}</StatusBadge>
        <StatusBadge variant={statusBadgeVariant(task.status)}>
          {statusLabel(task.status)}
        </StatusBadge>
        {/* Edit — backend rejects PATCH on terminal tasks; hide instead of 400. */}
        {!terminal && canWrite && (
          <Button variant="ghost" size="icon-xs" onClick={onEdit} aria-label={TASKS_STRINGS.item.editTask}>
            <Pencil />
          </Button>
        )}
        {/* Complete — only on non-terminal tasks; write-gated. */}
        {!terminal && canWrite && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onComplete}
            disabled={isCompleting}
            aria-label={TASKS_STRINGS.item.completeTask}
          >
            <CheckCircle2 />
          </Button>
        )}
        {/* Delete — its own permission code (crm:task_delete). */}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDelete}
            disabled={isDeleting}
            aria-label={TASKS_STRINGS.item.deleteTask}
          >
            <Trash2 />
          </Button>
        )}
      </div>
    </div>
  )
}
