import { useMemo, useRef, useState } from "react";

import { ApiError } from "@shared/api/envelope";
import type { VariantListItem } from "@modules/ims";
import {
  useTopUpMaterialIssue,
  usePullOutMaterialIssuePart,
} from "./useMaterialIssueMutations";
import type { MaterialIssueLineResponse } from "../../api";
import type { ScanOption } from "../../components/material-issue/ScanSelect";
import { MATERIAL_ISSUE_STRINGS as S } from "../../components/material-issue/material-issue.strings";
import { variantPlainLabel } from "../../components/material-issue/variant-labels";
import {
  readTracking,
  flattenComponents,
  collectFittedSerials,
  buildPullOutSourceOptions,
  findLineUnitId,
  type StagedAdd,
  type StagedRemove,
} from "../../components/material-issue/issued-components-panel-helpers";
import { stageBlockReasons } from "../../components/material-issue/issued-components-gate-helpers";
import { recordedPartLabel, usePullOutForm } from "./usePullOutForm";

function apiErrorMessage(error: unknown): string | null {
  return error instanceof ApiError
    ? (S.errors[error.businessCode] ?? error.envMessage)
    : null;
}

/** The Add-components editor: picked part, its serial and the avail chip. */
function useAddComponentForm() {
  const [variant, setVariant] = useState<ScanOption | null>(null);
  const [tracking, setTracking] = useState(false);
  const [serial, setSerial] = useState("");
  const [avail, setAvail] = useState<number | null>(null);
  const clear = () => {
    setVariant(null);
    setTracking(false);
    setSerial("");
    setAvail(null);
  };
  const pickVariant = (item: VariantListItem) => {
    setVariant({ id: item.id, label: variantPlainLabel(item) });
    setTracking(readTracking(item));
    setSerial("");
    setAvail(item.available_stock_qty ?? 0);
  };
  return { variant, tracking, serial, avail, setSerial, clear, pickVariant };
}

/** Staged (not yet committed) adds / removes, keyed by a local sequence. */
function useStagedComponents() {
  const keySeq = useRef(0);
  const nextKey = () => `k${(keySeq.current += 1)}`;
  const [stagedAdds, setStagedAdds] = useState<StagedAdd[]>([]);
  const [stagedRemoves, setStagedRemoves] = useState<StagedRemove[]>([]);
  const unstageAdd = (key: string) =>
    setStagedAdds((prev) => prev.filter((x) => x.key !== key));
  const unstageRemove = (key: string) =>
    setStagedRemoves((prev) => prev.filter((x) => x.key !== key));
  return {
    nextKey,
    stagedAdds,
    setStagedAdds,
    stagedRemoves,
    setStagedRemoves,
    unstageAdd,
    unstageRemove,
  };
}

/** Commit: one batched top-up for all staged adds, then each staged pull-out. */
function useCommitStaged(
  materialIssueId: string,
  machineId: string,
  staged: ReturnType<typeof useStagedComponents>,
) {
  const { stagedAdds, setStagedAdds, stagedRemoves, setStagedRemoves, unstageRemove } = staged;
  const topUp = useTopUpMaterialIssue();
  const pullOut = usePullOutMaterialIssuePart();
  const saving = topUp.isPending || pullOut.isPending;
  const hasChanges = stagedAdds.length > 0 || stagedRemoves.length > 0;
  // Discard and Save share the same gate: there must be staged changes. The
  // `saving` half is a pending state, excluded from the reason per §0.9.
  const noChangesReason = hasChanges ? null : S.issuedComponents.noChanges;

  const resetErrors = () => {
    topUp.reset();
    pullOut.reset();
  };
  const discard = () => {
    setStagedAdds([]);
    setStagedRemoves([]);
    resetErrors();
  };

  const save = async () => {
    if (!hasChanges || saving) return;
    try {
      if (stagedAdds.length > 0) {
        await topUp.mutateAsync({
          id: materialIssueId,
          lines: stagedAdds.map((a, i) => ({
            ref: `c${i + 1}`,
            parent_item_id: machineId,
            part_variant_id: a.variantId,
            serial: a.serial || undefined,
          })),
        });
        setStagedAdds([]);
      }
      for (const r of [...stagedRemoves]) {
        await pullOut.mutateAsync({
          id: materialIssueId,
          body: {
            source_line_item_id: r.sourceLineId,
            stock_item_component_id: r.componentId ?? undefined,
            part_variant_id: r.variantId ?? undefined,
            location_id: r.locationId,
            result_status: r.destination,
            manufacturer_serial: r.serial || undefined,
            notes: r.note || undefined,
          },
        });
        unstageRemove(r.key);
      }
    } catch {
      // Errors surface via topUp.error / pullOut.error below; the rows that
      // failed stay staged so the operator can retry or edit them.
    }
  };

  return {
    hasChanges,
    noChangesReason,
    saving,
    save,
    discard,
    resetErrors,
    error: apiErrorMessage(topUp.error) ?? apiErrorMessage(pullOut.error),
  };
}

export interface IssuedComponentsPanelArgs {
  materialIssueId: string;
  machine: MaterialIssueLineResponse;
  variantLabel: (variantId: string) => string;
}

/** Inline "Issued Components" editor. Adds / removes are staged until "Save changes". */
export function useIssuedComponentsPanel({
  materialIssueId,
  machine,
  variantLabel,
}: IssuedComponentsPanelArgs) {
  const staged = useStagedComponents();
  const { nextKey, stagedAdds, setStagedAdds, stagedRemoves, setStagedRemoves } = staged;
  const add = useAddComponentForm();
  const rm = usePullOutForm();

  const commit = useCommitStaged(materialIssueId, machine.id, staged);

  const flat = useMemo(() => flattenComponents(machine), [machine]);
  const fittedSerials = useMemo(() => collectFittedSerials(machine), [machine]);
  const sourceOptions = useMemo(
    () =>
      buildPullOutSourceOptions(machine, variantLabel, {
        machine: S.pullOut.machineRole,
        component: S.pullOut.componentRole,
      }),
    [machine, variantLabel],
  );

  const effectiveSource = rm.source || machine.id;
  const sourceUnitId = findLineUnitId(machine, effectiveSource);
  // A recorded part that names its part needs no pick; one only described, or
  // a part not in the list, does.
  const needsVariant = !rm.recorded || !rm.recorded.part_variant_id;
  const hasPart = needsVariant ? !!rm.variant : true;
  const scrapNeedsReason = rm.destination === "scrap" && rm.note.trim().length === 0;
  const stagedComponentIds = new Set(
    stagedRemoves.map((r) => r.componentId).filter((id): id is string => !!id),
  );
  // Units of the picked pull-out part currently fitted on this build.
  const rmFittedCount = rm.variant
    ? flat.filter((c) => c.variantId === rm.variant?.id).length
    : null;

  // Block a serial already fitted or already staged (same unit twice).
  const trimmedAddSerial = add.serial.trim();
  const duplicateSerial =
    trimmedAddSerial.length > 0 &&
    (fittedSerials.has(trimmedAddSerial) ||
      stagedAdds.some((a) => a.serial === trimmedAddSerial));
  const canStageAdd =
    !!add.variant &&
    !duplicateSerial &&
    (!add.tracking || trimmedAddSerial.length > 0);
  // Manufacturer serial is optional on a pull-out (internal serial is assigned
  // server-side), so staging only needs the part + a destination.
  const canStageRemove = hasPart && !!rm.location && !scrapNeedsReason;

  const blockReasons = stageBlockReasons({
    hasAddVariant: !!add.variant,
    duplicateSerial,
    canStageAdd,
    hasRemoveVariant: hasPart,
    scrapNeedsReason,
    canStageRemove,
  });

  const stageAdd = () => {
    if (!canStageAdd || !add.variant) return;
    const v = add.variant;
    setStagedAdds((prev) => [
      ...prev,
      { key: nextKey(), variantId: v.id, label: v.label, serial: add.serial.trim() },
    ]);
    add.clear();
  };

  const stageRemove = () => {
    if (!canStageRemove) return;
    const v = needsVariant ? rm.variant : null;
    const recorded = rm.recorded;
    setStagedRemoves((prev) => [
      ...prev,
      {
        key: nextKey(),
        sourceLineId: effectiveSource,
        componentId: recorded?.id ?? null,
        variantId: v?.id ?? null,
        destination: rm.destination,
        label: `${recorded ? recordedPartLabel(recorded) : (v?.label ?? "")} → ${
          S.pullOut.destinations[rm.destination]
        }`,
        serial: rm.serial.trim() || (recorded?.internal_serial ?? ""),
        locationId: rm.location,
        rackName: rm.rackName || "—",
        binName: rm.binName,
        note: rm.note.trim(),
      },
    ]);
    rm.setSource("");
    rm.clear();
  };

  return {
    add: {
      ...add,
      duplicateSerial,
      canStage: canStageAdd,
      blockReason: blockReasons.add,
      stage: stageAdd,
      staged: stagedAdds,
      unstage: staged.unstageAdd,
    },
    rm: {
      ...rm,
      effectiveSource,
      sourceUnitId,
      needsVariant,
      hasPart,
      stagedComponentIds,
      sourceOptions,
      fittedCount: rmFittedCount,
      canStage: canStageRemove,
      blockReason: blockReasons.remove,
      stage: stageRemove,
      staged: stagedRemoves,
      unstage: staged.unstageRemove,
    },
    commit,
  };
}

export type IssuedComponentsPanelState = ReturnType<typeof useIssuedComponentsPanel>;
export type AddComponentState = IssuedComponentsPanelState["add"];
export type PullOutState = IssuedComponentsPanelState["rm"];
export type CommitState = IssuedComponentsPanelState["commit"];
