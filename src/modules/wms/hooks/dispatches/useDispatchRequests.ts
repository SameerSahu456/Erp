import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  cancelDispatch,
  createDispatchRequest,
  fetchDispatchRequests,
  finaliseDispatch,
  patchDispatchRequest,
  pickFromMaterialIssue,
  type DispatchCancelBody,
  type DispatchFinaliseBody,
  type DispatchRequestCreate,
  type DispatchRequestListParams,
  type DispatchRequestPatch,
} from "../../api/dispatch";
import { USE_DISPATCH_REQUESTS_STRINGS } from "./use-dispatch-requests.strings";
import { notifyMutationError } from "@shared/api/notify-mutation-error";
import { wmsKeys } from "../keys";

const K = wmsKeys.dispatches;

/** A dispatch write: its record, lists + counts, and when units move the ready pool, outward list and tiles. */
function invalidateDispatch(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
  { unitsMoved }: { unitsMoved: boolean },
) {
  void qc.invalidateQueries({ queryKey: K.detail(id) });
  void qc.invalidateQueries({ queryKey: K.lists() });
  void qc.invalidateQueries({ queryKey: K.counts() });
  if (!unitsMoved) return;
  void qc.invalidateQueries({ queryKey: K.readyUnitsAll() });
  void qc.invalidateQueries({ queryKey: wmsKeys.materialIssues.linesAll() });
  void qc.invalidateQueries({ queryKey: wmsKeys.stats.all });
}

/** The dispatch worklist — one page of dispatch requests (newest first),
 *  filterable by type / status / warehouse and searchable on dispatch_number. */
export function useDispatchRequestsList(params: DispatchRequestListParams) {
  return useQuery({
    queryKey: K.list(params),
    queryFn: () => fetchDispatchRequests(params),
  });
}

/** Units step failed after the draft was created; carries its id so a retry doesn't create a second draft. */
export class DispatchUnitsNotAddedError extends Error {
  readonly draftId: string;
  constructor(draftId: string, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "DispatchUnitsNotAddedError";
    this.draftId = draftId;
  }
}

/** Create a dispatch and add the chosen units (two calls, no atomic endpoint). */
export function useCreateDispatchWithUnits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      body,
      materialIssueItemIds,
    }: {
      body: DispatchRequestCreate;
      materialIssueItemIds: string[];
    }) => {
      const dr = await createDispatchRequest(body);
      try {
        await pickFromMaterialIssue(dr.id, materialIssueItemIds);
      } catch (e) {
        throw new DispatchUnitsNotAddedError(dr.id, e);
      }
      return dr;
    },
    onSettled: (dr, error) => {
      // On a units failure the draft still exists (error carries its id).
      const id = dr?.id ?? (error instanceof DispatchUnitsNotAddedError ? error.draftId : null);
      if (id) invalidateDispatch(qc, id, { unitsMoved: true });
      else void qc.invalidateQueries({ queryKey: K.lists() });
    },
  });
}

export function usePatchDispatchRequest(dispatchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DispatchRequestPatch) =>
      patchDispatchRequest(dispatchId, body),
    onSuccess: () => {
      invalidateDispatch(qc, dispatchId, { unitsMoved: false });
      toast.success(USE_DISPATCH_REQUESTS_STRINGS.toasts.updated);
    },
    onError: notifyMutationError,
  });
}

export function useFinaliseDispatch(dispatchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DispatchFinaliseBody) =>
      finaliseDispatch(dispatchId, body),
    onSuccess: () => {
      invalidateDispatch(qc, dispatchId, { unitsMoved: true });
      toast.success(USE_DISPATCH_REQUESTS_STRINGS.toasts.finalised);
    },
    onError: notifyMutationError,
  });
}

/** Cancel a dispatch (draft or dispatched/recall). A recall returns its units
 *  to the ready-for-dispatch queue, so refresh that too. A vendor consignment
 *  reopens its purchase return instead, so refresh those as well. */
export function useCancelDispatch(dispatchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DispatchCancelBody) => cancelDispatch(dispatchId, body),
    onSuccess: () => {
      invalidateDispatch(qc, dispatchId, { unitsMoved: true });
      void qc.invalidateQueries({ queryKey: wmsKeys.purchaseReturns.all });
      toast.success(USE_DISPATCH_REQUESTS_STRINGS.toasts.cancelled);
    },
    onError: notifyMutationError,
  });
}
