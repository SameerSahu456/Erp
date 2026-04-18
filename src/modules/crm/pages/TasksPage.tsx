import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { StatsRow, type StatCardData } from '@/components/common/StatsRow'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { mockTasks } from '../data/tasks'
import type { Task, TaskStatus, TaskPriority } from '../types'
import { MOCK_USERS } from '../types'

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getStatusVariant(status: TaskStatus): StatusBadgeVariant {
  switch (status) {
    case 'To Do': return 'neutral'
    case 'In Progress': return 'info'
    case 'Completed': return 'success'
    case 'Cancelled': return 'error'
  }
}

function getPriorityVariant(priority: TaskPriority): StatusBadgeVariant {
  switch (priority) {
    case 'Low': return 'neutral'
    case 'Medium': return 'info'
    case 'High': return 'warning'
    case 'Urgent': return 'error'
  }
}

function getStatusIcon(status: TaskStatus) {
  switch (status) {
    case 'To Do': return <Circle className="size-3.5 text-muted-foreground" />
    case 'In Progress': return <Clock className="size-3.5 text-blue-500" />
    case 'Completed': return <CheckCircle2 className="size-3.5 text-green-500" />
    case 'Cancelled': return <XCircle className="size-3.5 text-red-500" />
  }
}

function TasksPage() {
  const [tasks, setTasks] = useState(mockTasks)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium' as TaskPriority,
    assignedTo: MOCK_USERS[0],
    dueDate: '',
  })

  const filtered = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        t.title.toLowerCase().includes(q) ||
        t.assignedTo.toLowerCase().includes(q) ||
        (t.entityName?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  const stats: StatCardData[] = [
    { label: 'To Do', value: tasks.filter((t) => t.status === 'To Do').length },
    { label: 'In Progress', value: tasks.filter((t) => t.status === 'In Progress').length, variant: 'info' },
    { label: 'Completed', value: tasks.filter((t) => t.status === 'Completed').length, variant: 'success' },
    { label: 'Overdue', value: tasks.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled' && new Date(t.dueDate) < new Date()).length, variant: 'warning' },
  ]

  const isOverdue = (task: Task) =>
    task.status !== 'Completed' && task.status !== 'Cancelled' && new Date(task.dueDate) < new Date()

  function handleCreate() {
    const task: Task = {
      id: `TASK-${String(tasks.length + 1).padStart(3, '0')}`,
      title: newTask.title,
      description: newTask.description,
      status: 'To Do',
      priority: newTask.priority,
      assignedTo: newTask.assignedTo,
      dueDate: newTask.dueDate,
      createdBy: 'Amar Daxini',
      createdAt: new Date().toISOString(),
    }
    setTasks((prev) => [task, ...prev])
    setCreateOpen(false)
    setNewTask({ title: '', description: '', priority: 'Medium', assignedTo: MOCK_USERS[0], dueDate: '' })
    toast.success('Task created successfully')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage tasks linked to leads and deals
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" data-icon="inline-start" />
          New Task
        </Button>
      </div>

      <StatsRow stats={stats} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="To Do">To Do</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="Urgent">Urgent</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No tasks found matching your filters
          </div>
        ) : (
          filtered.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-4 rounded-lg border bg-card px-5 py-3.5 transition-colors hover:bg-muted/30"
            >
              {/* Status icon */}
              <div className="shrink-0">{getStatusIcon(task.status)}</div>

              {/* Main content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{task.title}</span>
                  {isOverdue(task) && (
                    <AlertTriangle className="size-3.5 shrink-0 text-[#f6c000]" />
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{task.assignedTo}</span>
                  <span>Due {formatDate(task.dueDate)}</span>
                  {task.entityName && (
                    <Link
                      to={`/crm/${task.entityType === 'lead' ? 'leads' : 'deals'}/${task.entityId}`}
                      className="text-primary hover:underline"
                    >
                      {task.entityName}
                    </Link>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge variant={getPriorityVariant(task.priority)}>
                  {task.priority}
                </StatusBadge>
                <StatusBadge variant={getStatusVariant(task.status)}>
                  {task.status}
                </StatusBadge>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
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
            <Button
              onClick={handleCreate}
              disabled={!newTask.title.trim() || !newTask.dueDate}
            >
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { TasksPage }
export default TasksPage
