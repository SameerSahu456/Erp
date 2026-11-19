export type DatePreset =
  'today' | 'last7' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'custom'

export const DATE_PRESETS: readonly DatePreset[] = [
  'today',
  'last7',
  'thisMonth',
  'lastMonth',
  'thisQuarter',
  'thisYear',
  'custom',
]

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Local calendar `yyyy-MM-dd`. Local on purpose: `toISOString()` rolls IST
 *  evenings onto the next UTC day, which made "today" a future date. */
export const toIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

export interface DateRange {
  from: string
  to: string
}

export function getPresetDates(preset: DatePreset, now: Date = new Date()): DateRange {
  const today = toIsoDate(now)
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'last7': {
      const from = new Date(now)
      from.setDate(from.getDate() - 6)
      return { from: toIsoDate(from), to: today }
    }
    case 'thisMonth':
      return {
        from: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: today,
      }
    case 'lastMonth': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: toIsoDate(first), to: toIsoDate(last) }
    }
    case 'thisQuarter': {
      const q = Math.floor(now.getMonth() / 3)
      return {
        from: toIsoDate(new Date(now.getFullYear(), q * 3, 1)),
        to: today,
      }
    }
    case 'thisYear':
      return { from: toIsoDate(new Date(now.getFullYear(), 0, 1)), to: today }
    default:
      return { from: '', to: '' }
  }
}

export const isDatePreset = (v: string | null | undefined): v is DatePreset =>
  !!v && (DATE_PRESETS as readonly string[]).includes(v)
