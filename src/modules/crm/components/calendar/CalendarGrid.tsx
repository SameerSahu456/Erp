import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { useCalendarPage } from "../../hooks/calendar/useCalendarPage"
import { DAYS, MONTHS } from "./calendarHelpers"
import { CALENDAR_STRINGS as S } from "./calendar.strings"

export function CalendarGrid({ cal }: { cal: ReturnType<typeof useCalendarPage> }) {
  return (
    <div className="lg:col-span-2">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgb(var(--shadow-rgb)/0.04),0_1px_2px_rgb(var(--shadow-rgb)/0.03)]">
        {/* Month Header */}
        <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-3">
          <h2 className="text-[15px] font-semibold tracking-tight">
            {MONTHS[cal.currentMonth]} {cal.currentYear}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={cal.goToday} className="h-8">
              {S.grid.today}
            </Button>
            <Button variant="ghost" size="sm" onClick={cal.prevMonth} className="h-8 w-8 p-0">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={cal.nextMonth} className="h-8 w-8 p-0">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {DAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cal.calendarDays.map((day, i) => {
            if (day === null) {
              return <div key={`pad-${i}`} className="min-h-[80px] border-b border-r bg-muted/20 last:border-r-0" />
            }

            const key = cal.dateKey(day)
            const items = cal.itemsByDate[key] ?? []
            const taskCount = items.filter((it) => it.kind === "task").length
            const meetingCount = items.filter((it) => it.kind === "meeting").length
            const isSelected = cal.selectedDate === key

            return (
              <button
                key={key}
                onClick={() => cal.setSelectedDate(key)}
                className={cn(
                  "min-h-[80px] border-b border-r p-1.5 text-left transition-colors hover:bg-muted/40 last:border-r-0",
                  isSelected && "bg-primary/5 ring-1 ring-primary/30",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs",
                    cal.isToday(day) && "bg-primary text-primary-foreground font-semibold",
                  )}
                >
                  {day}
                </span>
                {items.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {meetingCount > 0 && (
                      <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                        {S.grid.meetingCount(meetingCount)}
                      </span>
                    )}
                    {taskCount > 0 && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                        {S.grid.taskCount(taskCount)}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
