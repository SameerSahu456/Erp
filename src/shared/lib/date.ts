import {
  differenceInCalendarDays,
  formatDistanceToNowStrict,
  intervalToDuration,
  startOfToday,
} from "date-fns";

const IST_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  // 12-hour clock with an AM/PM suffix (uppercased below) — e.g. "01:31 PM".
  hour12: true,
});

const IST_DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const IST_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// `en-CA` renders as `YYYY-MM-DD` — used as a calendar bucket key so a UTC
// timestamp lands on the correct IST day rather than the viewer's local day.
const IST_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function parseValidDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatIST(iso: string | null | undefined): string {
  const parsed = parseValidDate(iso);
  // `en-IN` renders the day period lowercase ("pm"); uppercase it to "PM".
  return parsed
    ? IST_FORMATTER.format(parsed).replace(/\b([ap]m)\b/gi, (m) => m.toUpperCase())
    : "—";
}

/** Distance from now in whole units: "in 3 days", "2 hours ago". Timezone-free,
 *  so pair it with `formatIST` for the exact moment. "" for missing/invalid input. */
export function formatRelative(iso: string | null | undefined): string {
  const parsed = parseValidDate(iso);
  return parsed ? formatDistanceToNowStrict(parsed, { addSuffix: true }) : "";
}

export function formatIST_date(iso: string | null | undefined): string {
  const parsed = parseValidDate(iso);
  return parsed ? IST_DATE_FORMATTER.format(parsed) : "—";
}

export function formatIST_time(iso: string | null | undefined): string {
  const parsed = parseValidDate(iso);
  return parsed ? IST_TIME_FORMATTER.format(parsed) : "—";
}

// IST calendar-day key (`YYYY-MM-DD`) for a UTC ISO timestamp. Returns null for
// missing / invalid input so callers can skip undated rows.
export function toISTDateKey(iso: string | null | undefined): string | null {
  const parsed = parseValidDate(iso);
  return parsed ? IST_KEY_FORMATTER.format(parsed) : null;
}

// Serialize a calendar Date (e.g. one picked in a date-range filter) to the
// `YYYY-MM-DD` wire format the CRM list endpoints expect for `date_from` /
// `date_to`. Uses the Date's LOCAL calendar components on purpose — the value
// is a day the user picked on a calendar, not a backend UTC instant, so
// `toISOString()` (which shifts across the +5:30 offset and can land on the
// previous day) is wrong here. The backend reads the bare date as an IST day.
export function toDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Inverse of `toDateParam`: rebuild a local-calendar `Date` from a bare
// `YYYY-MM-DD` string (e.g. read back off a `?date_from` URL param). Builds
// the Date from local components — `new Date("YYYY-MM-DD")` parses as UTC
// midnight and would shift the day across a timezone offset, the same bug
// `toDateParam` avoids on the way out. Returns `undefined` for missing or
// malformed input so callers can treat it as "no bound picked".
export function parseDateParam(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// Convert a picked `{ from?, to? }` calendar range into the `date_from` /
// `date_to` wire params the CRM list endpoints expect. Both are `YYYY-MM-DD`
// (via `toDateParam`) or `undefined` when that bound isn't set — so a partial
// range (only `from` picked) sends just the lower bound. Shared by every CRM
// list controller hook so the conversion never drifts per-page.
//
// An inverted range (from after to — a hand-edited URL, a stale remembered
// filter) is swapped rather than sent: the API rejects it with a 422.
export function dateRangeToParams(
  range: { from?: Date; to?: Date } | undefined,
): { date_from?: string; date_to?: string } {
  const ordered = orderDateRange(range);
  return {
    date_from: ordered?.from ? toDateParam(ordered.from) : undefined,
    date_to: ordered?.to ? toDateParam(ordered.to) : undefined,
  };
}

// Swap an inverted `{ from, to }` (from later than to) so the earlier day is
// `from`. A partial or empty range passes through unchanged. Used wherever a
// range is read back from the URL or remembered state, so the picker and the
// API never see `from > to`.
export function orderDateRange<T extends { from?: Date; to?: Date }>(
  range: T | undefined,
): T | undefined {
  if (!range?.from || !range.to) return range;
  return range.from.getTime() > range.to.getTime()
    ? { ...range, from: range.to, to: range.from }
    : range;
}

// Human-readable label for a picked calendar Date (e.g. "11 Jun 2026"). Reads
// the Date's LOCAL calendar components (same basis as `toDateParam`) so the
// label matches the day sent on the wire — no timezone conversion.
export function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

// Today as a bare `YYYY-MM-DD` (local calendar) — used as the `min` bound on
// the Closure Date picker so past dates can't be selected.
export function todayDateParam(): string {
  return toDateParam(startOfToday());
}

// Today on the BUSINESS calendar (IST) as `YYYY-MM-DD` — not the browser's day,
// which differs for a travelling operator or a UTC-clocked machine.
export function istTodayDateParam(): string {
  return IST_KEY_FORMATTER.format(new Date());
}

// UTC bounds of an IST calendar day, for timestamp filters (startOfDay uses the browser zone).
const IST_OFFSET = "+05:30";
function dayParam(day: Date | string): string {
  return typeof day === "string" ? day : toDateParam(day);
}
export function istDayStartISO(day: Date | string): string {
  return new Date(`${dayParam(day)}T00:00:00.000${IST_OFFSET}`).toISOString();
}
export function istDayEndISO(day: Date | string): string {
  return new Date(`${dayParam(day)}T23:59:59.999${IST_OFFSET}`).toISOString();
}

// Compact "time until closure" badge for the CRM kanban cards. Given a bare
// `YYYY-MM-DD` closure date it returns the calendar gap from today rendered as
// the two most-significant non-zero units:
//   • years + months  → "1Y 2M"     (days dropped once there's a year)
//   • years + days     → "1Y 1D"     (when months is zero)
//   • months + days    → "1M 2D"
//   • days only        → "5D"
//   • due today        → "Today"
// A past date is prefixed with "-" ("-3D", "-1M 2D"). `isOverdue` is true the
// moment the gap reaches zero (closure day) and stays true afterwards, so the
// caller paints it green while there's time left (> 0 days) and red on/after
// the closure date. Returns null for missing / malformed input.
export function formatClosureCountdown(
  value: string | null | undefined,
): { text: string; isOverdue: boolean } | null {
  const target = parseDateParam(value);
  if (!target) return null;

  const today = startOfToday();
  const diffDays = differenceInCalendarDays(target, today);
  if (diffDays === 0) return { text: "Today", isOverdue: true };

  const isPast = diffDays < 0;
  const duration = isPast
    ? intervalToDuration({ start: target, end: today })
    : intervalToDuration({ start: today, end: target });

  const years = duration.years ?? 0;
  const months = duration.months ?? 0;
  const days = duration.days ?? 0;

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years}Y`);
    if (months > 0) parts.push(`${months}M`);
    else if (days > 0) parts.push(`${days}D`);
  } else if (months > 0) {
    parts.push(`${months}M`);
    if (days > 0) parts.push(`${days}D`);
  } else {
    parts.push(`${days}D`);
  }

  return { text: `${isPast ? "-" : ""}${parts.join(" ")}`, isOverdue: isPast };
}
