import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { FormPageShell } from "@/components/page-shells";
import { Typography } from "@/components/ui/typography";
import { asUuid } from "@shared/lib/validation";

import type { RentalSalesOrderBillingDetail } from "../../api/sales-orders";
import { useRentalAgreementConfigure } from "../../hooks/agreements/useRentalAgreementConfigure";
import { useRentalAgreementForm } from "../../hooks/agreements/useRentalAgreementForm";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { AmendReasonCard } from "./AmendReasonCard";
import { cadenceSummary, configureBackHref } from "./agreement-configure-helpers";
import { ConfigureInvoicingCard, ConfigureScheduleCard } from "./ConfigureCadenceCards";
import { ConfigureGate } from "./ConfigureGate";
import { ConfigureOrderFactsCard, type ConfigureOrderFacts } from "./ConfigureOrderFactsCard";
import { ConfigurePoCard } from "./ConfigurePoCard";
import { VersionHistoryCard } from "./VersionHistoryCard";

const C = S.configure;

/** Set how one rental sales order bills. A full page because the answer
 *  depends on the order's own figures; the account and dates are fixed here
 *  (§10.1). `?from=rentals` says which list to return to. */
export function RentalAgreementConfigureBody() {
  const salesOrderId = asUuid(useParams<{ salesOrderId: string }>().salesOrderId);
  const [searchParams] = useSearchParams();
  const backHref = configureBackHref(searchParams.get("from"), salesOrderId);
  const { billing, orderNumber, accountId, accountName, orderCreatedAt } = useRentalAgreementConfigure(salesOrderId);
  const detail = billing.data;

  if (!salesOrderId || !detail?.can_configure) {
    return <ConfigureGate query={salesOrderId ? billing : null} orderNumber={orderNumber} backHref={backHref} />;
  }
  return (
    <RentalAgreementForm
      // Re-seeded if the version changes beneath the page (an amend elsewhere).
      key={detail.config?.id ?? "unconfigured"}
      detail={detail}
      accountId={accountId}
      backHref={backHref}
      facts={{ salesOrderId, orderNumber, accountName, orderCreatedAt }}
    />
  );
}

interface RentalAgreementFormProps {
  detail: RentalSalesOrderBillingDetail;
  accountId: string | null;
  backHref: string;
  facts: ConfigureOrderFacts;
}

function RentalAgreementForm({ detail, accountId, backHref, facts }: RentalAgreementFormProps) {
  const navigate = useNavigate();
  const form = useRentalAgreementForm({ salesOrderId: facts.salesOrderId, detail, accountId, backHref });
  const fields = { value: form.draft, onChange: form.update, disabled: form.saving };

  return (
    <FormPageShell
      title={form.isAmend ? C.amendTitle : C.configureTitle}
      subtitle={form.isAmend ? C.amendDescription : C.configureDescription}
      backHref={backHref}
      saveLabel={form.isAmend ? C.saveAmend : C.submit}
      onSave={form.save}
      onCancel={() => navigate(backHref)}
      saving={form.saving}
      isDirty={form.isDirty}
      footerLeft={
        <Typography variant="helper" tone={form.error ? "danger" : "muted"}>
          {form.error ?? cadenceSummary(form.draft)}
        </Typography>
      }
    >
      <div className="space-y-6">
        <ConfigureOrderFactsCard facts={facts} detail={detail} />
        <ConfigureScheduleCard {...fields} period={form.rentalPeriod} />
        <ConfigureInvoicingCard {...fields} poRequiredLocked={form.po.locked} />
        {form.po.needed && (
          <ConfigurePoCard
            paper={form.po.paper}
            onPaperChange={form.po.setPaper}
            period={form.po.period}
            onPeriodChange={form.po.setPeriod}
            orderEnd={form.orderEnd}
            disabled={form.saving}
          />
        )}
        {form.po.deferred && (
          <Typography variant="helper" tone="muted">
            {S.configure.poDeferred}
          </Typography>
        )}
        {form.isAmend && <AmendReasonCard value={form.reason} onChange={form.setReason} disabled={form.saving} />}
        {/* Only with something to compare — one version is the terms above. */}
        {form.isAmend && form.versions.length > 1 && <VersionHistoryCard versions={form.versions} />}
      </div>
    </FormPageShell>
  );
}
