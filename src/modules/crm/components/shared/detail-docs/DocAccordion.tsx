import { Fragment, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DETAIL_DOCS_STRINGS as S } from "./detail-docs.strings"
import {
  DocEmpty,
  DocNumberCell,
  DocSkeleton,
  type DocRow,
} from "./DocList"

const COLSPAN = 7

// Table variant of the detail document list: each document row expands in place
// to reveal its line items (rendered lazily by `renderLines` — the panel only
// mounts when the row is open), with a View action to open the full WMS detail
// page.
export function DocAccordion({
  rows,
  isLoading,
  isError,
  emptyText,
  renderLines,
}: {
  rows: DocRow[]
  isLoading: boolean
  isError: boolean
  emptyText: string
  /** Rendered inside the open row — mounted only when the row is expanded. */
  renderLines: (id: string) => ReactNode
}) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

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
            <TableHead className="w-8 pl-3" />
            <TableHead className="w-12 text-right">{S.columns.srNo}</TableHead>
            <TableHead>{S.columns.document}</TableHead>
            <TableHead>{S.columns.units}</TableHead>
            <TableHead>{S.columns.date}</TableHead>
            <TableHead>{S.columns.status}</TableHead>
            <TableHead className="w-16 pr-4 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            const isOpen = open.has(row.id)
            return (
              <Fragment key={row.id}>
                <TableRow className="cursor-pointer" onClick={() => toggle(row.id)}>
                  <TableCell className="w-8 pl-3">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? S.collapseRow : S.expandRow}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggle(row.id)
                      }}
                      className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ChevronRight
                        className={cn(
                          "size-4 transition-transform",
                          isOpen && "rotate-90",
                        )}
                      />
                    </button>
                  </TableCell>
                  <TableCell className="w-12 text-right tabular-nums text-muted-foreground">
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
                  <TableCell
                    className="pr-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link to={row.href} />}
                    >
                      {S.view}
                    </Button>
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COLSPAN} className="bg-muted/20 p-0">
                      <div className="px-4 py-3">{renderLines(row.id)}</div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
