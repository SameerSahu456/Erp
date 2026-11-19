import { createContext, useContext } from "react";

// One returnable physical unit (a machine or a fitted component).
export interface ReturnUnit {
  lineId: string;
  title: string;
  serial: string;
  machineLineId: string; // a component points at its machine; a machine at itself
}

export interface ReturnWorkspaceValue {
  active: boolean;
  start: () => void;
  cancel: () => void;
  warehouseId: string;
  selectedIds: Set<string>;
  selectedMachineIds: Set<string>;
  toggleMachine: (machine: ReturnUnit, components: ReturnUnit[]) => void;
  toggleComponent: (unit: ReturnUnit) => void;
  locationFor: (lineId: string) => string;
  setLocation: (lineId: string, value: string) => void;
  // Per-unit return note (optional) — kept against the returned line.
  noteFor: (lineId: string) => string;
  setNote: (lineId: string, value: string) => void;
  // Per-unit answer to "does this unit need re-testing before it is sellable
  // again?". Per-unit because one return mixes an untouched machine the
  // customer never unboxed with one an engineer opened and stripped.
  qcFor: (lineId: string) => boolean;
  setQc: (lineId: string, value: boolean) => void;
  // Submit surface — driven by the confirm dialog in the Line Items header.
  count: number;
  missingLocations: number;
  canSubmit: boolean;
  submitting: boolean;
  submit: () => void;
  errorMessage: string | null;
  // Submit confirm dialog open state — owned by the provider so it resets with
  // the workspace.
  confirmOpen: boolean;
  setConfirmOpen: (open: boolean) => void;
}

export const ReturnWorkspaceContext = createContext<ReturnWorkspaceValue | null>(null);

export function useReturnWorkspace(): ReturnWorkspaceValue {
  const ctx = useContext(ReturnWorkspaceContext);
  if (!ctx) throw new Error("useReturnWorkspace must be used within MaterialIssueReturnProvider");
  return ctx;
}
