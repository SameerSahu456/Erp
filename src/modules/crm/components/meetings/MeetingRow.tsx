import { Ban, Calendar, CheckCircle2, MapPin, Pencil, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { ClampedText } from "@/components/common/display/ClampedText"
import { formatIST_date } from "@shared/lib/date"

import type { MeetingWire } from "../../api"
import { MEETING_STATUS_LABELS } from "../../constants/meeting-labels"
import type { useMeetingsList } from "../../hooks/meetings/useMeetingsList"
import { getStatusVariant, getTypeIcon, hhmm } from "./meetingListHelpers"
import { MEETINGS_STRINGS } from "./meetings.strings"

type List = ReturnType<typeof useMeetingsList>

export function MeetingRow({ meeting, list }: { meeting: MeetingWire; list: List }) {
  const completing = list.completeMut.isPending && list.completeMut.variables === meeting.id
  const cancelling = list.cancelMut.isPending && list.cancelMut.variables === meeting.id

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.03)] transition-all hover:-translate-y-px hover:border-primary/20 hover:shadow-[0_4px_12px_-4px_rgb(var(--shadow-rgb)/0.06),0_2px_4px_-2px_rgb(var(--shadow-rgb)/0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">{getTypeIcon(meeting.meeting_type)}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{meeting.title}</span>
            </div>
            {meeting.description && (
              <ClampedText text={meeting.description} lines={2} className="mt-0.5" />
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex shrink-0 items-center gap-1">
                <Calendar className="size-3" />
                {formatIST_date(meeting.meeting_date)} · {hhmm(meeting.start_time)} – {hhmm(meeting.end_time)}
              </span>
              {meeting.location && (
                <span className="flex min-w-0 items-center gap-1">
                  <MapPin className="size-3 shrink-0" />
                  <span className="line-clamp-2 [overflow-wrap:anywhere]">{meeting.location}</span>
                </span>
              )}
              {meeting.assignee_name && (
                <span className="flex items-center gap-1">
                  <Users className="size-3" />
                  {meeting.assignee_name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge variant={getStatusVariant(meeting.status)}>
            {MEETING_STATUS_LABELS[meeting.status]}
          </StatusBadge>
          {/* Row actions — backend rejects PATCH / complete / cancel on terminal
              meetings, so they only render while Scheduled, and are write-gated. */}
          {meeting.status === "Scheduled" && list.canWrite && (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => list.setEditingMeeting(meeting)}
                aria-label={MEETINGS_STRINGS.row.editAria}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => list.completeMut.mutate(meeting.id)}
                disabled={completing}
                aria-label={MEETINGS_STRINGS.row.completeAria}
              >
                <CheckCircle2 />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => list.cancelMut.mutate(meeting.id)}
                disabled={cancelling}
                aria-label={MEETINGS_STRINGS.row.cancelAria}
              >
                <Ban />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
