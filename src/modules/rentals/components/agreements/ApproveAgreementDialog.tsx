import { AlertTriangle, Loader2 } from "lucide-react";

import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";
import { formatINR } from "@/lib/currency";
import { ApiError } from "@/shared/api/envelope";

import { useAgreementSignatureChecklist } from "../../hooks/agreements/useAgreementSignatureChecklist";
import {
  useApproveAgreement,
  useRentalSalesOrderBilling,
} from "../../hooks/agreements/useAgreement";
import { AgreementSignatureChecklist } from "./AgreementSignatureChecklist";
import { AGREEMENT_APPROVAL_STRINGS as P } from "./agreement-approval.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";

export interface ApproveAgreementDialogProps {
  salesOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

/**
 * Confirm putting a rental agreement in force.
 *
 * A dialog rather than a one-click action because this is the AUTHORITY TO
 * SHIP: WMS refuses to create a dispatch request for an agreement that is
 * not `Active`, so approving is what unblocks the warehouse. The copy says
 * that explicitly — an operator who reads "Approve" alone has no way to
 * know a shipment becomes possible.
 *
 * No form. The backend derives everything (who approved, when) from the
 * token and the clock. Whether the signed document is required depends on
 * the `require_signed_document_for_active` setting: when it is on, the
 * dialog lists what is still missing and keeps Approve disabled until the
 * paperwork is in — the same rule the endpoint refuses with.
 */
const A = S.actions.approve;

export function ApproveAgreementDialog({
  salesOrderId,
  open,
  onOpenChange,
  onDone,
}: ApproveAgreementDialogProps) {
  const approve = useApproveAgreement();
  const billing = useRentalSalesOrderBilling(salesOrderId, { enabled: open });
  const checklist = useAgreementSignatureChecklist(billing.data?.config?.id, { enabled: open });
  // The rent the sales order was sold at. 0 means the lines carry no rate —
  // the backend refuses with AGREEMENT_RATE_MISSING, so say it up front.
  const expectedRate = Number(billing.data?.expected_monthly_rate ?? 0);
  const rateMissing = billing.data !== undefined && expectedRate <= 0;
  const paperworkMissing = checklist.required && !checklist.complete;
  const blocked = checklist.isLoading || paperworkMissing || rateMissing;
  const errorMessage = approveErrorMessage(approve.error);

  function submit() {
    approve.mutate(
      { id: salesOrderId },
      { onSuccess: () => onDone() },
    );
  }

  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={A.title}
      description={A.description}
      className="sm:max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={approve.isPending}>
            {C.cancel}
          </Button>
          <ApproveButton
            pending={approve.isPending}
            disabled={approve.isPending || blocked}
            hint={paperworkMissing ? P.dialog.incomplete : null}
            onClick={submit}
          />
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-md border border-warning/30 bg-warning-soft p-3">
          <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
          <Typography variant="helper" tone="muted">
            {checklist.required ? P.dialog.warningRequired : P.dialog.warningOptional}
          </Typography>
        </div>

        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <Typography variant="helper" tone="muted">
            {S.expectedRate.approveLabel}
          </Typography>
          <Typography variant="body-strong" numeric>
            {formatINR(expectedRate)}
          </Typography>
        </div>
        {rateMissing ? (
          <Typography variant="helper" tone="danger" role="alert">
            {S.expectedRate.approveZero}
          </Typography>
        ) : null}

        <PaperworkSection checklist={checklist} />

        {errorMessage ? (
          <Typography variant="helper" tone="danger" role="alert">
            {errorMessage}
          </Typography>
        ) : null}
      </div>
    </OperationDialog>
  );
}

/** Approve, with the reason it is disabled on hover (a disabled button
 *  swallows its own tooltip, so the trigger is a span). */
function ApproveButton({
  pending,
  disabled,
  hint,
  onClick,
}: {
  pending: boolean;
  disabled: boolean;
  hint: string | null;
  onClick: () => void;
}) {
  const button = (
    <Button onClick={onClick} disabled={disabled}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending ? A.submitting : C.approve}
    </Button>
  );
  if (!hint) return button;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>{button}</TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

/** The approve endpoint's refusal, with the paperwork codes reworded. */
function approveErrorMessage(error: Error | null): string | null {
  if (!error) return null;
  if (error instanceof ApiError) return P.errors[error.businessCode] ?? error.message;
  return error.message;
}

/** The signed-document checklist — shown only while the setting requires it. */
function PaperworkSection({
  checklist,
}: {
  checklist: ReturnType<typeof useAgreementSignatureChecklist>;
}) {
  if (checklist.isLoading) {
    return (
      <Typography variant="helper" tone="muted">
        {P.dialog.checking}
      </Typography>
    );
  }
  if (!checklist.required) return null;
  return (
    <div className="space-y-2">
      <AgreementSignatureChecklist items={checklist.items} />
      {!checklist.complete ? (
        <Typography variant="helper" tone="warning">
          {P.dialog.incomplete}
        </Typography>
      ) : null}
    </div>
  );
}

export default ApproveAgreementDialog;
