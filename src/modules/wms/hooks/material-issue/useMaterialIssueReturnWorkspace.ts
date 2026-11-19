import { useMemo, useState } from "react";

import { ApiError } from "@shared/api/envelope";

import type { MaterialIssueResponse } from "../../api";
import type { ReturnUnit, ReturnWorkspaceValue } from "../../components/material-issue/returnWorkspaceContext";
import { MATERIAL_ISSUE_STRINGS as S } from "../../components/material-issue/material-issue.strings";
import { useDiscardGuard } from "../operations/useDiscardGuard";
import { useReturnMaterialIssueUnits } from "./useMaterialIssueMutations";

type ById<T> = Record<string, T>;

/** State owner for the Material Issue return workspace; the provider only shares it via context. */
export function useMaterialIssueReturnWorkspace(materialIssue: MaterialIssueResponse) {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<Map<string, ReturnUnit>>(new Map());
  const [locationById, setLocationById] = useState<ById<string>>({});
  const [noteById, setNoteById] = useState<ById<string>>({});
  // Per-unit "send for re-testing?" answer. Defaults to false (the common case
  // is an unopened return that already passed QC before it was issued).
  const [qcById, setQcById] = useState<ById<boolean>>({});
  // The submit confirm dialog's open state lives here so it resets with the
  // workspace (a local `open` would stay stuck and re-pop on re-entry).
  const [confirmOpen, setConfirmOpen] = useState(false);

  const returnMutation = useReturnMaterialIssueUnits();

  const reset = () => {
    setSelected(new Map());
    setLocationById({});
    setNoteById({});
    setQcById({});
    setConfirmOpen(false);
  };
  const exit = () => {
    reset();
    setActive(false);
  };
  // Cancelling wipes ticked units, locations and notes, so confirm before
  // discarding once anything is selected — never a silent discard (§5).
  const cancelGuard = useDiscardGuard(selected.size > 0, exit);

  const selectedMachineIds = useMemo(() => {
    const ids = new Set<string>();
    for (const u of selected.values()) if (u.lineId === u.machineLineId) ids.add(u.lineId);
    return ids;
  }, [selected]);
  const selectedIds = useMemo(() => new Set(selected.keys()), [selected]);
  const missingLocations = useMemo(
    () => [...selected.keys()].filter((id) => !locationById[id]).length,
    [selected, locationById],
  );

  const toggleMachine = (machine: ReturnUnit, components: ReturnUnit[]) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const units = [machine, ...components];
      if (next.has(machine.lineId)) units.forEach((u) => next.delete(u.lineId));
      else units.forEach((u) => next.set(u.lineId, u));
      return next;
    });
  };
  const toggleComponent = (unit: ReturnUnit) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(unit.lineId)) next.delete(unit.lineId);
      else next.set(unit.lineId, unit);
      return next;
    });
  };

  // Notes are optional; only a location per unit is required.
  const canSubmit = selected.size > 0 && missingLocations === 0 && !returnMutation.isPending;

  const submit = () => {
    if (!canSubmit) return;
    returnMutation.mutate(
      {
        id: materialIssue.id,
        body: {
          entries: [...selected.keys()].map((lineId) => ({
            line_item_id: lineId,
            return_location_id: locationById[lineId],
            note: noteById[lineId]?.trim() || undefined,
            send_to_qc: qcById[lineId] ?? false,
          })),
        },
      },
      { onSuccess: exit },
    );
  };

  const apiError = returnMutation.error instanceof ApiError ? returnMutation.error : null;
  const errorMessage = apiError ? (S.errors[apiError.businessCode] ?? apiError.envMessage) : null;

  const value: ReturnWorkspaceValue = {
    active,
    start: () => setActive(true),
    cancel: cancelGuard.requestClose,
    warehouseId: materialIssue.warehouse_id,
    selectedIds,
    selectedMachineIds,
    toggleMachine,
    toggleComponent,
    locationFor: (id) => locationById[id] ?? "",
    setLocation: (id, v) => setLocationById((prev) => ({ ...prev, [id]: v })),
    noteFor: (id) => noteById[id] ?? "",
    setNote: (id, v) => setNoteById((prev) => ({ ...prev, [id]: v })),
    qcFor: (id) => qcById[id] ?? false,
    setQc: (id, v) => setQcById((prev) => ({ ...prev, [id]: v })),
    count: selected.size,
    missingLocations,
    canSubmit,
    submitting: returnMutation.isPending,
    submit,
    errorMessage,
    confirmOpen,
    setConfirmOpen,
  };

  return { value, cancelGuard };
}
