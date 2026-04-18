import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Video,
  Phone,
  MapPin,
  Users,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { StatusBadge, type StatusBadgeVariant } from '@/components/common/StatusBadge'
import { mockTasks } from '../data/tasks'
import { mockMeetings } from '../data/meetings'
import type { Task, Meeting } from '../types'

type CalendarItem =
  | { kind: 'task'; data: Task }
  | { kind: 'meeting'; data: Meeting }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function CalendarPage() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Build items map: date string -> items
  const itemsByDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {}

    for (const task of mockTasks) {
      const key = task.dueDate
      if (!map[key]) map[key] = []
      map[key].push({ kind: 'task', data: task })
    }

    for (const meeting of mockMeetings) {
      const key = meeting.date
      if (!map[key]) map[key] = []
      map[key].push({ kind: 'meeting', data: meeting })
    }

    return map
  }, [])

  // Calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const startPad = firstDay.getDay()
  const totalDays = lastDay.getDate()

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < startPad; i++) calendarDays.push(null)
  for (let d = 1; d <= totalDays; d++) calendarDays.push(d)
  // pad end to fill rows
  while (calendarDays.length % 7 !== 0) calendarDays.push(null)

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  function goToday() {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setSelectedDate(formatKey(today))
  }

  function formatKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  function dateKey(day: number) {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    )
  }

  const selectedItems = selectedDate ? (itemsByDate[selectedDate] ?? []) : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tasks and meetings at a glance
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-card">
            {/* Month Header */}
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-lg font-semibold">
                {MONTHS[currentMonth]} {currentYear}
              </h2>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={goToday}>
                  Today
                </Button>
                <Button variant="ghost" size="sm" onClick={prevMonth}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={nextMonth}>
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
              {calendarDays.map((day, i) => {
                if (day === null) {
                  return <div key={`pad-${i}`} className="min-h-[80px] border-b border-r bg-muted/20 last:border-r-0" />
                }

                const key = dateKey(day)
                const items = itemsByDate[key] ?? []
                const taskCount = items.filter((it) => it.kind === 'task').length
                const meetingCount = items.filter((it) => it.kind === 'meeting').length
                const isSelected = selectedDate === key

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    className={cn(
                      'min-h-[80px] border-b border-r p-1.5 text-left transition-colors hover:bg-muted/40 last:border-r-0',
                      isSelected && 'bg-primary/5 ring-1 ring-primary/30',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex size-6 items-center justify-center rounded-full text-xs',
                        isToday(day) && 'bg-primary text-primary-foreground font-semibold',
                      )}
                    >
                      {day}
                    </span>
                    {items.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {meetingCount > 0 && (
                          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                            {meetingCount} mtg
                          </span>
                        )}
                        {taskCount > 0 && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                            {taskCount} task
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

        {/* Sidebar: Selected Day Details */}
        <div>
          <div className="rounded-lg border bg-card">
            <div className="border-b px-5 py-3">
              <h3 className="text-sm font-semibold">
                {selectedDate
                  ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Select a date'}
              </h3>
            </div>
            <div className="p-4">
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground">
                  Click on a date to view tasks and meetings
                </p>
              ) : selectedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tasks or meetings on this day
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedItems.map((item) => {
                    if (item.kind === 'meeting') {
                      const m = item.data
                      return (
                        <div key={m.id} className="rounded-md border p-3">
                          <div className="flex items-start gap-2">
                            <Video className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{m.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {m.startTime} – {m.endTime} · {m.type}
                              </p>
                              {m.location && (
                                <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="size-3" /> {m.location}
                                </p>
                              )}
                              {m.entityName && (
                                <Link
                                  to={`/crm/${m.entityType === 'lead' ? 'leads' : 'deals'}/${m.entityId}`}
                                  className="mt-1 block text-xs text-primary hover:underline"
                                >
                                  {m.entityName}
                                </Link>
                              )}
                              <div className="mt-1.5">
                                <StatusBadge
                                  variant={
                                    m.status === 'Scheduled' ? 'info' :
                                    m.status === 'Completed' ? 'success' :
                                    m.status === 'Cancelled' ? 'error' : 'warning'
                                  }
                                >
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
                        <div key={t.id} className="rounded-md border p-3">
                          <div className="flex items-start gap-2">
                            {t.status === 'Completed' ? (
                              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-green-500" />
                            ) : t.status === 'In Progress' ? (
                              <Clock className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
                            ) : (
                              <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{t.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {t.assignedTo} · {t.priority} priority
                              </p>
                              {t.entityName && (
                                <Link
                                  to={`/crm/${t.entityType === 'lead' ? 'leads' : 'deals'}/${t.entityId}`}
                                  className="mt-1 block text-xs text-primary hover:underline"
                                >
                                  {t.entityName}
                                </Link>
                              )}
                              <div className="mt-1.5">
                                <StatusBadge
                                  variant={
                                    t.status === 'To Do' ? 'neutral' :
                                    t.status === 'In Progress' ? 'info' :
                                    t.status === 'Completed' ? 'success' : 'error'
                                  }
                                >
                                  {t.status}
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
      </div>
    </div>
  )
}

export { CalendarPage }
export default CalendarPage
