import { Link } from "react-router-dom"
import { CheckCircle2, Circle, Clock, MapPin, Video } from "lucide-react"

import { StatusBadge } from "@/components/common/display/StatusBadge"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"

import type { useCalendarPage } from "../../hooks/calendar/useCalendarPage"
import {
  hhmm,
  MEETING_STATUS_VARIANT,
  TASK_STATUS_LABEL,
  TASK_STATUS_VARIANT,
} from "./calendarHelpers"
import { CALENDAR_STRINGS as S } from "./calendar.strings"

// lead/deal → plural route segment (backend discriminator, not user copy).
// Defined at module scope so its literals aren't inside the render JSX.
const entityRouteSegment = (entityType: string) =>
  entityType === "lead" ? "leads" : "deals"

export function CalendarDayDetail({ cal }: { cal: ReturnType<typeof useCalendarPage> }) {
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgb(var(--shadow-rgb)/0.04),0_1px_2px_rgb(var(--shadow-rgb)/0.03)]">
        <div className="border-b border-border bg-secondary/40 px-5 py-3">
          <h3 className="text-[13.5px] font-semibold tracking-tight">
            {cal.selectedDate
              ? S.dayDetail.formatSelectedDate(cal.selectedDate)
              : S.dayDetail.selectDate}
          </h3>
        </div>
        <div className="p-4">
          {cal.isError ? (
            <LoadErrorState error={cal.error} fallback={S.dayDetail.loadError} compact />
          ) : cal.isLoading ? (
            <p className="text-sm text-muted-foreground">{S.dayDetail.loading}</p>
          ) : !cal.selectedDate ? (
            <p className="text-sm text-muted-foreground">
              {S.dayDetail.clickPrompt}
            </p>
          ) : cal.selectedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {S.dayDetail.empty}
            </p>
          ) : (
            <div className="space-y-3">
              {cal.selectedItems.map((item) => {
                if (item.kind === "meeting") {
                  const m = item.data
                  return (
                    <div key={m.id} className="rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-[0_1px_3px_rgb(var(--shadow-rgb)/0.04)]">
                      <div className="flex items-start gap-2">
                        <Video className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium [overflow-wrap:anywhere]">{m.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {hhmm(m.start_time)} – {hhmm(m.end_time)} · {m.meeting_type}
                          </p>
                          {m.location && (
                            <p className="mt-0.5 flex min-w-0 items-start gap-1 text-xs text-muted-foreground">
                              <MapPin className="mt-0.5 size-3 shrink-0" />
                              <span className="line-clamp-2 [overflow-wrap:anywhere]">{m.location}</span>
                            </p>
                          )}
                          <div className="mt-1.5">
                            <StatusBadge variant={MEETING_STATUS_VARIANT[m.status]}>
                              {m.status}
                            </StatusBadge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                } else {
                  const t = item.data
                  return (
                    <div key={t.id} className="rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-[0_1px_3px_rgb(var(--shadow-rgb)/0.04)]">
                      <div className="flex items-start gap-2">
                        {t.status === "completed" ? (
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-green-500" />
                        ) : t.status === "in_progress" ? (
                          <Clock className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
                        ) : (
                          <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium [overflow-wrap:anywhere]">{t.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.assignee_name ?? S.dayDetail.unassigned} · {t.priority} {S.dayDetail.priority}
                          </p>
                          {t.entity_name && t.entity_type && t.entity_id && (
                            <Link
                              to={`/crm/${entityRouteSegment(t.entity_type)}/${t.entity_id}`}
                              className="mt-1 block text-xs text-primary hover:underline"
                            >
                              {t.entity_name}
                            </Link>
                          )}
                          <div className="mt-1.5">
                            <StatusBadge variant={TASK_STATUS_VARIANT[t.status]}>
                              {TASK_STATUS_LABEL[t.status]}
                            </StatusBadge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
