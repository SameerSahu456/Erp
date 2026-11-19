import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/common/pickers/DatePicker'
import { TimePicker } from '@/components/common/pickers/TimePicker'
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
import { AsyncSelect, type AsyncSelectOption } from '@/components/ui/async-select'
import { getUserDisplayName, useUserOptions } from '@modules/users'
import { useAuth } from '@shared/auth/use-auth'

import type { MeetingCreatePayload, MeetingType, MeetingWire } from '../../api'
import { MEETING_TYPE_LABELS, MEETING_TYPES } from '../../constants/meeting-labels'
import { MEETINGS_STRINGS } from './meetings.strings'

// AsyncSelect calls `useOptions(search, { enabled })` (two-arg shape).
// `useUserOptions` takes `(search, filters?, options?)` — bridge the slots so
// `{ enabled: open }` reaches the options slot and `loadOnOpen` works. Active
// users only; debounced search + scroll-to-load-more live inside AsyncSelect.
function useMeetingAssigneeOptions(
  search: string,
  options?: { enabled?: boolean },
) {
  return useUserOptions(search, { is_active: true }, options)
}

// HH:MM:SS (wire) → HH:MM (the TimePicker value).
const toTimeInput = (t: string) => t.slice(0, 5)

// Today as YYYY-MM-DD in the user's local calendar — the floor for a new
// meeting's date (a meeting cannot be scheduled in the past).
function todayYmd(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

// Current local time as HH:MM — the floor for a start time when the meeting
// is scheduled for today.
function nowHm(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`
}

interface MeetingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present → edit mode (PATCH); absent → create mode (POST). */
  meeting?: MeetingWire
  isPending: boolean
  onSubmit: (payload: MeetingCreatePayload) => void
}

// Shared create/edit dialog for a meeting. Form state is seeded once from
// `meeting` via useState initializers — the caller remounts the dialog
// (conditional render / `key`) so a different row re-seeds cleanly.
export function MeetingFormDialog({
  open,
  onOpenChange,
  meeting,
  isPending,
  onSubmit,
}: MeetingFormDialogProps) {
  const isEdit = !!meeting
  const { user } = useAuth()
  const today = todayYmd()
  const now = nowHm()

  const [title, setTitle] = useState(meeting?.title ?? '')
  const [description, setDescription] = useState(meeting?.description ?? '')
  const [type, setType] = useState<MeetingType>(
    meeting?.meeting_type ?? 'Video Call',
  )
  const [date, setDate] = useState(meeting?.meeting_date ?? '')
  const [startTime, setStartTime] = useState(
    meeting ? toTimeInput(meeting.start_time) : '10:00',
  )
  const [endTime, setEndTime] = useState(
    meeting ? toTimeInput(meeting.end_time) : '11:00',
  )
  const [location, setLocation] = useState(meeting?.location ?? '')
  const [assignedTo, setAssignedTo] = useState<AsyncSelectOption | null>(() => {
    // Edit → the meeting's existing assignee.
    if (meeting) {
      return meeting.assigned_to
        ? {
            id: meeting.assigned_to,
            label: meeting.assignee_name ?? MEETINGS_STRINGS.form.assignedFallbackLabel,
          }
        : null
    }
    // Create → default to the user creating the meeting.
    return user ? { id: user.id, label: getUserDisplayName(user) } : null
  })

  function handleSubmit() {
    // A new meeting cannot be scheduled in the past. Editing an existing
    // meeting skips this — its date may already have passed.
    if (!isEdit && date < today) {
      toast.error(MEETINGS_STRINGS.form.errors.datePast)
      return
    }
    // For a meeting scheduled today, the start time can't already be past.
    if (!isEdit && date === today && startTime < nowHm()) {
      toast.error(MEETINGS_STRINGS.form.errors.startPast)
      return
    }
    if (endTime <= startTime) {
      toast.error(MEETINGS_STRINGS.form.errors.endBeforeStart)
      return
    }
    if (!assignedTo) {
      toast.error(MEETINGS_STRINGS.form.errors.assigneeRequired)
      return
    }
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      meeting_type: type,
      meeting_date: date,
      start_time: startTime,
      end_time: endTime,
      location: location.trim() || null,
      assigned_to: assignedTo?.id ?? null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? MEETINGS_STRINGS.form.editTitle : MEETINGS_STRINGS.form.createTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{MEETINGS_STRINGS.form.titleLabel}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={MEETINGS_STRINGS.form.titlePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label>{MEETINGS_STRINGS.form.descriptionLabel}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={MEETINGS_STRINGS.form.descriptionPlaceholder}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{MEETINGS_STRINGS.form.typeLabel}</Label>
              <Select value={type} onValueChange={(v) => setType(v as MeetingType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {MEETING_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{MEETINGS_STRINGS.form.dateLabel}</Label>
              <DatePicker
                min={isEdit ? undefined : today}
                value={date}
                onChange={setDate}
                clearable={false}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{MEETINGS_STRINGS.form.startTimeLabel}</Label>
              <TimePicker
                min={!isEdit && date === today ? now : undefined}
                value={startTime}
                onChange={setStartTime}
              />
            </div>
            <div className="space-y-2">
              <Label>{MEETINGS_STRINGS.form.endTimeLabel}</Label>
              <TimePicker
                value={endTime}
                onChange={setEndTime}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{MEETINGS_STRINGS.form.locationLabel}</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={MEETINGS_STRINGS.form.locationPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label>{MEETINGS_STRINGS.form.assignedToLabel}</Label>
            <AsyncSelect
              value={assignedTo}
              onValueChange={setAssignedTo}
              useOptions={useMeetingAssigneeOptions}
              toLabel={getUserDisplayName}
              placeholder={MEETINGS_STRINGS.form.assignedPlaceholder}
              searchPlaceholder={MEETINGS_STRINGS.form.assignedSearchPlaceholder}
              clearable
              loadOnOpen
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {MEETINGS_STRINGS.form.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !date || !assignedTo || isPending}
          >
            {isPending
              ? isEdit
                ? MEETINGS_STRINGS.form.saving
                : MEETINGS_STRINGS.form.creating
              : isEdit
                ? MEETINGS_STRINGS.form.saveChanges
                : MEETINGS_STRINGS.form.createMeeting}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
