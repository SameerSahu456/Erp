import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePersistedState } from '@/hooks/use-persisted-state'
import {
  Plus,
  Video,
  Phone,
  MapPin,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
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
import { mockMeetings } from '../data/meetings'
import type { Meeting, MeetingStatus, MeetingType } from '../types'
import { MOCK_USERS } from '../types'

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function getStatusVariant(status: MeetingStatus): StatusBadgeVariant {
  switch (status) {
    case 'Scheduled': return 'info'
    case 'Completed': return 'success'
    case 'Cancelled': return 'error'
    case 'Rescheduled': return 'warning'
  }
}

function getTypeIcon(type: MeetingType) {
  switch (type) {
    case 'Video Call': return <Video className="size-4 text-blue-500" />
    case 'Phone Call': return <Phone className="size-4 text-green-500" />
    case 'In Person': return <Users className="size-4 text-purple-500" />
    case 'Site Visit': return <MapPin className="size-4 text-orange-500" />
  }
}

function MeetingsPage() {
  const [meetings, setMeetings] = useState(mockMeetings)
  const [search, setSearch] = usePersistedState('crm-meetings:search', '')
  const [statusFilter, setStatusFilter] = usePersistedState<string>('crm-meetings:status', 'all')
  const [typeFilter, setTypeFilter] = usePersistedState<string>('crm-meetings:type', 'all')
  const [createOpen, setCreateOpen] = useState(false)
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    type: 'Video Call' as MeetingType,
    date: '',
    startTime: '10:00',
    endTime: '11:00',
    location: '',
  })

  const filtered = meetings.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false
    if (typeFilter !== 'all' && m.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        m.title.toLowerCase().includes(q) ||
        m.organizer.toLowerCase().includes(q) ||
        m.attendees.some((a) => a.toLowerCase().includes(q)) ||
        (m.entityName?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  const stats: StatCardData[] = [
    { label: 'Scheduled', value: meetings.filter((m) => m.status === 'Scheduled').length, variant: 'info' },
    { label: 'Completed', value: meetings.filter((m) => m.status === 'Completed').length, variant: 'success' },
    { label: 'This Week', value: meetings.filter((m) => {
      const d = new Date(m.date)
      const now = new Date()
      const weekEnd = new Date(now)
      weekEnd.setDate(now.getDate() + (7 - now.getDay()))
      return d >= now && d <= weekEnd
    }).length },
    { label: 'Total', value: meetings.length },
  ]

  function handleCreate() {
    const meeting: Meeting = {
      id: `MTG-${String(meetings.length + 1).padStart(3, '0')}`,
      title: newMeeting.title,
      description: newMeeting.description,
      status: 'Scheduled',
      type: newMeeting.type,
      date: newMeeting.date,
      startTime: newMeeting.startTime,
      endTime: newMeeting.endTime,
      location: newMeeting.location || undefined,
      attendees: ['Amar Daxini'],
      organizer: 'Amar Daxini',
      createdAt: new Date().toISOString(),
    }
    setMeetings((prev) => [meeting, ...prev])
    setCreateOpen(false)
    setNewMeeting({ title: '', description: '', type: 'Video Call', date: '', startTime: '10:00', endTime: '11:00', location: '' })
    toast.success('Meeting created successfully')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="cpt-page-title">Meetings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule and track meetings with leads and deals
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" data-icon="inline-start" />
          New Meeting
        </Button>
      </div>

      <StatsRow stats={stats} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search meetings..."
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
            <SelectItem value="Scheduled">Scheduled</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
            <SelectItem value="Rescheduled">Rescheduled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Video Call">Video Call</SelectItem>
            <SelectItem value="Phone Call">Phone Call</SelectItem>
            <SelectItem value="In Person">In Person</SelectItem>
            <SelectItem value="Site Visit">Site Visit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Meeting List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No meetings found matching your filters
          </div>
        ) : (
          filtered.map((meeting) => (
            <div
              key={meeting.id}
              className="rounded-lg border bg-card px-5 py-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{getTypeIcon(meeting.type)}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{meeting.title}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {meeting.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDate(meeting.date)} · {meeting.startTime} – {meeting.endTime}
                      </span>
                      {meeting.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {meeting.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
                      </span>
                      {meeting.entityName && (
                        <Link
                          to={`/crm/${meeting.entityType === 'lead' ? 'leads' : 'deals'}/${meeting.entityId}`}
                          className="text-primary hover:underline"
                        >
                          {meeting.entityName}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge variant={getStatusVariant(meeting.status)}>
                    {meeting.status}
                  </StatusBadge>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Meeting Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newMeeting.title}
                onChange={(e) => setNewMeeting((p) => ({ ...p, title: e.target.value }))}
                placeholder="Enter meeting title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newMeeting.description}
                onChange={(e) => setNewMeeting((p) => ({ ...p, description: e.target.value }))}
                placeholder="Meeting agenda or description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newMeeting.type}
                  onValueChange={(v) => setNewMeeting((p) => ({ ...p, type: v as MeetingType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Video Call">Video Call</SelectItem>
                    <SelectItem value="Phone Call">Phone Call</SelectItem>
                    <SelectItem value="In Person">In Person</SelectItem>
                    <SelectItem value="Site Visit">Site Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={newMeeting.date}
                  onChange={(e) => setNewMeeting((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newMeeting.startTime}
                  onChange={(e) => setNewMeeting((p) => ({ ...p, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newMeeting.endTime}
                  onChange={(e) => setNewMeeting((p) => ({ ...p, endTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={newMeeting.location}
                onChange={(e) => setNewMeeting((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g., Google Meet, Office address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!newMeeting.title.trim() || !newMeeting.date}
            >
              Create Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { MeetingsPage }
export default MeetingsPage
