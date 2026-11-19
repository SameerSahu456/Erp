import { useState } from "react"

import { DateRangePicker, type DateRange } from "@/components/common/pickers/DateRangePicker"
import { Label } from "@/components/ui/label"
import { Typography } from "@/components/ui/typography"
import { parseDateParam, toDateParam } from "@/shared/lib/date"

import { LINE_ITEMS_STRINGS } from "./line-items.strings"

const L = LINE_ITEMS_STRINGS.billingPeriod

export interface LineBillingPeriodProps {
  idPrefix: string
  /** The line's OWN window. Undefined means "same as the document". */
  startDate?: string
  endDate?: string
  /** The quote's / order's window — the value a line inherits, and the
   *  bound it may not escape. */
  documentStartDate?: string
  documentEndDate?: string
  disabled?: boolean
  /** Canonical `BuilderLineItem` field names; each surface maps them onto
   *  its own wire shape. */
  onChange: (next: { rentalStartDate?: string; rentalEndDate?: string }) => void
}

/**
 * A rental line's own billing window — HOW LONG this item is out.
 *
 * Only the window. The billing CADENCE (monthly / quarterly / custom,
 * the cycle day, arrears vs advance) is not a line-item property: it is
 * set once per order on the rentals module's Configure SO page and lives
 * on `so_configure`. Putting a per-line cadence next to it would offer a
 * choice the billing engine never reads.
 *
 * Shared by the quote builder and the SO form so the two cannot drift —
 * a quote converted to a sales order keeps the terms it was quoted with,
 * shown by the same control.
 *
 * Empty means "same as the document", so the quote's or order's span
 * shows as the effective value until this line is deliberately narrowed.
 * Only an explicit pick writes the line's dates, which makes an override
 * read as a deliberate act rather than a stale copy — and lets the
 * document's window still move every line that never opted out.
 *
 * Bounded by that window in BOTH directions: an item may be out for LESS
 * than the contract, never longer and never before it starts. Billing
 * anchors a unit on its LINE's window, so a line reaching past the
 * document would keep that unit earning after the contract has finished.
 */
export function LineBillingPeriod({
  idPrefix,
  startDate,
  endDate,
  documentStartDate,
  documentEndDate,
  disabled,
  onChange,
}: LineBillingPeriodProps) {
  // What the line bills on TODAY: its own date when it has one, else the
  // document's. Shown in the boxes so the effective span is readable
  // without opening the order — the same substitution the single range
  // control used to make.
  const effectiveStart = startDate ?? documentStartDate ?? ""
  const effectiveEnd = endDate ?? documentEndDate ?? ""

  // Neither end overridden — the line is simply running on the order's
  // window. Worth saying, because a date sitting in the box otherwise
  // reads as this line's own choice.
  const inherited = !startDate && !endDate

  // The start held while the operator picks the end. The shown value is the
  // EFFECTIVE window, which is always complete when the document has one, so
  // without this the picker would read the first click as starting a fresh
  // range on top of a finished one and never complete it.
  const [pending, setPending] = useState<DateRange | null>(null)
  const shown: DateRange | undefined =
    pending ??
    (effectiveStart || effectiveEnd
      ? { from: parseDateParam(effectiveStart), to: parseDateParam(effectiveEnd) }
      : undefined)

  function handleChange(next: DateRange | undefined) {
    if (next?.from && !next.to) {
      setPending(next)
      return
    }
    setPending(null)
    // An end equal to the document's is written as "inherit", so the line
    // keeps following the document's window on that side.
    const from = next?.from ? toDateParam(next.from) : undefined
    const to = next?.to ? toDateParam(next.to) : undefined
    onChange({
      rentalStartDate: from && from !== documentStartDate ? from : undefined,
      rentalEndDate: to && to !== documentEndDate ? to : undefined,
    })
  }

  return (
    <div className="mb-3 min-w-0 space-y-1.5">
      <Label htmlFor={`${idPrefix}-billing-period`}>{L.label}</Label>
      {/* One period, the same dual-calendar picker the rental SO form uses
          for the order's window. Bounded in BOTH directions: the picker
          disables every day before `startMonth` and after `endMonth`, not
          just the months — billing anchors a unit on its LINE's window, so
          a line reaching past the contract would keep the unit earning
          after the order finished. */}
      <DateRangePicker
        id={`${idPrefix}-billing-period`}
        value={shown}
        onChange={handleChange}
        startMonth={parseDateParam(documentStartDate)}
        endMonth={parseDateParam(documentEndDate)}
        placeholder={L.placeholder}
        disabled={disabled}
      />
      <Typography variant="helper" tone="muted">
        {inherited ? L.inherited : L.help}
      </Typography>
    </div>
  )
}

export default LineBillingPeriod
