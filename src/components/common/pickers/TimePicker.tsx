import { useMemo, useEffect, useRef, useState } from "react"
import { ClockIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface TimePickerProps {
  /** Selected time as a zero-padded 24h `HH:MM` string (the wire format). `""`
   *  means nothing picked. Same value contract the native `<input type="time">`
   *  used, so existing string comparisons (`end <= start`) keep working. */
  value: string
  onChange: (value: string) => void
  /** Earliest selectable time (`HH:MM`). Accepted for API parity; the hard guard
   *  stays in the form's submit validation. */
  min?: string
  disabled?: boolean
  id?: string
  className?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

type Period = "AM" | "PM"

const pad = (n: number) => String(n).padStart(2, "0")

// 12h hour + AM/PM → 24h hour. 12 AM → 0, 12 PM → 12.
function to24h(h12: number, period: Period): number {
  return (h12 % 12) + (period === "PM" ? 12 : 0)
}

function parseValue(value: string): { h12: number; minute: number; period: Period } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value)
  if (!m) return null
  const h24 = Number(m[1])
  const minute = Number(m[2])
  if (h24 > 23 || minute > 59) return null
  return {
    h12: h24 % 12 === 0 ? 12 : h24 % 12,
    minute,
    period: h24 < 12 ? "AM" : "PM",
  }
}

// Compose the segment strings back into a 24h `HH:MM` — or "" if incomplete /
// out of range, so we never emit a half-typed value.
function compose(hourStr: string, minuteStr: string, period: Period): string {
  if (!hourStr || !minuteStr) return ""
  const h = Number(hourStr)
  const m = Number(minuteStr)
  if (!Number.isInteger(h) || h < 1 || h > 12) return ""
  if (!Number.isInteger(m) || m < 0 || m > 59) return ""
  return `${pad(to24h(h, period))}:${pad(m)}`
}

// Time-of-day picker: the standard form time field. Mirrors the native
// `<input type="time">` — inline HH : MM AM/PM segments you type into, plus a
// clock that opens the native-style three-column picker (Hours · Minutes ·
// AM/PM) with the current value pinned to the top of each column. Re-themed with
// shadcn tokens (primary highlight, not the browser blue). Value stays 24h
// `HH:MM` for the wire; the UI reads 12h.
export function TimePicker({
  value,
  onChange,
  disabled,
  id,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
}: TimePickerProps) {
  const initial = parseValue(value)
  const [hour, setHour] = useState(initial ? String(initial.h12) : "")
  const [minute, setMinute] = useState(initial ? pad(initial.minute) : "")
  const [period, setPeriod] = useState<Period>(initial?.period ?? "AM")
  const [open, setOpen] = useState(false)
  // Column order is frozen to the value when the picker OPENS so it doesn't
  // reshuffle while you pick (native shows the selected pinned to the top).
  const [anchor, setAnchor] = useState({ h12: 12, minute: 0, period: "AM" as Period })

  const hourRef = useRef<HTMLInputElement>(null)
  const minuteRef = useRef<HTMLInputElement>(null)
  const periodRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Re-sync from an EXTERNAL value change only (not our own emits) so typing is
  // never clobbered mid-edit.
  useEffect(() => {
    if (value === compose(hour, minute, period)) return
    const p = parseValue(value)
    setHour(p ? String(p.h12) : "")
    setMinute(p ? pad(p.minute) : "")
    setPeriod(p?.period ?? "AM")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Rotated column lists: start each column at the anchor so the selection sits
  // at the top, then continue cyclically — 11,12,01,02… exactly like native.
  const hourOpts = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ((anchor.h12 - 1 + i) % 12) + 1),
    [anchor.h12],
  )
  const minuteOpts = useMemo(
    () => Array.from({ length: 60 }, (_, i) => (anchor.minute + i) % 60),
    [anchor.minute],
  )
  const periodOpts = useMemo<Period[]>(
    () => (anchor.period === "AM" ? ["AM", "PM"] : ["PM", "AM"]),
    [anchor.period],
  )

  const emit = (h: string, m: string, p: Period) => {
    const next = compose(h, m, p)
    if (next) onChange(next)
  }

  const onHourChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 2)
    setHour(digits)
    emit(digits, minute, period)
    if (digits.length === 2 || Number(digits) > 1) {
      minuteRef.current?.focus()
      minuteRef.current?.select()
    }
  }

  const onMinuteChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 2)
    setMinute(digits)
    emit(hour, digits, period)
    if (digits.length === 2 || Number(digits) > 5) periodRef.current?.focus()
  }

  const stepHour = (dir: 1 | -1) => {
    const cur = Number(hour) || (dir > 0 ? 0 : 1)
    const next = dir > 0 ? (cur % 12) + 1 : ((cur + 10) % 12) + 1
    const s = String(next)
    setHour(s)
    emit(s, minute, period)
  }
  const stepMinute = (dir: 1 | -1) => {
    const cur = Number(minute) || 0
    const next = dir > 0 ? (cur + 1) % 60 : (cur + 59) % 60
    const s = pad(next)
    setMinute(s)
    emit(hour, s, period)
  }
  const setP = (p: Period) => {
    setPeriod(p)
    emit(hour, minute, p)
  }

  const onOpenChange = (o: boolean) => {
    if (disabled) return
    if (o) {
      const p = parseValue(value)
      setAnchor(p ?? { h12: Number(hour) || 12, minute: Number(minute) || 0, period })
    }
    setOpen(o)
  }

  const onRootBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null
    if (rootRef.current?.contains(next) || panelRef.current?.contains(next)) return
    const composed = compose(hour, minute, period)
    if (composed) {
      if (minute.length === 1) setMinute(pad(Number(minute)))
    } else {
      const p = parseValue(value)
      setHour(p ? String(p.h12) : "")
      setMinute(p ? pad(p.minute) : "")
      setPeriod(p?.period ?? "AM")
    }
  }

  const segmentClass =
    "w-[2.25ch] rounded-[4px] bg-transparent text-center tabular-nums outline-none placeholder:text-muted-foreground focus:bg-primary/10 disabled:cursor-not-allowed"

  const curHour = Number(hour)
  const curMinute = Number(minute)
  const hasValue = compose(hour, minute, period) !== ""

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <div
        ref={rootRef}
        id={id}
        data-slot="time-picker"
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        onBlur={onRootBlur}
        className={cn(
          "group/time-picker flex h-10 w-full items-center rounded-[7px] border border-input bg-card pl-[10px] pr-1.5 text-[13.5px] shadow-xs",
          "transition-colors focus-within:border-primary focus-within:ring-3 focus-within:ring-ring",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <div className="flex flex-1 items-center gap-0.5">
          <input
            ref={hourRef}
            type="text"
            inputMode="numeric"
            aria-label="Hour"
            placeholder="HH"
            disabled={disabled}
            value={hour}
            onFocus={(e) => e.target.select()}
            onChange={(e) => onHourChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") { e.preventDefault(); stepHour(1) }
              else if (e.key === "ArrowDown") { e.preventDefault(); stepHour(-1) }
              else if (e.key === "ArrowRight" || e.key === ":") {
                e.preventDefault()
                minuteRef.current?.focus()
                minuteRef.current?.select()
              }
            }}
            className={segmentClass}
          />
          <span className="text-muted-foreground">:</span>
          <input
            ref={minuteRef}
            type="text"
            inputMode="numeric"
            aria-label="Minute"
            placeholder="MM"
            disabled={disabled}
            value={minute}
            onFocus={(e) => e.target.select()}
            onChange={(e) => onMinuteChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") { e.preventDefault(); stepMinute(1) }
              else if (e.key === "ArrowDown") { e.preventDefault(); stepMinute(-1) }
              else if (e.key === "ArrowRight") { e.preventDefault(); periodRef.current?.focus() }
              else if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) {
                e.preventDefault()
                hourRef.current?.focus()
                hourRef.current?.select()
              } else if (e.key === "Backspace" && minute === "") {
                e.preventDefault()
                hourRef.current?.focus()
              }
            }}
            className={segmentClass}
          />
          <button
            ref={periodRef}
            type="button"
            disabled={disabled}
            aria-label="AM or PM"
            onClick={() => setP(period === "AM" ? "PM" : "AM")}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault()
                setP(period === "AM" ? "PM" : "AM")
              } else if (e.key === "a" || e.key === "A") { e.preventDefault(); setP("AM") }
              else if (e.key === "p" || e.key === "P") { e.preventDefault(); setP("PM") }
              else if (e.key === "ArrowLeft") { e.preventDefault(); minuteRef.current?.focus() }
            }}
            className="ml-1 w-[3.25ch] rounded-[4px] px-0.5 text-center font-medium uppercase tabular-nums outline-none focus:bg-primary/10 disabled:cursor-not-allowed"
          >
            {period}
          </button>
        </div>

        {/* Clock — opens the three-column picker (native affordance). */}
        <PopoverTrigger
          data-slot="time-picker-clock"
          disabled={disabled}
          aria-label="Open time picker"
          className={cn(
            "ml-1 flex size-7 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground",
            "transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed",
          )}
        >
          <ClockIcon className="size-4" />
        </PopoverTrigger>
      </div>

      <PopoverContent align="end" sideOffset={6} className="w-auto p-1.5">
        <div ref={panelRef} className="flex gap-1">
          <TimeColumn ariaLabel="Hour">
            {hourOpts.map((h) => (
              <TimeCell key={h} selected={hasValue && curHour === h} onClick={() => { setHour(String(h)); emit(String(h), minute, period) }}>
                {pad(h)}
              </TimeCell>
            ))}
          </TimeColumn>
          <TimeColumn ariaLabel="Minute">
            {minuteOpts.map((m) => (
              <TimeCell key={m} selected={hasValue && curMinute === m} onClick={() => { setMinute(pad(m)); emit(hour, pad(m), period) }}>
                {pad(m)}
              </TimeCell>
            ))}
          </TimeColumn>
          <TimeColumn ariaLabel="AM/PM">
            {periodOpts.map((p) => (
              <TimeCell key={p} selected={hasValue && period === p} onClick={() => setP(p)}>
                {p}
              </TimeCell>
            ))}
          </TimeColumn>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function TimeColumn({ ariaLabel, children }: { ariaLabel: string; children: React.ReactNode }) {
  return (
    <div
      role="listbox"
      aria-label={ariaLabel}
      className="flex max-h-[260px] w-16 flex-col gap-0.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  )
}

function TimeCell({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-selected={selected}
      onClick={onClick}
      className={cn(
        "flex h-8 shrink-0 items-center justify-center rounded-[6px] text-[13px] tabular-nums transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-primary font-medium text-primary-foreground hover:bg-primary"
          : "text-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </button>
  )
}
