import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Settings2 } from "lucide-react";

import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { lastRecentLocation } from "@shared/hooks/useRecentLocations";
import { usePermission } from "@shared/rbac";
// Through CRM's public index (§7), never a deep path. The agreement page IS
// the sales order's page — same sections, same tabs — so it renders CRM's
// layout rather than keeping a second, thinner copy of it.
import { SO_STATUS_LABELS, SO_STATUS_VARIANT, SalesOrderDetailView } from "@modules/crm";

import type { RentalAgreement } from "../../api/agreements";
import type { RentalSalesOrderBillingDetail } from "../../api/sales-orders";
import { RENTAL_STATUS_LABELS, RENTAL_STATUS_VARIANT } from "../../constants/billing";
import { useRentalAgreementDetail } from "../../hooks/agreements/useRentalAgreementDetail";
import { describeCadence, formatRentalDay } from "../../lib/format";
import { rentalsCan } from "../../permissions";
import { PendingTerminationBanner } from "../approvals/PendingTerminationBanner";
import { PoOverdueBanner } from "../purchase-orders/PoOverdueBanner";
import { useOrderPurchaseOrderDocuments } from "../../hooks/purchase-orders/usePurchaseOrders";
import { PurchaseOrdersCard } from "../purchase-orders/PurchaseOrdersCard";
import { toPurchaseOrderAttachmentGroups } from "../purchase-orders/purchase-order-attachment-groups";
import { PURCHASE_ORDER_STRINGS } from "../purchase-orders/purchase-orders.strings";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { AGREEMENTS_LIST_HREF } from "./agreement-detail-helpers";
import { AgreementSignaturesCard } from "./AgreementSignaturesCard";
import { RentalAgreementDetailFallback } from "./RentalAgreementDetailFallback";
import { RentalAgreementUnconfigured } from "./RentalAgreementUnconfigured";
import { RentalLineCadenceCard } from "./RentalLineCadenceCard";
import { RentalSalesOrderActions } from "./RentalSalesOrderActions";

const A = S.agreement;

/** This page's own record routes, in either prefix, plus CRM's order routes:
 *  Back must land on whatever the reader came FROM (the agreements list at
 *  page 3, the CRM order, an account tab …), never on another copy of this
 *  record. The SO layout's default handler skips only the CRM routes, so on
 *  this URL it would pick the current page and go nowhere. */
const OWN_RECORD_ROUTE = /^\/(rentals\/(agreements|sales-orders)|crm\/sales-orders)\/./;

/** One rental agreement, laid out exactly as its sales order is. Keyed on
 *  the SALES ORDER id (`null` = a malformed route id → not-found, no fetch).
 *
 *  Renders CRM's `SalesOrderDetailView` — header, account and address
 *  sections, attachments, the Billings and Invoices cards, line items and
 *  history — so an agreement and its order can never read as different
 *  documents. What changes is what belongs to the AGREEMENT:
 *
 *  - the header carries the agreement's status and the rental Actions menu
 *    (approve, reject, amend, extend, hold, terminate …) instead of CRM's
 *    Edit / Submit / Amend, which change the order, not the contract;
 *  - a lapsed PO and a rejected version lead, above the stage strip;
 *  - three tabs are added: the per-line billing cycles, the customer POs
 *    and the signatures on this version. Units are reached from each line
 *    item's name, which opens Device Tracking scoped to that line.
 *
 *  Every action is shown only to a user holding the code its endpoint
 *  requires — the menu filters itself, and each card gates its own
 *  buttons — so nothing here re-checks permissions per action.
 */
export function RentalAgreementDetailBody({ salesOrderId }: { salesOrderId: string | null }) {
  const navigate = useNavigate();
  const { billing, order } = useRentalAgreementDetail(salesOrderId);
  // Each PO's paper is filed against its PO row, so the order's own
  // attachment list never has it — added to the Attachments section here.
  const poDocuments = useOrderPurchaseOrderDocuments(salesOrderId);
  const detail = billing.data;
  // Step BACK to the origin page when it is behind us in history (a push
  // would leave this page behind it); with nothing on record (reload, deep
  // link) go to the list.
  const goBack = () => {
    const target = lastRecentLocation((p) => OWN_RECORD_ROUTE.test(p));
    if (target?.delta != null) return navigate(target.delta);
    navigate(target?.url ?? AGREEMENTS_LIST_HREF);
  };
  if (!salesOrderId) return <RentalAgreementDetailFallback query={null} />;
  if (!detail) return <RentalAgreementDetailFallback query={billing} />;
  // Predates the seeded agreement row, or isn't configurable yet.
  if (!detail.config) return <RentalAgreementUnconfigured salesOrderId={salesOrderId} detail={detail} />;

  const config = detail.config;
  const display = detail.display_status ?? config.status;
  const soStatus = order?.status;

  return (
    <SalesOrderDetailView
      soId={salesOrderId}
      showRentalBilling
      extraAttachmentGroups={toPurchaseOrderAttachmentGroups(poDocuments.data ?? [])}
      header={{
        backHref: AGREEMENTS_LIST_HREF,
        onBack: goBack,
        status: {
          label: RENTAL_STATUS_LABELS[display] ?? display,
          variant: RENTAL_STATUS_VARIANT[display] ?? "neutral",
        },
        // The order's own status rides along as a chip, since the status
        // pill now reads the agreement's. Value only, in the status's own
        // colour — the same badge the agreements list uses.
        extraBadges: soStatus ? (
          <StatusBadge variant={SO_STATUS_VARIANT[soStatus] ?? "neutral"}>
            {SO_STATUS_LABELS[soStatus] ?? soStatus}
          </StatusBadge>
        ) : undefined,
        actions: (
          <RentalSalesOrderActions
            salesOrderId={salesOrderId}
            sellableType="rental_sales"
            variant="header"
            orderNumber={order?.order_number}
          />
        ),
      }}
      banner={
        <>
          {/* Above everything: a lapsed PO means the order stopped billing. */}
          <PendingTerminationBanner salesOrderId={salesOrderId} />
          <PoOverdueBanner salesOrderId={salesOrderId} />
          <RejectedBanner salesOrderId={salesOrderId} detail={detail} config={config} />
          {/* No stage strip here: the Billings card, first below, has it. */}
        </>
      }
      extraTabs={[
        {
          id: "lines",
          label: A.tabs.lines,
          count: (detail.line_cadences ?? []).length,
          content: (
            <RentalLineCadenceCard
              agreementId={config.id}
              salesOrderId={salesOrderId}
              lines={detail.line_cadences ?? []}
              // The ORDER's cycle in the line rows' own words.
              orderCadenceLabel={describeCadence(config.billing_type, config.billing_mode, config.custom_days)}
              orderStartDate={config.start_date}
              orderEndDate={config.end_date}
            />
          ),
        },
        {
          id: "purchase-orders",
          label: PURCHASE_ORDER_STRINGS.tab,
          content: <PurchaseOrdersCard salesOrderId={salesOrderId} />,
        },
        {
          id: "signatures",
          label: A.tabs.signatures,
          content: <AgreementSignaturesCard agreementId={config.id} accountId={config.account_id} />,
        },
      ]}
    />
  );
}

/** A rejected version is back in `Draft` with the reason on it. Shown
 *  first, because it is the one thing the next person has to act on. */
function RejectedBanner({
  salesOrderId,
  detail,
  config,
}: {
  salesOrderId: string;
  detail: RentalSalesOrderBillingDetail;
  config: RentalAgreement;
}) {
  const mayConfigure = usePermission().canAny(rentalsCan.configure);
  if (config.status !== "Draft" || !config.rejection_reason) return null;
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive-soft px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <AlertCircle className="size-4 shrink-0 text-destructive" />
        <Typography variant="card-title" tone="danger" className="min-w-0 flex-1">
          {A.rejected.title}
        </Typography>
        {mayConfigure && detail.can_configure ? (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            render={<Link to={`/rentals/agreements/${salesOrderId}/configure?from=rentals`} />}
          >
            <Settings2 className="size-4" />
            {A.rejected.reconfigure}
          </Button>
        ) : null}
      </div>
      <Typography variant="body" className="mt-1.5 whitespace-pre-wrap break-words pl-6">
        {config.rejection_reason}
      </Typography>
      {config.rejected_at ? (
        <Typography variant="helper" tone="muted" className="mt-1 pl-6">
          {`${A.rejected.on} ${formatRentalDay(config.rejected_at.slice(0, 10))}`}
        </Typography>
      ) : null}
    </div>
  );
}
