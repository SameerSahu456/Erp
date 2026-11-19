import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { imsKeys } from "@modules/ims";

import { MATERIAL_ISSUE_STRINGS as S } from "../../components/material-issue/material-issue.strings";
import {
  addMaterialIssueLines,
  cancelMaterialIssue,
  completeOutwardQc,
  createMaterialIssue,
  deleteMaterialIssueLine,
  deleteMaterialIssueLines,
  issueMaterialIssue,
  patchMaterialIssueHeader,
  pullOutMaterialIssuePart,
  returnMaterialIssueUnits,
  startOutwardQc,
  topUpMaterialIssue,
  updateMaterialIssueLine,
  type MaterialIssueCreateRequest,
  type MaterialIssueHeaderPatchRequest,
  type MaterialIssueLineInput,
  type MaterialIssueLineUpdateRequest,
  type MaterialIssuePullOutRequest,
  type MaterialIssueQcCompleteRequest,
  type MaterialIssueResponse,
  type MaterialIssueReturnRequest,
} from "../../api";
import { invalidateDevice } from "../devices/useDevices";
import { wmsKeys } from "../keys";

const K = wmsKeys.materialIssues;

// §16.9: refresh this MI, the MI lists, the outward worklist + counts, and the stock /
// dispatch / demand / stats queries that unit moves affect. Never the whole WMS tree.
export function useInvalidateMaterialIssue() {
  const qc = useQueryClient();
  return (id?: string) => {
    if (id) void qc.invalidateQueries({ queryKey: K.detail(id) });
    void qc.invalidateQueries({ queryKey: K.lists() });
    void qc.invalidateQueries({ queryKey: K.linesAll() });
    void qc.invalidateQueries({ queryKey: K.issuedLinesAll() });
    void qc.invalidateQueries({ queryKey: wmsKeys.availableStock.all });
    void qc.invalidateQueries({ queryKey: wmsKeys.dispatches.readyUnitsAll() });
    void qc.invalidateQueries({ queryKey: wmsKeys.stats.all });
  };
}

// Map a failed mutation's WMSErrorCode to a friendly message (ApiError carries
// `businessCode`); fall back to the API message, then a generic default.
function miErrorMessage(err: unknown): string {
  const code = (err as { businessCode?: string })?.businessCode;
  if (code && S.errors[code]) return S.errors[code];
  const message = (err as { message?: string })?.message;
  return message || S.errors.default;
}
const onMiError = (err: unknown) => toast.error(miErrorMessage(err));

// A Material Issue return is blocked while a live dispatch still holds
// the device. The API returns MI_RETURN_BLOCKED_BY_DISPATCH with the blocking
// dispatch's id + number on `errors`, so the UI can name it and link to it.
function dispatchBlockInfo(
  err: unknown,
): { dispatchRequestId: string; dispatchNumber: string } | null {
  const e = err as { businessCode?: string; errors?: unknown };
  if (e?.businessCode !== "MI_RETURN_BLOCKED_BY_DISPATCH") return null;
  const raw = e.errors;
  if (!raw || Array.isArray(raw) || typeof raw !== "object") return null;
  const d = raw as { dispatch_request_id?: unknown; dispatch_number?: unknown };
  if (typeof d.dispatch_request_id !== "string" || typeof d.dispatch_number !== "string") {
    return null;
  }
  return { dispatchRequestId: d.dispatch_request_id, dispatchNumber: d.dispatch_number };
}

export function useCreateMaterialIssue() {
  const invalidate = useInvalidateMaterialIssue();
  return useMutation({
    onError: onMiError,
    mutationFn: (body: MaterialIssueCreateRequest) => createMaterialIssue(body),
    onSuccess: (res: MaterialIssueResponse) => {
      invalidate(res.id);
      toast.success(S.toast.created);
    },
  });
}

export function usePatchMaterialIssueHeader() {
  const invalidate = useInvalidateMaterialIssue();
  return useMutation({
    onError: onMiError,
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: MaterialIssueHeaderPatchRequest;
    }) => patchMaterialIssueHeader(id, body),
    onSuccess: (res: MaterialIssueResponse) => {
      invalidate(res.id);
      toast.success(S.toast.updated);
    },
  });
}

export function useAddMaterialIssueLines() {
  const invalidate = useInvalidateMaterialIssue();
  return useMutation({
    onError: onMiError,
    mutationFn: ({
      id,
      lines,
    }: {
      id: string;
      lines: MaterialIssueLineInput[];
      // An edit-save rebuilds lines (delete + re-add) and fires ONE summary
      // toast + ONE invalidation itself (§0.13/§11), so it passes `silent`.
      silent?: boolean;
    }) => addMaterialIssueLines(id, lines),
    onSuccess: (res: MaterialIssueResponse, { silent }) => {
      if (silent) return;
      invalidate(res.id);
      toast.success(S.toast.lineAdded);
    },
  });
}

export function useUpdateMaterialIssueLine() {
  const invalidate = useInvalidateMaterialIssue();
  return useMutation({
    onError: onMiError,
    mutationFn: ({
      id,
      lineId,
      body,
    }: {
      id: string;
      lineId: string;
      body: MaterialIssueLineUpdateRequest;
    }) => updateMaterialIssueLine(id, lineId, body),
    onSuccess: (res: MaterialIssueResponse) => {
      invalidate(res.id);
      toast.success(S.toast.updated);
    },
  });
}

export function useDeleteMaterialIssueLine() {
  const invalidate = useInvalidateMaterialIssue();
  return useMutation({
    onError: onMiError,
    mutationFn: ({
      id,
      lineId,
    }: {
      id: string;
      lineId: string;
      // In an edit-save's delete loop the caller passes `silent`; one summary
      // toast + one invalidation fire after the loop instead of N (§0.13/§11).
      silent?: boolean;
    }) => deleteMaterialIssueLine(id, lineId),
    onSuccess: (res: MaterialIssueResponse, { silent }) => {
      if (silent) return;
      invalidate(res.id);
      toast.success(S.toast.lineRemoved);
    },
  });
}

export function useDeleteMaterialIssueLines() {
  const invalidate = useInvalidateMaterialIssue();
  return useMutation({
    onError: onMiError,
    mutationFn: ({
      id,
      lineIds,
    }: {
      id: string;
      lineIds: string[];
      // The edit-save's line rebuild passes `silent`; one summary toast + one
      // invalidation fire after the rebuild instead of per call (§0.13/§11).
      silent?: boolean;
    }) => deleteMaterialIssueLines(id, lineIds),
    onSuccess: (res: MaterialIssueResponse, { silent }) => {
      if (silent) return;
      invalidate(res.id);
      toast.success(S.toast.lineRemoved);
    },
  });
}

export function useIssueMaterialIssue() {
  const invalidate = useInvalidateMaterialIssue();
  return useMutation({
    onError: onMiError,
    mutationFn: (id: string) => issueMaterialIssue(id),
    onSuccess: (res: MaterialIssueResponse) => {
      invalidate(res.id);
      toast.success(S.toast.issued);
    },
  });
}

export function useCancelMaterialIssue() {
  const invalidate = useInvalidateMaterialIssue();
  return useMutation({
    onError: onMiError,
    mutationFn: (id: string) => cancelMaterialIssue(id),
    onSuccess: (res: MaterialIssueResponse) => {
      invalidate(res.id);
      toast.success(S.toast.cancelled);
    },
  });
}

export function useReturnMaterialIssueUnits() {
  const invalidate = useInvalidateMaterialIssue();
  const navigate = useNavigate();
  return useMutation({
    onError: (err: unknown) => {
      // When the return is blocked by a live dispatch, keep the API's
      // message (it names the DSP) and add a clickable action on the DSP number
      // that opens that dispatch request so the user can cancel it.
      const info = dispatchBlockInfo(err);
      if (info) {
        toast.error(miErrorMessage(err), {
          duration: 8000,
          action: {
            // Short, fixed label — the DSP number is already in the message, so
            // a long label here crowded and broke the toast text layout.
            label: S.toast.viewDispatch,
            onClick: () => navigate(`/wms/dispatches/${info.dispatchRequestId}`),
          },
        });
        return;
      }
      onMiError(err);
    },
    mutationFn: ({ id, body }: { id: string; body: MaterialIssueReturnRequest }) =>
      returnMaterialIssueUnits(id, body),
    onSuccess: (res: MaterialIssueResponse) => {
      invalidate(res.id);
      toast.success(S.toast.returned);
    },
  });
}

// D26 — pulling a part out registers a NEW stock unit. It creates no component
// line, but it DOES appear on the MI detail's pull-out surface (the "Removed
// Components" list + the trace-back panel), which reads the /pull-outs query.
// That key nests under the detail key, so invalidating the detail refreshes it
// too — without this the Removed list stays empty until a full reload.
export function usePullOutMaterialIssuePart() {
  const invalidate = useInvalidateMaterialIssue();
  const qc = useQueryClient();
  return useMutation({
    onError: onMiError,
    mutationFn: ({ id, body }: { id: string; body: MaterialIssuePullOutRequest }) =>
      pullOutMaterialIssuePart(id, body),
    onSuccess: (_data, { id }) => {
      invalidate(id);
      // A recorded part left the unit's contents.
      qc.invalidateQueries({ queryKey: imsKeys.stock });
      toast.success(S.pullOut.toastSuccess);
    },
  });
}

export function useTopUpMaterialIssue() {
  const invalidate = useInvalidateMaterialIssue();
  return useMutation({
    mutationFn: ({ id, lines }: { id: string; lines: MaterialIssueLineInput[] }) =>
      topUpMaterialIssue(id, lines),
    onSuccess: (_d, { id }) => {
      invalidate(id);
      toast.success(S.topUp.toastSuccess);
    },
    // Keep the business-code mapping (e.g. insufficient stock) — a fixed
    // "top-up failed" threw away why.
    onError: onMiError,
  });
}

export function useStartOutwardQc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lineId }: { id: string; lineId: string }) =>
      startOutwardQc(id, lineId),
    onSuccess: (_d, { id }) => {
      // Silent on purpose: the dialog auto-starts this the instant it opens,
      // so a "recorded" toast here would fire before any verdict is given.
      // Only useCompleteOutwardQc announces success. Invalidate ONLY the one
      // detail so it reflects the newly-opened QC op — opening a QC op changes
      // no list/worklist-visible field (the stage flips on COMPLETE, which
      // still does the full invalidation), so refetching the whole MI list +
      // lines worklist on every dialog-open was pure waste.
      void qc.invalidateQueries({ queryKey: K.detail(id) });
    },
    onError: onMiError,
  });
}

export function useCompleteOutwardQc() {
  const qc = useQueryClient();
  const invalidate = useInvalidateMaterialIssue();
  return useMutation({
    mutationFn: ({
      id,
      lineId,
      body,
    }: {
      id: string;
      lineId: string;
      body: MaterialIssueQcCompleteRequest;
    }) => completeOutwardQc(id, lineId, body),
    onSuccess: (op, { id }) => {
      invalidate(id);
      // The line's Outward QC tab reads the unit's checklist runs (a device key).
      if (op.stock_item_id) invalidateDevice(qc, op.stock_item_id);
      toast.success(S.qc.toastSuccess);
    },
    onError: onMiError,
  });
}
