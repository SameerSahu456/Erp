import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Popover } from '@/components/ui/popover'
import { PopoverSelectTrigger } from '@/components/ui/popover-select-trigger'
import { InfiniteScrollPickerContent } from '../shared/InfiniteScrollPickerContent'
import { Typography } from '@/components/ui/typography'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/common/pickers/DatePicker'
import { FieldError } from '@/components/common/forms/FieldError'
import { UnsavedChangesDialog } from '@/components/common/dialogs/UnsavedChangesDialog'
import { useFormErrors } from '@/hooks/use-form-errors'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { deepEqual } from '@/lib/deep-equal'
import { useDebounce } from '@/shared/hooks'
import { useAuth } from '@shared/auth/use-auth'
import { UI } from '@/shared/constants'
import {
  getUserDisplayName,
  useUser,
  useUserOptions,
  type UserListItem,
} from '@modules/users'

import type {
  CrmTaskWire,
  TaskEntityType,
  TaskPriority,
  TaskUpdatePayload,
} from '../../api'
// "Link to" lead/deal picker removed from the global create modal — global
// tasks are now standalone. Re-enable this import if the picker comes back.
// import { TaskEntityPicker } from './TaskEntityPicker'
import { TASKS_STRINGS } from './tasks.strings'

// ─── Single source of truth for task create/edit modals ─────────────────
//
// Used by:
//   • TasksPage (global /crm/tasks)        → mode='create', scope='global'
//   • TasksSection (lead/deal detail page) → mode='create', scope={…fixed}
//   • Both pages for the row-level edit    → mode='edit'
//
// Before this component existed, two near-identical CreateTaskDialog /
// EditTaskDialog pairs were copy-pasted across the page and the section
// (plus a duplicate AssigneePicker in each). All three call-sites now share
// the same form — any future field/validation change happens in one place.

const PRIORITY_OPTIONS: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent']

export type TaskFormValues = {
  title: string
  description: string | null
  due_date: string | null
  priority: TaskPriority
  status: 'todo' | 'in_progress'
  assigned_to: string | null
}

type CreateScopedProps = {
  mode: 'create'
  // Entity is pre-selected by the parent (lead/deal detail page).
  scope: { entityType: TaskEntityType; entityId: string; entityName: string }
  open: boolean
  onOpenChange: (open: boolean) => void
  isPending: boolean
  onSubmit: (body: TaskFormValues) => void
}

type CreateGlobalProps = {
  mode: 'create'
  // Entity is pickable inside the dialog (TasksPage's "New Task").
  scope: 'global'
  open: boolean
  onOpenChange: (open: boolean) => void
  isPending: boolean
  // Global tasks are standalone (no lead/deal link) — the "Link to" picker was
  // removed, so the entity fields are no longer part of the submitted body.
  onSubmit: (body: TaskFormValues) => void
}

type EditProps = {
  mode: 'edit'
  task: CrmTaskWire
  open: boolean
  onOpenChange: (open: boolean) => void
  isPending: boolean
  onSubmit: (body: TaskUpdatePayload) => void
}

export type TaskFormDialogProps = CreateScopedProps | CreateGlobalProps | EditProps

// DatePicker emits "YYYY-MM-DD" — backend wants ISO datetime.
// Anchor at end-of-day in the local zone so "due today" isn't already overdue
// at 00:00 UTC.
function dateInputToIso(value: string): string | null {
  if (!value) return null
  const d = new Date(`${value}T23:59:59`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function TaskFormDialog(props: TaskFormDialogProps) {
  const isEdit = props.mode === 'edit'
  const isPickEntity = props.mode === 'create' && props.scope === 'global'

  // New tasks default to "assigned to me" (the logged-in user); editing keeps
  // whatever the task already has.
  const { user } = useAuth()
  const currentUserId = user?.id ?? null

  // Today as a local "YYYY-MM-DD" — used as the date input's `min` (and a
  // submit guard) so a due date can't be set in the past.
  const today = new Date()
  const todayInput = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Seed initial form state. For edits we mirror the task; for create we
  // start clean. The parent re-mounts the edit dialog with `key={task.id}`
  // so this initializer always sees a fresh row.
  const initialStatus: 'todo' | 'in_progress' = isEdit
    ? props.task.status === 'in_progress'
      ? 'in_progress'
      : 'todo'
    : 'todo'

  const [title, setTitle] = useState(isEdit ? props.task.title : '')
  const [description, setDescription] = useState(
    isEdit ? props.task.description ?? '' : '',
  )
  const [dueDate, setDueDate] = useState(
    isEdit ? isoToDateInput(props.task.due_date) : '',
  )
  const [priority, setPriority] = useState<TaskPriority>(
    isEdit ? props.task.priority : 'Medium',
  )
  const [statusValue, setStatusValue] = useState<'todo' | 'in_progress'>(
    initialStatus,
  )
  const [assignedTo, setAssignedTo] = useState<string | null>(
    isEdit ? props.task.assigned_to : currentUserId,
  )

  // Only used in create-global mode.
  const [entityType, setEntityType] = useState<TaskEntityType>('lead')
  const [entityId, setEntityId] = useState<string | null>(null)
  const [entityName, setEntityName] = useState<string | null>(null)

  const { errors, setErrors, clearError, clearAll } = useFormErrors()

  function resetCreate() {
    setTitle('')
    setDescription('')
    setDueDate('')
    setPriority('Medium')
    setStatusValue('todo')
    setAssignedTo(currentUserId)
    setEntityType('lead')
    setEntityId(null)
    setEntityName(null)
    clearAll()
  }

  // Dirty detection: edit mode compares against the task we're editing,
  // create mode against the empty form.
  const initialValues = isEdit
    ? {
        title: props.task.title,
        description: props.task.description ?? '',
        dueDate: isoToDateInput(props.task.due_date),
        priority: props.task.priority,
        status: initialStatus,
        assignedTo: props.task.assigned_to,
        entityType: 'lead' as TaskEntityType,
        entityId: null as string | null,
      }
    : {
        title: '',
        description: '',
        dueDate: '',
        priority: 'Medium' as TaskPriority,
        status: 'todo' as 'todo' | 'in_progress',
        // Matches the default-to-me seed so the form isn't dirty on open.
        assignedTo: currentUserId,
        entityType: 'lead' as TaskEntityType,
        entityId: null as string | null,
      }
  const currentValues = {
    title,
    description,
    dueDate,
    priority,
    status: statusValue,
    assignedTo,
    entityType: isPickEntity ? entityType : 'lead',
    entityId: isPickEntity ? entityId : null,
  }
  const submitInFlight = props.isPending
  const isDirty = props.open && !submitInFlight && !deepEqual(currentValues, initialValues)
  const guard = useUnsavedChangesGuard({ isDirty })

  function handleOpenChange(next: boolean) {
    if (!next) {
      guard.attempt(() => {
        if (props.mode === 'create') resetCreate()
        props.onOpenChange(false)
      })
      return
    }
    props.onOpenChange(next)
  }

  // Flipping entity_type invalidates the entity_id (a lead id is meaningless
  // under a deal context and vice-versa).
  function handleEntityTypeChange(next: TaskEntityType) {
    setEntityType(next)
    setEntityId(null)
    setEntityName(null)
  }

  function handleSubmit() {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = TASKS_STRINGS.form.validation.titleRequired
    if (!assignedTo) e.assignedTo = TASKS_STRINGS.form.validation.assigneeRequired
    // `min` blocks the picker UI; this also catches a typed-in past date.
    // Only enforced when the date is newly set/changed, so editing other
    // fields on a task that already has a past due date isn't blocked.
    const dueDateChanged =
      !isEdit || dueDate !== isoToDateInput(props.task.due_date)
    if (dueDate && dueDateChanged && dueDate < todayInput) {
      e.dueDate = TASKS_STRINGS.form.validation.dueDateInPast
    }
    // Global tasks no longer require a lead/deal link (picker removed):
    // if (
    //   props.mode === 'create' &&
    //   props.scope === 'global' &&
    //   !entityId
    // ) {
    //   e.entityId = `Pick a ${entityType === 'lead' ? 'lead' : 'deal'}.`
    // }
    if (Object.keys(e).length > 0) {
      setErrors(e)
      toast.error(TASKS_STRINGS.form.validation.fixFields)
      return
    }
    clearAll()
    const trimmedTitle = title.trim()
    const newDesc = description.trim() || null
    const newDue = dateInputToIso(dueDate)

    if (props.mode === 'edit') {
      // Diff-mode PATCH — only fields the user changed get on the wire.
      const task = props.task
      const body: TaskUpdatePayload = {}
      if (trimmedTitle !== task.title) body.title = trimmedTitle
      if (newDesc !== (task.description ?? null)) body.description = newDesc
      if (newDue !== (task.due_date ?? null)) body.due_date = newDue
      if (priority !== task.priority) body.priority = priority
      if (statusValue !== initialStatus) body.status = statusValue
      if (assignedTo !== task.assigned_to) body.assigned_to = assignedTo
      if (Object.keys(body).length === 0) {
        toast.info(TASKS_STRINGS.form.validation.noChanges)
        return
      }
      props.onSubmit(body)
      return
    }

    // Create.
    const base: TaskFormValues = {
      title: trimmedTitle,
      description: newDesc,
      due_date: newDue,
      priority,
      status: statusValue,
      assigned_to: assignedTo,
    }

    // Both scoped and global submit just the base fields. Scoped tasks get
    // their lead/deal injected by useCreateTaskScoped; global tasks are now
    // standalone (the "Link to" picker was removed, so no entity is sent).
    props.onSubmit(base)
    resetCreate()
  }

  const dialogTitle = isEdit
    ? TASKS_STRINGS.form.titleEdit
    : TASKS_STRINGS.form.titleCreate
  const submitLabel = isEdit
    ? props.isPending
      ? TASKS_STRINGS.form.submitSaving
      : TASKS_STRINGS.form.submitEdit
    : props.isPending
      ? TASKS_STRINGS.form.submitCreating
      : TASKS_STRINGS.form.submitCreate

  // Context line under the title:
  //  • create-scoped → "For {entityName}"
  //  • edit          → "{Lead|Deal} · {entity_name}" (if present on task)
  //  • create-global → none (entity picker is in the form body)
  let contextLine: string | null = null
  if (props.mode === 'create' && props.scope !== 'global') {
    contextLine = TASKS_STRINGS.form.contextScoped(props.scope.entityName)
  } else if (props.mode === 'edit' && props.task.entity_name) {
    const label =
      props.task.entity_type === 'lead'
        ? TASKS_STRINGS.form.entityLabelLead
        : TASKS_STRINGS.form.entityLabelDeal
    contextLine = TASKS_STRINGS.form.contextEdit(label, props.task.entity_name)
  }

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          {contextLine && (
            <Typography variant="helper" asChild>
              <p>{contextLine}</p>
            </Typography>
          )}
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">
              {TASKS_STRINGS.form.fields.title}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                clearError('title')
              }}
              placeholder={TASKS_STRINGS.form.fields.titlePlaceholder}
              maxLength={255}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'task-title-error' : undefined}
            />
            <FieldError id="task-title-error" message={errors.title} />
          </div>
          <div className="space-y-2">
            <Label>{TASKS_STRINGS.form.fields.description}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={TASKS_STRINGS.form.fields.descriptionPlaceholder}
              rows={3}
            />
          </div>

          {/* "Link to" lead/deal picker removed — global tasks are now
              standalone (no entity sent in the payload). Re-enable this block
              (plus the TaskEntityPicker import, the entityId validation, and
              the entity fields in handleSubmit) to bring the link-to back.
          {isPickEntity && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {TASKS_STRINGS.form.fields.linkTo}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={entityType}
                  onValueChange={(v) =>
                    handleEntityTypeChange(v as TaskEntityType)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">
                      {TASKS_STRINGS.form.entityLabelLead}
                    </SelectItem>
                    <SelectItem value="deal">
                      {TASKS_STRINGS.form.entityLabelDeal}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {entityType === 'lead'
                    ? TASKS_STRINGS.form.entityLabelLead
                    : TASKS_STRINGS.form.entityLabelDeal}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <TaskEntityPicker
                  entityType={entityType}
                  value={entityId}
                  displayName={entityName}
                  onSelect={(id, name) => {
                    setEntityId(id)
                    setEntityName(name)
                    clearError('entityId')
                  }}
                  onClear={() => {
                    setEntityId(null)
                    setEntityName(null)
                  }}
                />
                <FieldError id="task-entity-error" message={errors.entityId} />
              </div>
            </div>
          )}
          */}

          <div className={isEdit ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
            {/* Status is only editable on an existing task — a brand-new
                task always starts as "To Do", so the create modal omits
                this dropdown. */}
            {isEdit && (
              <div className="space-y-2">
                <Label>{TASKS_STRINGS.form.fields.status}</Label>
                <Select
                  value={statusValue}
                  onValueChange={(v) =>
                    setStatusValue(v as 'todo' | 'in_progress')
                  }
                >
                  {/* Status is required — never offer a clear (×); a null status
                      breaks the PATCH (non-nullable column). */}
                  <SelectTrigger className="w-full" clearable={false}>
                    {/* Render the label, not the raw wire value — otherwise the
                        trigger shows "in_progress" instead of "In Progress". */}
                    <SelectValue>
                      {statusValue === 'in_progress'
                        ? TASKS_STRINGS.form.statusInProgress
                        : TASKS_STRINGS.form.statusTodo}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">
                      {TASKS_STRINGS.form.statusTodo}
                    </SelectItem>
                    <SelectItem value="in_progress">
                      {TASKS_STRINGS.form.statusInProgress}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{TASKS_STRINGS.form.fields.priority}</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
              >
                {/* Priority is required — same as status, no clear (×). */}
                <SelectTrigger className="w-full" clearable={false}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{TASKS_STRINGS.form.fields.dueDate}</Label>
            <DatePicker
              value={dueDate}
              min={todayInput}
              onChange={(v) => {
                setDueDate(v)
                clearError('dueDate')
              }}
              aria-invalid={Boolean(errors.dueDate)}
              aria-describedby={errors.dueDate ? 'task-duedate-error' : undefined}
            />
            <FieldError id="task-duedate-error" message={errors.dueDate} />
          </div>

          <div className="space-y-2">
            <Label>
              {TASKS_STRINGS.form.fields.assignedTo}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <AssigneePicker
              value={assignedTo}
              onValueChange={(v) => {
                setAssignedTo(v)
                clearError('assignedTo')
              }}
            />
            <FieldError id="task-assignee-error" message={errors.assignedTo} />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={props.isPending}
          >
            {TASKS_STRINGS.form.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={props.isPending}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
      <UnsavedChangesDialog
        open={guard.dialogOpen}
        onOpenChange={guard.onDialogOpenChange}
        onConfirm={guard.onConfirmDiscard}
      />
    </Dialog>
  )
}

// ─── Assignee picker ────────────────────────────────────────────────────
// API-backed combobox per Coding-guideline §16.11: infinite scroll +
// debounced server-side search. The user-list query is `enabled: open` so
// the GET /users request is deferred until the dropdown is actually opened
// (not on parent-modal mount). Selected-but-unloaded ids are hydrated by a
// single-row `useUser(value)` lookup so the trigger renders the assignee
// name before the dropdown is touched.

function AssigneePicker({
  value,
  onValueChange,
}: {
  value: string | null
  onValueChange: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [rawSearch, setRawSearch] = useState('')
  const debouncedSearch = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)

  const query = useUserOptions(
    debouncedSearch,
    { is_active: true },
    { enabled: open },
  )
  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = query

  const rawItems = useMemo<UserListItem[]>(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data?.pages],
  )

  const valueAlreadyInList = !!value && rawItems.some((i) => i.id === value)
  const valueDetail = useUser(value && !valueAlreadyInList ? value : '')

  const items = useMemo<UserListItem[]>(() => {
    const seen = new Set<string>()
    const out: UserListItem[] = []
    if (value && !valueAlreadyInList && valueDetail.data) {
      out.push(valueDetail.data)
      seen.add(valueDetail.data.id)
    }
    for (const item of rawItems) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      out.push(item)
    }
    return out
  }, [value, valueAlreadyInList, valueDetail.data, rawItems])

  const selected = items.find((i) => i.id === value) ?? null

  function pick(id: string) {
    onValueChange(id)
    setOpen(false)
    setRawSearch('')
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onValueChange(null)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverSelectTrigger
        hasValue={!!value}
        onClear={clear}
        clearLabel={TASKS_STRINGS.assigneePicker.clearLabel}
      >
        {selected ? getUserDisplayName(selected) : TASKS_STRINGS.assigneePicker.placeholder}
      </PopoverSelectTrigger>
      <InfiniteScrollPickerContent
        search={{ value: rawSearch, onChange: setRawSearch, placeholder: TASKS_STRINGS.assigneePicker.searchPlaceholder }}
        query={{ isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage }}
        items={items}
        errorText={TASKS_STRINGS.assigneePicker.loadError}
        emptyText={rawSearch ? TASKS_STRINGS.assigneePicker.emptySearch : TASKS_STRINGS.assigneePicker.empty}
        renderItem={(item) => (
          <button
            type="button"
            onClick={() => pick(item.id)}
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
              'hover:bg-accent',
              value === item.id && 'bg-accent/50',
            )}
          >
            <span className="min-w-0 flex-1 truncate">
              {getUserDisplayName(item)}
            </span>
            {item.email && (
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {item.email}
              </span>
            )}
          </button>
        )}
      />
    </Popover>
  )
}
