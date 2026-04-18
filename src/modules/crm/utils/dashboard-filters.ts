import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns'

export type DateFilterPreset = 'today' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

export interface DateRange {
  from: Date
  to: Date
}

export function getDateRange(preset: DateFilterPreset, now: Date = new Date()): DateRange {
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }
    case 'monthly':
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'quarterly':
      return { from: startOfQuarter(now), to: endOfQuarter(now) }
    case 'yearly':
      return { from: startOfYear(now), to: endOfYear(now) }
    case 'custom':
      // Custom returns current month as default; caller overrides
      return { from: startOfMonth(now), to: endOfMonth(now) }
  }
}

export function isDateInRange(dateStr: string, range: DateRange): boolean {
  try {
    const d = parseISO(dateStr)
    return isWithinInterval(d, { start: range.from, end: range.to })
  } catch {
    return false
  }
}

// Simulated current user — in a real app this comes from auth context
export const CURRENT_USER = 'Amit Patel'
export const IS_SUPERADMIN = true // toggle to test role-based filtering
