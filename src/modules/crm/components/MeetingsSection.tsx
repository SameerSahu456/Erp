import { useState } from 'react'
import {
  Plus,
  Video,
  Phone,
  MapPin,
  Users,
  Calendar,
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
import { mockMeetings } from '../data/meetings'
import type { Meeting, MeetingType, MeetingStatus } from '../types'
import { MOCK_USERS } from '../types'

interface MeetingsSectionProps {
  entityType: 'lead' | 'deal' | 'account' | 'contact'
  entityId: string
  entityName: string
}

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
    case 'Video Call': return <Video className="size-3.5 text-blue-500" />
    case 'Phone Call': return <Phone className="size-3.5 text-green-500" />
    case 'In Person': return <Users className="size-3.5 text-purple-500" />
    case 'Site Visit': return <MapPin className="size-3.5 text-orange-500" />
  }
}

export function MeetingsSection({ entityType, entityId, entityName }: MeetingsSectionProps) {
  const relatedMeetings = mockMeetings.filter(
    (m) => m.entityType === entityType && m.entityId === entityId
  )

  const [localMeetings, setLocalMeetings] = useState<Meeting[]>(relatedMeetings)
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

  function handleCreate() {
    const meeting: Meeting = {
      id: `MTG-${Date.now()}`,
      title: newMeeting.title,
      description: newMeeting.description,
      status: 'Scheduled',
      type: newMeeting.type,
      date: newMeeting.date,
      startTime: newMeeting.startTime,
      endTime: newMeeting.endTime,
      location: newMeeting.location || undefined,
      attendees: ['Amar Daxini'],
      entityType,
      entityId,
      entityName,
      organizer: 'Amar Daxini',
      createdAt: new Date().toISOString(),
    }
    setLocalMeetings((prev) => [meeting, ...prev])
    setCreateOpen(false)
    setNewMeeting({ title: '', description: '', type: 'Video Call', date: '', startTime: '10:00', endTime: '11:00', location: '' })
    toast.success('Meeting scheduled successfully')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" data-icon="inline-start" />
          Schedule Meeting
        </Button>
      </div>

      {localMeetings.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No meetings linked to this {entityType}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Schedule a meeting to plan discussions and follow-ups.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {localMeetings.map((meeting) => (
            <div key={meeting.id} className="rounded-lg border bg-card px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">{getTypeIcon(meeting.type)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{meeting.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
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
                        {meeting.attendees.length}
                      </span>
                    </div>
                    {meeting.notes && (
                      <p className="mt-1.5 text-xs italic text-muted-foreground">{meeting.notes}</p>
                    )}
                  </div>
                </div>
                <StatusBadge variant={getStatusVariant(meeting.status)}>
                  {meeting.status}
                </StatusBadge>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
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
            <Button onClick={handleCreate} disabled={!newMeeting.title.trim() || !newMeeting.date}>
              Schedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
