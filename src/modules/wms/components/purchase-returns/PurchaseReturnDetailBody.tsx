import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton";
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState";
import { NoAccess } from "@/shared/components/feedback/NoAccess";
import { DetailPageShell } from "@/components/page-shells";
import { isForbidden } from "@shared/api/envelope";
import { useRecordLabel, recordNotFoundTitle } from "@shared/routing/record-label";

import { usePurchaseReturnDetail } from "../../hooks/purchase-returns/usePurchaseReturnDetail";
import { WMS_ACCESS_STRINGS } from "../access/access.strings";
import { DispatchDialog } from "./DispatchDialog";
import { PurchaseReturnConsignments } from "./PurchaseReturnConsignments";
import { SettlementDialog } from "./SettlementDialog";
import { PurchaseReturnItemsTable } from "./PurchaseReturnItemsTable";
import { PurchaseReturnOverviewCard } from "./PurchaseReturnOverviewCard";
import { PurchaseReturnDispatchAction } from "./PurchaseReturnDispatchAction";
import { isDispatchableStatus } from "./purchase-return-detail-helpers";
import {
  PURCHASE_RETURN_DETAIL_STRINGS as S,
  PURCHASE_RETURN_STATUS_VARIANT,
  getPurchaseReturnStatusLabel,
} from "./purchase-returns.strings";

const LIST_PATH = "/wms/purchase-returns";
const noop = () => {};

function StateShell({ children }: { children: ReactNode }) {
  return (
    <DetailPageShell title={S.title} backHref={LIST_PATH}>
      {children}
    </DetailPageShell>
  );
}

export function PurchaseReturnDetailBody() {
  const label = useRecordLabel();
  const d = usePurchaseReturnDetail();
  const { query, purchaseReturn: pr } = d;

  // §0.6 — a skeleton, not a bare "Loading…" line.
  if (query.isLoading) {
    return (
      <StateShell>
        <FormCardSkeleton />
      </StateShell>
    );
  }
  // A 403 is a permission boundary (not on this return's warehouse team) —
  // a no-access state instead of a generic load error (§2).
  if (isForbidden(query.error)) {
    return (
      <StateShell>
        <NoAccess
          title={WMS_ACCESS_STRINGS.purchaseReturnForbiddenTitle}
          description={WMS_ACCESS_STRINGS.purchaseReturnForbidden}
        />
      </StateShell>
    );
  }
  if (query.isError) {
    return (
      <StateShell>
        <LoadErrorState error={query.error} fallback={S.error} />
      </StateShell>
    );
  }
  if (!pr) {
    return (
      <StateShell>
        <EmptyState title={recordNotFoundTitle(label, S.notFoundTitle)} description={S.notFoundDescription} />
      </StateShell>
    );
  }

  // A return keeps its Dispatch button until everything has physically left:
  // `partially_dispatched` still has units on the dock.
  const showDispatch = d.canWrite && isDispatchableStatus(pr.status);

  return (
    <DetailPageShell
      title={pr.pret_number}
      subtitle={d.vendorName}
      backHref={LIST_PATH}
      status={{
        // Display-only: a decided-but-unshipped `raised` return reads "Pending
        // Dispatch"; the badge variant stays `raised`'s.
        label: getPurchaseReturnStatusLabel(pr.status, d.undecidedCount),
        variant: PURCHASE_RETURN_STATUS_VARIANT[pr.status],
      }}
      actions={
        showDispatch ? (
          <PurchaseReturnDispatchAction
            disabledReason={d.dispatchDisabledReason}
            pending={d.dispatchPending}
            onOpen={() => d.setDispatchOpen(true)}
          />
        ) : undefined
      }
    >
      <div className="space-y-6">
        <PurchaseReturnOverviewCard
          purchaseReturn={pr}
          vendorName={d.vendorName}
          poNumber={d.poNumber}
          creatorName={d.creatorName}
          counts={d.counts}
          undecidedCount={d.undecidedCount}
          potentialCredit={d.potentialCredit}
        />

        {/* One role-aware table: settlers get inline decision + settlement
            controls; everyone else sees the same rows read-only. */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle>{S.units.title}</CardTitle>
            {d.undecidedCount > 0 && <StatusBadge variant="warning">{S.units.awaiting(d.undecidedCount)}</StatusBadge>}
          </CardHeader>
          <CardContent>
            <PurchaseReturnItemsTable
              purchaseReturn={pr}
              canSettle={d.canSettle}
              canWrite={d.canWrite}
              onSettle={d.setSettlementTarget}
              onWaive={d.setWaiveTarget}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{S.sections.consignments}</CardTitle>
          </CardHeader>
          <CardContent>
            <PurchaseReturnConsignments returnId={pr.id} />
          </CardContent>
        </Card>
      </div>

      <DispatchDialog
        // Remount on every open so each consignment starts from a blank challan
        // seeded with the units still on the dock.
        key={d.dispatchOpen ? "dispatch-open" : "dispatch-closed"}
        open={d.dispatchOpen}
        onOpenChange={d.setDispatchOpen}
        initialReturnAddress={null}
        shippableUnits={d.shippableUnits}
        isPending={d.dispatchPending}
        onConfirm={d.confirmDispatch}
      />

      <SettlementDialog
        // A fresh dialog per item — its internal mode/notes only reset on its
        // own onOpenChange, which never fires on a programmatic close.
        key={d.settlementTarget?.id}
        open={d.settlementTarget != null}
        onOpenChange={(open) => !open && d.setSettlementTarget(null)}
        action="settle"
        isPending={d.settlePending}
        onSettle={d.confirmSettle}
        onWaive={noop}
      />

      <SettlementDialog
        // Same fresh-dialog-per-item remount as the settle dialog.
        key={d.waiveTarget?.id}
        open={d.waiveTarget != null}
        onOpenChange={(open) => !open && d.setWaiveTarget(null)}
        action="waive"
        isPending={d.waivePending}
        onSettle={noop}
        onWaive={d.confirmWaive}
      />
    </DetailPageShell>
  );
}
