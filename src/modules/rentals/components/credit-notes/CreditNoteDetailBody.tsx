import type { ReactNode } from "react"
import { Link, useParams } from "react-router-dom"

import { StatusBadge } from "@/components/common/display/StatusBadge"
import { DetailPageShell } from "@/components/page-shells"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"
import { formatINR } from "@/lib/currency"
import { EMPTY_VALUE } from "@/shared/constants"
import { asUuid } from "@shared/lib/validation"

import type { CreditNoteDetail } from "../../api/credit-notes"
import { useCreditNote } from "../../hooks/invoices/useCreditNotes"
import { formatRentalDay } from "../../lib/format"
import { RecordDetailFallback } from "../shared/RecordDetailFallback"
import { CREDIT_NOTE_STRINGS as S } from "./credit-notes.strings"

/** Back to where credit notes are listed: the Adjustments page. */
const LIST = "/rentals/billing-adjustments"

type Line = Record<string, unknown>
const text = (value: unknown) => (value == null || value === "" ? EMPTY_VALUE : String(value))
const money = (value: unknown) => formatINR(Number(value ?? 0))

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <Typography variant="helper" tone="muted">
        {label}
      </Typography>
      <div className="min-w-0 [overflow-wrap:anywhere]">{children}</div>
    </div>
  )
}

function CreditedLines({ lines }: { lines: Line[] }) {
  return (
    <ul className="divide-y rounded-md border">
      {lines.map((l, i) => (
        <li key={`${text(l.lineIndex)}-${i}`} className="flex min-w-0 items-start gap-3 p-3">
          <div className="min-w-0 flex-1 space-y-0.5">
            <Typography variant="body" truncate className="min-w-0">
              {S.line(text(l.part), text(l.serial))}
            </Typography>
            <Typography variant="caption" tone="muted">
              {S.lineInvoiced(money(l.invoicedAmount))} · {S.lineGst(text(l.gst), money(l.gstAmount))}
            </Typography>
          </div>
          <Typography variant="body-strong" numeric className="shrink-0">
            {money(l.creditAmount)}
          </Typography>
        </li>
      ))}
    </ul>
  )
}

function CreditNoteView({ note }: { note: CreditNoteDetail }) {
  const fromSwap = note.rental_billing_adjustment_id != null
  return (
    <DetailPageShell
      title={S.title(note.cn_number)}
      backHref={LIST}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link to={`/rentals/invoices/${note.rental_invoice_id}`} />}>
            {S.openInvoice}
          </Button>
          {fromSwap && (
            <Button
              variant="outline"
              render={<Link to={`/rentals/billing-adjustments/${note.rental_billing_adjustment_id}`} />}
            >
              {S.openAdjustment}
            </Button>
          )}
        </div>
      }
    >
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>{money(note.amount)}</CardTitle>
          <StatusBadge variant={fromSwap ? "info" : "neutral"}>
            {fromSwap ? S.source.adjustment : S.source.manual}
          </StatusBadge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Fact label={S.facts.date}>{formatRentalDay(note.cn_date)}</Fact>
          <Fact label={S.facts.invoice}>{note.invoice_number}</Fact>
          <Fact label={S.facts.account}>{note.account ?? EMPTY_VALUE}</Fact>
          <Fact label={S.amounts.taxable}>{money(note.taxable_amount)}</Fact>
          <Fact label={S.amounts.gst}>{money(note.gst_amount)}</Fact>
          <Fact label={S.facts.recordedBy}>{note.created_by_name ?? EMPTY_VALUE}</Fact>
          <div className="sm:col-span-3">
            <Fact label={S.facts.reason}>{note.reason}</Fact>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{S.linesTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreditedLines lines={note.lines} />
        </CardContent>
      </Card>
    </DetailPageShell>
  )
}

/** One credit note — from a swap adjustment or recorded on an invoice. The
 *  route id is validated first: a malformed one renders not-found. */
export function CreditNoteDetailBody() {
  const { id } = useParams<{ id: string }>()
  const query = useCreditNote(asUuid(id))
  if (!query.data) {
    return <RecordDetailFallback query={query} title={S.title(null)} backHref={LIST} loadError={S.loadError} />
  }
  return <CreditNoteView note={query.data} />
}
