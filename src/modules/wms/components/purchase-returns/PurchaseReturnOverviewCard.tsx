import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { EntityRef } from "@/components/common/display/EntityRef";
import { ExpandableClampText } from "@/components/common/display/ExpandableClampText";
import { formatIST_date } from "@shared/lib/date";
import { formatINRCompact } from "@/lib/currency";

import type { PurchaseReturn } from "../../api";
import { DetailFact } from "../shared/section-primitives";
import { PURCHASE_RETURN_DETAIL_STRINGS as S } from "./purchase-returns.strings";

// Detail/record page — show the full ₹ amount with paise (§0.12), not the
// decimals-dropped KPI form.
const money = (v: string | number) => formatINRCompact(Number(v), { decimals: true });

const NOTES_LINES = 3;

interface Props {
  purchaseReturn: PurchaseReturn;
  vendorName: string;
  poNumber: string;
  creatorName: string;
  counts: { total: number; replace: number; refund: number };
  undecidedCount: number;
  potentialCredit: number;
}

/** Overview facts, return address and notes for a Purchase Return. */
export function PurchaseReturnOverviewCard(p: Props) {
  const { purchaseReturn: pr } = p;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{S.sections.overview}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <DetailFact label={S.meta.vendor} value={p.vendorName} />
          {/* Opens the PO; without PO access a click says so instead. */}
          <DetailFact
            label={S.meta.purchaseOrder}
            value={
              p.poNumber ? (
                <EntityRef
                  kind="purchase_order"
                  id={pr.purchase_order_id}
                  value={p.poNumber}
                  noAccessMessage={S.meta.poNoAccess}
                />
              ) : null
            }
          />
          <DetailFact label={S.meta.raisedBy} value={p.creatorName} />
          <DetailFact label={S.meta.raisedOn} value={formatIST_date(pr.created_at)} />
          <DetailFact label={S.stats.units} value={p.counts.total} />
          {/* Replaced vs refunded as distinct facts — clearer than one line. */}
          <DetailFact label={S.stats.replaced} value={p.counts.replace} />
          <DetailFact label={S.stats.refunded} value={p.counts.refund} />
          <DetailFact label={S.stats.awaiting} value={p.undecidedCount} />
          <DetailFact label={S.stats.creditValue} value={money(p.potentialCredit)} />
          <DetailFact label={S.stats.creditPending} value={money(pr.credit_pending)} />
        </div>
        {/* No return address here: each consignment records its own, shown in
            the Consignments table. */}
        {pr.notes ? (
          <div className="min-w-0 space-y-1 border-t pt-4">
            <Typography variant="helper" tone="muted">
              {S.meta.notes}
            </Typography>
            <ExpandableClampText text={pr.notes} lines={NOTES_LINES} variant="body" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
