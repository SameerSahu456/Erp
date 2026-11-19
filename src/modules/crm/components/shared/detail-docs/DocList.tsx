import { Link } from "react-router-dom"
import { FileText, Inbox } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { EntityRef } from "@/components/common/display/EntityRef"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DETAIL_DOCS_STRINGS as S } from "./detail-docs.strings"

export interface DocRow {
  id: string
  number: string
  status: string
  statusVariant: StatusBadgeVariant
  /** Unit / item count for this document, already labelled (e.g. "4 units").
   *  Empty when the document type has no unit count — the cell shows "—". */
  units: string
  /** Formatted date (IST) for this document. */
  date: string
  href: string
}

// A muted "Components +N" pill, rendered against a single line item inside an
// expanded accordion row when that unit carries fitted BOM components — so the
// components are visible per unit without inflating the document's unit count.
// Renders nothing when the unit has no components.
export function ComponentCountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5">
      <Typography variant="caption" tone="muted">
        {S.componentsBadge(count)}
      </Typography>
    </span>
  )
}

// A few skeleton rows while the list loads (§0 — never a bare page spinner).
export function DocSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  )
}

// A quiet centred empty/error state — icon + one line — shared by both the flat
// table and the accordion table so every fulfillment tab reads the same when
// there's nothing to show.
export function DocEmpty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
      <Inbox className="size-6 text-muted-foreground/60" aria-hidden />
      <Typography variant="helper" tone="muted">
        {text}
      </Typography>
    </div>
  )
}

// The document cell: a small icon + the document number, shared by the flat
// table and the accordion header cell so they read identically. When an `href`
// is given the number becomes an EntityRef — single click opens the document,
// double click copies the number.
export function DocNumberCell({
  number,
  href,
}: {
  number: string
  href?: string
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      {href ? (
        <EntityRef
          href={href}
          value={number}
          className="min-w-0 truncate font-semibold"
        >
          {number}
        </EntityRef>
      ) : (
        <Typography variant="body-strong" truncate className="min-w-0">
          {number}
        </Typography>
      )}
    </span>
  )
}

// Styled container for the line items revealed inside an expanded accordion
// row — a bordered, divided card so the lines read as a contained sub-table
// rather than a loose bullet list.
export function DocLines({ children }: { children: import("react").ReactNode }) {
  return (
    // Transparent, not its own white card: the expanded rows read as an inset
    // section of the one white table above, rather than a card nested inside it.
    <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
      {children}
    </ul>
  )
}

// One line inside DocLines: a left identity block and a right trailing slot
// (status badge / count). Kept generic so each tab supplies its own content.
export function DocLineRow({
  left,
  right,
}: {
  left: import("react").ReactNode
  right: import("react").ReactNode
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">{left}</div>
      <span className="shrink-0">{right}</span>
    </li>
  )
}

// Shared read-only TABLE for the detail document tabs (Material Issues /
// Dispatch Requests / Replacement Requests / Sales Returns). One row per
// document — Sr No, number, a details line, status — each linking out to that
// document's own detail page.
export function DocList({
  rows,
  isLoading,
  isError,
  emptyText,
}: {
  rows: DocRow[]
  isLoading: boolean
  isError: boolean
  emptyText: string
}) {
  if (isLoading && rows.length === 0) {
    return <DocSkeleton />
  }
  if (isError) {
    return <DocEmpty text={S.loadError} />
  }
  if (rows.length === 0) {
    return <DocEmpty text={emptyText} />
  }

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-auto rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.05)]">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-12 pl-4 text-right">
              {S.columns.srNo}
            </TableHead>
            <TableHead>{S.columns.document}</TableHead>
            <TableHead>{S.columns.units}</TableHead>
            <TableHead>{S.columns.date}</TableHead>
            <TableHead>{S.columns.status}</TableHead>
            <TableHead className="w-16 pr-4 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={row.id}>
              <TableCell className="w-12 pl-4 text-right tabular-nums text-muted-foreground">
                {i + 1}
              </TableCell>
              <TableCell>
                <DocNumberCell number={row.number} href={row.href} />
              </TableCell>
              <TableCell className="tabular-nums whitespace-nowrap">
                <Typography variant="body" tone="muted">
                  {row.units || "—"}
                </Typography>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Typography variant="body" tone="muted">
                  {row.date}
                </Typography>
              </TableCell>
              <TableCell>
                <StatusBadge variant={row.statusVariant}>
                  {row.status}
                </StatusBadge>
              </TableCell>
              <TableCell className="pr-4 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link to={row.href} />}
                >
                  {S.view}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
