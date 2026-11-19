import { Ban, Info } from "lucide-react";

import { Typography } from "@/components/ui/typography";

import type { LostImpact } from "../../api/lost-impact";
import { CRM_SHARED_STRINGS } from "./crm-shared.strings";

const S = CRM_SHARED_STRINGS.lostReasonDialog;

interface LostImpactNoticeProps {
  impact: LostImpact | undefined;
  isLoading: boolean;
}

// What "Mark as lost" will cancel — or, when an order has already shipped,
// why it is refused (backend 409 LOST_BLOCKED_BY_FULFILMENT).
export function LostImpactNotice({ impact, isLoading }: LostImpactNoticeProps) {
  if (isLoading) {
    return (
      <Typography variant="helper" tone="muted">
        {S.impactLoading}
      </Typography>
    );
  }
  if (!impact) return null;

  const blocking = impact.blocking_sales_orders ?? [];
  if (blocking.length > 0) {
    return (
      <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
        <Ban className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="space-y-1">
          <Typography variant="body-strong" tone="danger">
            {S.impactBlockedHeading}
          </Typography>
          {blocking.map((so) => (
            <Typography key={so.id} variant="body-sm">
              {S.impactSalesOrder(so.number, so.status)}
            </Typography>
          ))}
          <Typography variant="helper" tone="muted">
            {S.impactBlockedHint}
          </Typography>
        </div>
      </div>
    );
  }

  const orders = impact.sales_orders_to_cancel ?? [];
  const demos = impact.demo_requests_to_cancel ?? [];
  return (
    <div className="flex gap-2 rounded-md border border-border bg-muted/40 p-3">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="space-y-1">
        {orders.length + demos.length === 0 ? (
          <Typography variant="body-sm" tone="muted">
            {S.impactNothing}
          </Typography>
        ) : (
          <>
            <Typography variant="body-strong">
              {S.impactCancelHeading}
            </Typography>
            {orders.map((so) => (
              <Typography key={so.id} variant="body-sm">
                {S.impactSalesOrder(so.number, so.status)}
              </Typography>
            ))}
            {demos.map((dr) => (
              <Typography key={dr.id} variant="body-sm">
                {S.impactDemoRequest(dr.number, dr.status)}
              </Typography>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
