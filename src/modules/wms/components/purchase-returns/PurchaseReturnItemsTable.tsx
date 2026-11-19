import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { PurchaseReturn, PurchaseReturnItem } from "../../api";
import { usePurchaseReturnItemsTable } from "../../hooks/purchase-returns/usePurchaseReturnItemsTable";
import { PURCHASE_RETURN_DETAIL_STRINGS as S } from "./purchase-returns.strings";
import { PurchaseReturnItemsDialogs } from "./PurchaseReturnItemsDialogs";
import { PurchaseReturnItemRow } from "./PurchaseReturnItemRow";
import { PurchaseReturnItemsNoMatchRow } from "./PurchaseReturnItemsNoMatchRow";
import {
  PurchaseReturnItemsBulkBar,
  PurchaseReturnItemsFilterBar,
} from "./PurchaseReturnItemsToolbar";

interface Props {
  purchaseReturn: PurchaseReturn;
  /** Procurement/admin (`po_return_settle`) — inline decision + settlement
   *  controls are shown. Everyone else sees the same rows read-only. */
  canSettle: boolean;
  /** Warehouse raiser (`po_return_write`) — may REMOVE a mistakenly-added unit
   *  from a still-raised, still-undecided return (their own raise's per-row fix,
   *  distinct from procurement's reject). */
  canWrite: boolean;
  onSettle: (item: PurchaseReturnItem) => void;
  onWaive: (item: PurchaseReturnItem) => void;
}

export function PurchaseReturnItemsTable({
  purchaseReturn,
  canSettle,
  canWrite,
  onSettle,
  onWaive,
}: Props) {
  const t = usePurchaseReturnItemsTable({ purchaseReturn, canSettle, canWrite });

  return (
    <>
      {t.showBulkBar && (
        <PurchaseReturnItemsBulkBar
          bulkDisposition={t.bulkDisposition}
          onBulkDispositionChange={t.setBulkDisposition}
          selectedUndecidedCount={t.selectedUndecided.length}
          isRaised={t.isRaised}
          applyBlockReason={t.applyBlockReason}
          rejectBlockReason={t.rejectBlockReason}
          onApplyClick={() => t.setBulkApplyOpen(true)}
          onRejectClick={() => t.setBulkRejectOpen(true)}
        />
      )}

      {/* Line-item search + status filter. */}
      <PurchaseReturnItemsFilterBar
        itemSearch={t.itemSearch}
        onItemSearchChange={t.setItemSearch}
        dispositionFilter={t.dispositionFilter}
        onDispositionFilterChange={t.setDispositionFilter}
        visibleCount={t.visibleItems.length}
        totalCount={t.items.length}
      />

      {/* Inner-scroll past ~10 rows so a large return doesn't grow the page (§7.7).
          `[&>div]:overflow-visible` neutralises the shared Table's own
          overflow-x wrapper so THIS div is the sole scroll context — that lets
          the sticky header pin to it on vertical scroll. */}
      <div className="max-h-96 overflow-auto [&>div]:overflow-visible">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card [&_th]:bg-card">
            <TableRow>
              {t.columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.key === "select"
                    ? t.selectableVisible.length > 0 && (
                        <Checkbox
                          checked={t.allVisibleSelected}
                          onCheckedChange={t.toggleAllVisible}
                          aria-label={S.units.selectAllAria}
                        />
                      )
                    : col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {t.visibleItems.length === 0 ? (
              <PurchaseReturnItemsNoMatchRow
                colSpan={t.columns.length}
                itemSearch={t.itemSearch}
                dispositionFilter={t.dispositionFilter}
                onClearSearch={() => t.setItemSearch("")}
                onClearFilter={() => t.setDispositionFilter("")}
              />
            ) : (
              t.visibleItems.map((item) => (
                <PurchaseReturnItemRow
                  key={item.id}
                  item={item}
                  canSettle={canSettle}
                  canWrite={canWrite}
                  isRaised={t.isRaised}
                  isDispatched={t.isDispatched}
                  showActions={t.showActions}
                  selected={t.selectedIds.includes(item.id)}
                  pending={t.pendingIds.includes(item.id)}
                  error={t.rowErrors[item.id]}
                  onToggle={t.toggleRow}
                  onDecide={(itemId, disposition) => void t.applyOne(itemId, disposition)}
                  onSettle={onSettle}
                  onWaive={onWaive}
                  onReject={t.setRejectTarget}
                  onRemove={t.setRemoveTarget}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PurchaseReturnItemsDialogs t={t} />
    </>
  );
}
