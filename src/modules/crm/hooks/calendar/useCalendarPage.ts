import { useState } from "react"

import { usePermission } from "@shared/rbac"

import { crmCan } from "../../permissions"
import { useCalendar } from "./useCalendar"
import { useCreateMeeting } from "../meetings/useMeetings"
import { useCreateTaskGlobal } from "../tasks/useTasks"

// Container logic for the Calendar page: visible-month state, the live
// tasks+meetings query for that month, the grid layout maths, and the
// create-meeting / create-task flows.
export function useCalendarPage() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [createKind, setCreateKind] = useState<"meeting" | "task" | null>(null)

  const { can } = usePermission()
  const canCreateMeeting = can([...crmCan.writeMeeting])
  const canCreateTask = can([...crmCan.writeTask])
  const canCreate = canCreateMeeting || canCreateTask

  // Live tasks + meetings for the visible month.
  const { itemsByDate, isLoading, isError, error } = useCalendar(currentYear, currentMonth)

  const createMeetingMut = useCreateMeeting()
  const createTaskMut = useCreateTaskGlobal()

  // Calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const startPad = firstDay.getDay()
  const totalDays = lastDay.getDate()

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < startPad; i++) calendarDays.push(null)
  for (let d = 1; d <= totalDays; d++) calendarDays.push(d)
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

  function formatKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  function goToday() {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setSelectedDate(formatKey(today))
  }

  function dateKey(day: number) {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    )
  }

  const selectedItems = selectedDate ? (itemsByDate[selectedDate] ?? []) : []

  return {
    currentMonth,
    currentYear,
    selectedDate,
    setSelectedDate,
    createKind,
    setCreateKind,
    canCreate,
    canCreateMeeting,
    canCreateTask,
    itemsByDate,
    isLoading,
    isError,
    error,
    createMeetingMut,
    createTaskMut,
    calendarDays,
    prevMonth,
    nextMonth,
    goToday,
    dateKey,
    isToday,
    selectedItems,
  }
}
