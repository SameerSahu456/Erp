import { useState } from 'react'
import {
  Phone,
  Mail,
  Calendar,
  CheckSquare,
  MessageSquare,
  ArrowRight,
  Plus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Timeline, type TimelineEntry, type TimelineVariant } from '@/components/common/Timeline'
import { mockActivities } from '../data/activities'
import type { Activity } from '../types'

const activityTypeConfig: Record<
  Activity['type'],
  { icon: LucideIcon; label: string; variant: TimelineVariant }
> = {
  call: { icon: Phone, label: 'Call', variant: 'default' },
  email: { icon: Mail, label: 'Email', variant: 'default' },
  meeting: { icon: Calendar, label: 'Meeting', variant: 'success' },
  task: { icon: CheckSquare, label: 'Task', variant: 'warning' },
  note: { icon: MessageSquare, label: 'Note', variant: 'default' },
  stage_change: { icon: ArrowRight, label: 'Stage Change', variant: 'success' },
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface ActivityFeedProps {
  entityType: 'lead' | 'deal' | 'account' | 'contact'
  entityId: string
  className?: string
}

const ACTIVITY_TYPES: Activity['type'][] = [
  'call',
  'email',
  'meeting',
  'task',
  'note',
  'stage_change',
]

function ActivityFeed({ entityType, entityId, className }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>(mockActivities)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newType, setNewType] = useState<Activity['type']>('call')
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const filtered = activities
    .filter((a) => a.entityType === entityType && a.entityId === entityId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const timelineEntries: TimelineEntry[] = filtered.map((activity) => {
    const config = activityTypeConfig[activity.type]
    return {
      id: activity.id,
      icon: config.icon,
      title: activity.title,
      description: activity.description,
      user: activity.user,
      timestamp: formatRelativeTime(activity.timestamp),
      variant: config.variant,
    }
  })

  function handleSave() {
    if (!newTitle.trim()) return

    const newActivity: Activity = {
      id: `ACT-${Date.now()}`,
      type: newType,
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      user: 'Amar Daxini',
      timestamp: new Date().toISOString(),
      entityType,
      entityId,
    }

    setActivities((prev) => [newActivity, ...prev])
    setNewTitle('')
    setNewDescription('')
    setNewType('call')
    setDialogOpen(false)
  }

  function handleCancel() {
    setNewTitle('')
    setNewDescription('')
    setNewType('call')
    setDialogOpen(false)
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-ui font-medium text-muted-foreground uppercase tracking-wide">
          Activities
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button variant="outline" size="sm" />}
          >
            <Plus className="size-3.5" data-icon="inline-start" />
            Log Activity
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Log Activity</DialogTitle>
              <DialogDescription>Record a new activity for this record.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type</label>
                <Select value={newType} onValueChange={(val) => setNewType(val as Activity['type'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {activityTypeConfig[type].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Activity title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Add details..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!newTitle.trim()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {timelineEntries.length > 0 ? (
        <Timeline entries={timelineEntries} />
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No activities yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Log your first activity to start tracking interactions.
          </p>
        </div>
      )}
    </div>
  )
}

export { ActivityFeed, type ActivityFeedProps }
