import { Boxes, StickyNote } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { DetailTextBlock } from "@/components/common/display/DetailTextBlock"
import { TablePagination } from "@/components/common/tables/TablePagination"
import type { SalesReturnRequestWire } from "@modules/crm"

import {
  ITEMS_PAGE_SIZE,
  type SalesReturnRequestDetailState,
} from "../../hooks/sales-return-requests/useSalesReturnRequestDetail"
import { SalesReturnLineRow } from "./SalesReturnLineRow"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"

type SalesReturnLinesCardProps = Pick<
  SalesReturnRequestDetailState,
  | "items"
  | "visibleItems"
  | "currentItemsPage"
  | "setItemsPage"
  | "totalItemPages"
  | "selectedIds"
  | "canDecide"
  | "decidableItems"
  | "selectedDecidable"
  | "allDecidableSelected"
  | "isCancelled"
  | "isTerminal"
  | "hideSelection"
  | "toggle"
  | "toggleAllDecidable"
  | "approveRow"
  | "rejectRow"
  | "setApproveOpen"
  | "setRejectOpen"
  | "decideMutation"
> & { sret: SalesReturnRequestWire }

/** Units + the PM approval surface. */
export function SalesReturnLinesCard({
  sret,
  items,
  visibleItems,
  currentItemsPage,
  setItemsPage,
  totalItemPages,
  selectedIds,
  canDecide,
  decidableItems,
  selectedDecidable,
  allDecidableSelected,
  isCancelled,
  isTerminal,
  hideSelection,
  toggle,
  toggleAllDecidable,
  approveRow,
  rejectRow,
  setApproveOpen,
  setRejectOpen,
  decideMutation,
}: SalesReturnLinesCardProps) {
  return (
    <Card>
      {/* Title left; count badge pinned right like the Dispatch Units
          header, with the bulk decision buttons just before it. */}
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Boxes className="size-4 text-primary" />
          {S.detail.lines.heading}
        </CardTitle>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {!isTerminal && selectedDecidable.length > 0 && (
            <>
              <Typography variant="caption" tone="muted">
                {S.detail.approval.selected(selectedDecidable.length)}
              </Typography>
              <Button
                size="sm"
                onClick={() => setApproveOpen(true)}
                disabled={decideMutation.isPending}
              >
                {S.detail.approval.approve}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectOpen(true)}
                disabled={decideMutation.isPending}
              >
                {S.detail.approval.reject}
              </Button>
            </>
          )}
          {items.length > 0 && (
            <StatusBadge variant="neutral">
              {S.detail.lines.count(items.length)}
            </StatusBadge>
          )}
        </div>
      </CardHeader>
      {/* Wide table pans inside its own box; the shared Table wraps itself
          in an overflow-x container (§0.10). */}
      <CardContent className="p-0">
        {/* The return's global note sits with the items it applies to
            (per-item notes live in each row's Reason cell). */}
        {sret.notes && (
          <div className="px-4 pb-4">
            <DetailTextBlock
              icon={StickyNote}
              label={S.detail.notes}
              text={sret.notes}
            />
          </div>
        )}
        <div className="w-full max-w-full min-w-0 overflow-x-auto border-t">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                {/* Selection column leads, before Sr No — mirroring the
                    create form. Dropped once no line can be
                    decided. */}
                {!hideSelection && (
                  <TableHead className="w-10 pl-4">
                    {decidableItems.length > 0 && (
                      <Checkbox
                        checked={allDecidableSelected}
                        onCheckedChange={toggleAllDecidable}
                        aria-label={S.detail.lines.selectAllAria}
                      />
                    )}
                  </TableHead>
                )}
                <TableHead
                  className={cn("w-12 text-right", hideSelection && "pl-4")}
                >
                  {S.detail.lines.columns.srNo}
                </TableHead>
                {/* Expand chevron — rejected lines only. */}
                <TableHead className="w-8 px-2" />
                <TableHead>{S.detail.lines.columns.partVariant}</TableHead>
                <TableHead>{S.detail.lines.columns.unit}</TableHead>
                <TableHead>{S.detail.lines.columns.reason}</TableHead>
                <TableHead>{S.detail.lines.columns.productManager}</TableHead>
                <TableHead className="text-right">
                  {S.detail.lines.columns.age}
                </TableHead>
                <TableHead>{S.detail.lines.columns.approval}</TableHead>
                <TableHead>{S.detail.lines.columns.receipt}</TableHead>
                {!isTerminal && (
                  <TableHead className="w-12 pr-4 text-right">
                    {S.detail.lines.columns.actions}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((item, i) => (
                <SalesReturnLineRow
                  key={item.id}
                  item={item}
                  srNo={(currentItemsPage - 1) * ITEMS_PAGE_SIZE + i + 1}
                  headerReason={sret.reason}
                  decidable={canDecide(item)}
                  selected={selectedIds.has(item.id)}
                  hideSelection={hideSelection}
                  isCancelled={isCancelled}
                  isTerminal={isTerminal}
                  decidePending={decideMutation.isPending}
                  onToggle={() => toggle(item.id)}
                  onApprove={() => approveRow(item)}
                  onReject={() => rejectRow(item)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Self-gating: renders just the range line when everything fits
            one page, the full pager once the units run long. */}
        <TablePagination
          page={currentItemsPage}
          totalPages={totalItemPages}
          pageSize={ITEMS_PAGE_SIZE}
          total={items.length}
          onPageChange={setItemsPage}
        />
      </CardContent>
    </Card>
  )
}
