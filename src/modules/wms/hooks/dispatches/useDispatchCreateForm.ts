import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { useUploadAttachment } from "@modules/attachments";
import {
  DispatchUnitsNotAddedError,
  useCreateDispatchWithUnits,
} from "./useDispatchRequests";
import { useDispatchCreateLogistics } from "./useDispatchCreateLogistics";
import { useDispatchCreateSource } from "./useDispatchCreateSource";
import { useDispatchStagedDocs } from "./useDispatchStagedDocs";
import { errMsg } from "../../errorMessage";
import type { DispatchRequestCreate } from "../../api/dispatch";
import { DISPATCH_CREATE_STRINGS as S } from "../../components/dispatches/dispatch-create.strings";
import {
  EMPTY_LOGISTICS,
  buildCreateMetadata,
  buildDeliveryDetails,
} from "../../components/dispatches/dispatch-create-helpers";

/** First unmet condition for leaving step 0 — surfaced in a why-tooltip so
 *  the operator knows what's blocking them (§0.9). */
function nextBlockReasonFor(canProceed: boolean, sourceId: string): string | null {
  if (canProceed) return null;
  return sourceId ? S.blocked.needsAwb : S.blocked.needsSource;
}

/** State owner for the dispatch-create wizard. */
export function useDispatchCreateForm() {
  const navigate = useNavigate();
  const createWithUnits = useCreateDispatchWithUnits();
  const uploadMut = useUploadAttachment();
  const [step, setStep] = useState<0 | 1>(0);
  const src = useDispatchCreateSource();
  const logistics = useDispatchCreateLogistics();
  const docs = useDispatchStagedDocs();
  const [busy, setBusy] = useState(false);
  const { seed, source, sourceId, sourceType, selected, units } = src;
  const { logi, invoiceAmount, notes } = logistics;

  // Compared against the deep-link seed, so an untouched pre-filled form isn't dirty.
  const isDirty =
    !busy &&
    ((source?.id ?? null) !== (seed.source?.id ?? null) ||
      selected.size > 0 ||
      notes.trim() !== "" ||
      docs.stagedDocs.length > 0 ||
      invoiceAmount.trim() !== "" ||
      JSON.stringify(logi) !== JSON.stringify(EMPTY_LOGISTICS));
  const guard = useUnsavedChangesGuard({ isDirty });

  const leaveTo = async (path: string) => {
    guard.bypassOnce();
    await guard.popSentinelIfPresent();
    navigate(path, { replace: true });
  };

  // Upload staged docs after create; a partial failure is non-fatal and can be retried from detail.
  async function uploadStagedDocs(dispatchId: string) {
    if (docs.stagedDocs.length === 0) return;
    const results = await Promise.allSettled(
      docs.stagedDocs.map((d) =>
        // `silent`: one "Created" toast covers success; errors still toast.
        uploadMut.mutateAsync({
          file: d.file,
          document_type: d.document_type,
          entity_type: "dispatch_requests",
          entity_id: dispatchId,
          silent: true,
        }),
      ),
    );
    if (results.some((r) => r.status === "rejected")) {
      toast.error(S.docsUploadPartial);
    }
  }

  async function handleCreate() {
    const chosen = units.filter((u) => selected.has(u.material_issue_item_id));
    if (chosen.length === 0) return;
    const warehouseIds = new Set(chosen.map((u) => u.warehouse_id));
    if (warehouseIds.size > 1) {
      toast.error(S.multiWarehouse);
      return;
    }
    setBusy(true);
    try {
      const delivery = buildDeliveryDetails(logi);
      const dr = await createWithUnits.mutateAsync({
        body: {
          dispatch_type: sourceType.dispatchType,
          source_entity_type:
            sourceType.entity as DispatchRequestCreate["source_entity_type"],
          source_entity_id: sourceId,
          from_warehouse_id: [...warehouseIds][0],
          notes: notes.trim() || undefined,
          metadata: buildCreateMetadata(delivery, invoiceAmount),
        },
        materialIssueItemIds: chosen.map((u) => u.material_issue_item_id),
      });
      await uploadStagedDocs(dr.id);
      toast.success(S.created);
      // Saved: skip the discard guard and replace the route so Back goes to the list.
      await leaveTo(`/wms/dispatches/${dr.id}`);
    } catch (e) {
      if (e instanceof DispatchUnitsNotAddedError) {
        // The draft exists — open it so units can be added there, rather
        // than leave the user on a form whose retry makes a second draft.
        toast.error(S.unitsNotAdded(e.message));
        await leaveTo(`/wms/dispatches/${e.draftId}`);
        return;
      }
      toast.error(errMsg(e, S.createFailed));
    } finally {
      setBusy(false);
    }
  }

  // AWB / Tracking No. is mandatory to create a dispatch request, so it also
  // gates leaving step 0 (source + logistics) for the units step.
  const canProceed = sourceType.wired && !!sourceId && logistics.awbFilled;

  return {
    step,
    setStep,
    src,
    logistics,
    docs,
    guard,
    busy,
    canProceed,
    nextBlockReason: nextBlockReasonFor(canProceed, sourceId),
    createBlockReason: selected.size === 0 ? S.blocked.noUnits : null,
    handleCreate,
    cancel: () => guard.attempt(() => navigate("/wms/dispatches")),
  };
}

export type DispatchCreateFormState = ReturnType<typeof useDispatchCreateForm>;
