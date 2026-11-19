import { Inbox, SearchX } from "lucide-react"

import { TableCell, TableRow } from "@/components/ui/table"
import { Typography } from "@/components/ui/typography"

import { CRM_SHARED_STRINGS } from "./crm-shared.strings"

const S = CRM_SHARED_STRINGS.dataTableEmpty

interface EmbeddedEmptyRowProps {
  /** Number of table columns — the message spans them all. */
  colSpan: number
  /** True when a search / filter is applied (shows the "no results" copy + Clear filters). */
  filtered: boolean
  /** Title when nothing is filtered, e.g. "No quotes linked to this account". */
  emptyTitle: string
  onClearFilters: () => void
}

// The empty state of the embedded Deals / Quotes / Sales Orders tabs: the table
// keeps its header and the body becomes one tall, centred block — same look as
// the empty state on the Accounts list (muted icon, bold title, helper line and,
// when filtered, a "Clear filters" button).
export function EmbeddedEmptyRow({
  colSpan,
  filtered,
  emptyTitle,
  onClearFilters,
}: EmbeddedEmptyRowProps) {
  const Icon = filtered ? SearchX : Inbox
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="whitespace-normal p-0">
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <Icon className="mb-2 size-8 text-muted-foreground/40" aria-hidden="true" />
          <Typography variant="body-strong">{filtered ? S.filteredTitle : emptyTitle}</Typography>
          {filtered && (
            <Typography variant="body" tone="muted" className="max-w-lg text-pretty">
              {S.filteredDescription}
            </Typography>
          )}
          {filtered && (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-2 inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              {S.clearFilters}
            </button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
