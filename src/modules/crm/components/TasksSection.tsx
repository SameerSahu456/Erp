import { useState } from 'react'
import {
  Plus,
  CheckCircle2,
  Clock,
  Circle,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { mockTasks } from '../data/tasks'
import type { Task, TaskPriority } from '../types'
import { MOCK_USERS } from '../types'

interface TasksSectionProps {
  entityType: 'lead' | 'deal'
  entityId: string
  entityName: string
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'To Do': return 'neutral'
    case 'In Progress': return 'info'
    case 'Completed': return 'success'
    case 'Cancelled': return 'error'
    default: return 'neutral'
  }
}

function getPriorityVariant(priority: string): StatusBadgeVariant {
  switch (priority) {
    case 'Low': return 'neutral'
    case 'Medium': return 'info'
    case 'High': return 'warning'
    case 'Urgent': return 'error'
    default: return 'neutral'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'To Do': return <Circle className="size-3.5 text-muted-foreground" />
    case 'In Progress': return <Clock className="size-3.5 text-blue-500" />
    case 'Completed': return <CheckCircle2 className="size-3.5 text-green-500" />
    case 'Cancelled': return <XCircle className="size-3.5 text-red-500" />
    default: return <Circle className="size-3.5 text-muted-foreground" />
  }
}

export function TasksSection({ entityType, entityId, entityName }: TasksSectionProps) {
  const relatedTasks = mockTasks.filter(
    (t) => t.entityType === entityType && t.entityId === entityId
  )

  const [localTasks, setLocalTasks] = useState<Task[]>(relatedTasks)
  const [createOpen, setCreateOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium' as TaskPriority,
    assignedTo: MOCK_USERS[0] as string,
    dueDate: '',
  })

  const isOverdue = (task: Task) =>
    task.status !== 'Completed' && task.status !== 'Cancelled' && new Date(task.dueDate) < new Date()

  function handleCreate() {
    const task: Task = {
      id: `TASK-${Date.now()}`,
      title: newTask.title,
      description: newTask.description,
      status: 'To Do',
      priority: newTask.priority,
      assignedTo: newTask.assignedTo,
      dueDate: newTask.dueDate,
      entityType,
      entityId,
      entityName,
      createdBy: 'Amar Daxini',
      createdAt: new Date().toISOString(),
    }
    setLocalTasks((prev) => [task, ...prev])
    setCreateOpen(false)
    setNewTask({ title: '', description: '', priority: 'Medium', assignedTo: MOCK_USERS[0], dueDate: '' })
    toast.success('Task created successfully')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" data-icon="inline-start" />
          Create Task
        </Button>
      </div>

      {localTasks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No tasks linked to this {entityType}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a task to track follow-ups and actions.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {localTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
            >
              <div className="shrink-0">{getStatusIcon(task.status)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{task.title}</span>
                  {isOverdue(task) && <AlertTriangle className="size-3.5 shrink-0 text-[#f6c000]" />}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {task.assignedTo} · Due {formatDate(task.dueDate)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge variant={getPriorityVariant(task.priority)}>{task.priority}</StatusBadge>
                <StatusBadge variant={getStatusVariant(task.status)}>{task.status}</StatusBadge>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                placeholder="Enter task title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(v) => setNewTask((p) => ({ ...p, priority: v as TaskPriority }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask((p) => ({ ...p, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select
                value={newTask.assignedTo}
                onValueChange={(v) => setNewTask((p) => ({ ...p, assignedTo: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOCK_USERS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newTask.title.trim() || !newTask.dueDate}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
