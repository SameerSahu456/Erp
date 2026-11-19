import { Boxes } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Typography } from "@/components/ui/typography"
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { EmptyState } from "@/components/common/feedback/EmptyState"
import { TablePagination } from "@/components/common/tables/TablePagination"

import type { ReplacementRequestDetailState } from "../../hooks/replacement-requests/useReplacementRequestDetail"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"
import { ITEMS_PAGE_SIZE } from "./replacement-request-detail-helpers"
import { ReplacementGroupRows } from "./ReplacementGroupRows"

/** Units table, one row per unit, grouped for bulk approval; rows expand for detail. */
export function ReplacementUnitsCard({
  state,
}: {
  state: ReplacementRequestDetailState
}) {
  const { rr, groups, pagedGroups, showPager, safePage, totalPages, setPage, selection, setDialog } =
    state
  const count = rr?.items?.length ?? 0
  const pickedCount = selection.selected.length
  const bulkBusy = selection.approvePending || selection.rejecting
  const showSelection = (rr?.items ?? []).some(state.canDecide)
  return (
    <Card>
      {/* Title left, unit count pinned right (Dispatch / Sales Return). */}
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Boxes className="size-4 text-primary" />
          {S.detail.lines.title}
        </CardTitle>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {pickedCount > 0 && (
            <>
              <Typography variant="caption" tone="muted">
                {S.detail.lines.selectedCount(pickedCount)}
              </Typography>
              <ConfirmDialog
                title={S.detail.dialogs.approveGroupTitle}
                description={S.detail.dialogs.approveGroupBody(pickedCount)}
                confirmLabel={S.detail.dialogs.approveGroupConfirm(pickedCount)}
                onConfirm={selection.approveSelected}
                trigger={
                  <Button size="sm" disabled={bulkBusy}>
                    {S.detail.actions.approveSelected}
                  </Button>
                }
              />
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => setDialog({ kind: "rejectSelected" })}
              >
                {S.detail.actions.rejectSelected}
              </Button>
            </>
          )}
          {count > 0 && (
            <StatusBadge variant="neutral">{S.detail.lines.count(count)}</StatusBadge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.length === 0 ? (
          // An empty section gets a "nothing yet" message, never a blank
          // card (§2).
          <EmptyState title={S.detail.lines.empty} className="py-8" />
        ) : (
          // Wide table pans inside its own bordered box (§0.10) — the page
          // body never scrolls sideways.
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  {/* Dropped once this viewer has nothing left to decide. */}
                  {showSelection && (
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={selection.allOnPageSelected}
                        onCheckedChange={selection.toggleAllOnPage}
                        aria-label={S.detail.lines.selectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-12 pl-4 text-right">
                    {S.detail.lines.columns.srNo}
                  </TableHead>
                  <TableHead className="w-8 px-2" />
                  <TableHead>{S.detail.lines.columns.item}</TableHead>
                  <TableHead>{S.detail.lines.columns.serial}</TableHead>
                  <TableHead>{S.detail.lines.columns.generation}</TableHead>
                  <TableHead>{S.detail.lines.columns.decision}</TableHead>
                  <TableHead>{S.detail.lines.columns.status}</TableHead>
                  <TableHead>{S.detail.lines.columns.substitute}</TableHead>
                  <TableHead className="w-12 text-right">
                    {S.detail.lines.columns.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedGroups.map(([key, items]) => (
                  <ReplacementGroupRows
                    key={key}
                    items={items}
                    state={state}
                    showSelection={showSelection}
                  />
                ))}
              </TableBody>
            </Table>

            {showPager && (
              <TablePagination
                page={safePage}
                totalPages={totalPages}
                pageSize={ITEMS_PAGE_SIZE}
                total={groups.length}
                onPageChange={setPage}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
