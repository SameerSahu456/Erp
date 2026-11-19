import { useMemo } from "react"

import { cn } from "@/lib/utils"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { ELLIPSIS, paginationWindow } from "@/shared/lib/pagination-window"

import { CRM_SHARED_STRINGS } from "./crm-shared.strings"

type CrmListPaginationFooterProps = {
  page: number
  totalPages: number
  rangeStart: number
  rangeEnd: number
  total: number
  isFetching: boolean
  /** Plural noun used in the refreshing label, e.g. "tasks" / "meetings". */
  noun: string
  onPageChange: (page: number) => void
}

// Compact numbered server-paged footer for CRM card lists (tasks, meetings, …).
// Mirrors the canonical Leads list pattern / BusinessMetricsTable footer.
export function CrmListPaginationFooter({
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  total,
  isFetching,
  noun,
  onPageChange,
}: CrmListPaginationFooterProps) {
  const visiblePages = useMemo(
    () => paginationWindow(page, totalPages),
    [page, totalPages],
  )

  if (total === 0) return null

  const handle = (target: number) => (event: React.MouseEvent) => {
    event.preventDefault()
    if (target < 1 || target > totalPages || target === page) return
    onPageChange(target)
  }

  return (
    <div className="mt-3 flex flex-col items-center justify-between gap-2 border-t border-border/60 px-2 pt-3 sm:flex-row">
      <div className="text-[12px] text-muted-foreground">
        {isFetching ? (
          CRM_SHARED_STRINGS.paginationFooter.refreshing(noun)
        ) : (
          <>
            {CRM_SHARED_STRINGS.paginationFooter.showingFrom}
            <span className="font-medium text-foreground">{rangeStart}</span>
            {CRM_SHARED_STRINGS.paginationFooter.showingTo}
            <span className="font-medium text-foreground">{rangeEnd}</span>
            {CRM_SHARED_STRINGS.paginationFooter.showingOf}
            <span className="font-medium text-foreground">{total}</span>
          </>
        )}
      </div>
      {totalPages > 1 && (
        <Pagination className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page === 1}
                className={cn(page === 1 && "pointer-events-none opacity-50")}
                onClick={handle(page - 1)}
              />
            </PaginationItem>
            {visiblePages.map((p, idx) =>
              p === ELLIPSIS ? (
                <PaginationItem key={`gap-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink href="#" isActive={p === page} onClick={handle(p)}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page === totalPages}
                className={cn(page === totalPages && "pointer-events-none opacity-50")}
                onClick={handle(page + 1)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
