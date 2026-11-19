import { useParams } from "react-router-dom";

import { DetailPageShell } from "@/components/page-shells";
import { usePermission } from "@shared/rbac";
import { asUuid } from "@shared/lib/validation";
import { useRecordLabel } from "@shared/routing/record-label";
import { wmsPermissions } from "../../permissions";
import {
  useDispatchLineItems,
  useDispatchRequest,
} from "../../hooks/dispatches/useDispatchRequest";
import { useDispatchFinalise } from "../../hooks/dispatches/useDispatchFinalise";
import { useDispatchLogisticsEdit } from "../../hooks/dispatches/useDispatchLogisticsEdit";
import { useDispatchCancel } from "../../hooks/dispatches/useDispatchCancel";
import {
  dispatchHeaderMeta,
  isDetailUnavailable,
  splitCancellationNotes,
  type DispatchDetailMeta,
} from "./dispatch-detail-helpers";
import { DispatchDetailFallback } from "./DispatchDetailFallback";
import { DispatchCancellationCallout, DispatchOverviewCard } from "./DispatchOverviewCard";
import { DispatchLogisticsCard } from "./DispatchLogisticsCard";
import { DispatchLogisticsDialog } from "./DispatchLogisticsDialog";
import { DispatchCancelDialog } from "./DispatchCancelDialog";
import { DispatchFitterDialog } from "./DispatchFitterDialog";
import { DispatchUnitsCard } from "./DispatchUnitsCard";
import { DispatchDocumentsCard, DispatchHeaderActions } from "./DispatchDetailActions";
export function DispatchDetailBody() {
  // §11.1 — the route `:id` is untrusted. Validate it so a malformed id becomes
  // "" → every dispatch query/mutation below stays disabled and the not-found
  // guard renders, rather than the backend returning a 422 for a non-UUID.
  const { id: rawId = "" } = useParams();
  const id = asUuid(rawId) ?? "";
  const label = useRecordLabel();
  const drQ = useDispatchRequest(id);
  const linesQ = useDispatchLineItems(id);

  // The outward route admits the OR-bundle [OUTWARD_READ, OUTWARD_MANAGE], so a
  // view-only OUTWARD_READ user reaches this page. Gate every mutating action on
  // OUTWARD_MANAGE — status alone must not surface Finalise / Recall / Edit to a
  // read-only user (§0.9). Backend still enforces; this hides what they can't do.
  const canManage = usePermission().can(wmsPermissions.OUTWARD_MANAGE);

  const dr = drQ.data;
  const meta = (dr?.metadata ?? {}) as DispatchDetailMeta;
  const edit = useDispatchLogisticsEdit(id, meta, !!dr && dr.status !== "draft");
  const cancel = useDispatchCancel(id);
  const finalise = useDispatchFinalise(id, meta.delivery_details ?? {}, linesQ.data);

  if (isDetailUnavailable(drQ) || !dr) {
    return <DispatchDetailFallback query={drQ} recordLabel={label} />;
  }

  const isDraft = dr.status === "draft";
  const { cancellationReason, displayNotes } = splitCancellationNotes(dr.status, dr.notes);
  const header = dispatchHeaderMeta(dr);

  return (
    <DetailPageShell
      title={dr.dispatch_number}
      subtitle={header.subtitle}
      backHref="/wms/dispatches"
      status={header.status}
      actions={
        <DispatchHeaderActions
          status={dr.status}
          canManage={canManage}
          finalising={finalise.isPending}
          onFinalise={() => void finalise.finalise()}
          cancel={cancel}
        />
      }
    >
      <div className="space-y-6">
        {cancellationReason && <DispatchCancellationCallout reason={cancellationReason} />}
        <DispatchOverviewCard dr={dr} displayNotes={displayNotes} />
        {/* A cancelled dispatch is terminal / read-only — no Edit Logistics
            (mirrors the Documents section's status gate below). Also hidden
            for a view-only user (§0.9). */}
        <DispatchLogisticsCard
          delivery={meta.delivery_details ?? {}}
          savedInvoice={meta.billing_details?.invoice_amount}
          onEdit={dr.status !== "cancelled" && canManage ? edit.openEdit : null}
        />
        <DispatchDocumentsCard dispatchId={id} isDraft={isDraft} />
        <DispatchUnitsCard query={linesQ} isDraft={isDraft} />
      </div>

      {/* Logistics stays editable after dispatch: couriers and freight are often
          corrected once the box has shipped. Only a cancelled DR locks. */}
      <DispatchLogisticsDialog
        edit={edit}
        lockInvoice={dr.status === "cancelled"}
      />
      <DispatchCancelDialog
        cancel={cancel}
        isVendorReturn={dr.dispatch_type === "purchase_return_dispatch"}
      />
      <DispatchFitterDialog finalise={finalise} />
    </DetailPageShell>
  );
}
