import { useState } from "react";

import type { MaterialIssueResponse, WiredIssueType } from "../../api";
import type { ScanOption } from "../../components/material-issue/ScanSelect";
import {
  type IssueRow,
  type FormFieldError,
  rowsSignature,
} from "../../components/material-issue/material-issue-form-helpers";

const EMPTY_HEADER_BASELINE = { engineerId: "", externalTicket: "", notes: "" };

/** Local state of the material-issue form: header fields, rows, baselines and the
 *  handlers that clear the inline error. */
export function useMaterialIssueFormState(initialWarehouseId: string) {
  const [issueType, setIssueType] = useState<WiredIssueType>("sale_issue");
  const [source, setSource] = useState<ScanOption | null>(null);
  const [warehouseId, setWarehouseId] = useState(initialWarehouseId);
  // The initial id can land after the first render (my-warehouses loads async) —
  // adopt it once into a still-empty field. An edit draft's hydrate overrides it.
  const [adoptedInitial, setAdoptedInitial] = useState(!!initialWarehouseId);
  if (!adoptedInitial && initialWarehouseId) {
    setAdoptedInitial(true);
    if (!warehouseId) setWarehouseId(initialWarehouseId);
  }
  const [engineerId, setEngineerId] = useState("");
  const [externalTicket, setExternalTicket] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<IssueRow[]>([]);
  // Edit mode: the existing draft + which of its lines are marked for deletion.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  // Seeded once the draft's source demand has loaded (see the guard in the form hook).
  const [rowsHydrated, setRowsHydrated] = useState(false);
  // Header baseline for the unsaved-changes guard, so a hydrated edit form starts clean.
  const [headerBaseline, setHeaderBaseline] = useState(EMPTY_HEADER_BASELINE);
  // Line-items baseline signature, for the same reason.
  const [rowsBaseline, setRowsBaseline] = useState(() => rowsSignature([]));
  // Inline error from a blocked Save, anchored to its field (§3/§6.4).
  const [formError, setFormError] = useState<FormFieldError | null>(null);

  // Hydrate the header from the draft once. Type / source / warehouse are fixed
  // after create; only engineer / ticket / notes stay editable.
  const hydrateHeaderOnce = (draft: MaterialIssueResponse | undefined) => {
    if (!draft || hydrated) return;
    setHydrated(true);
    setIssueType(draft.issue_type as WiredIssueType);
    setSource({ id: draft.source_entity_id, label: draft.mi_number });
    setWarehouseId(draft.warehouse_id);
    setEngineerId(draft.issued_to_user_id);
    setExternalTicket(draft.external_ticket_number ?? "");
    setNotes(draft.notes ?? "");
    setHeaderBaseline({
      engineerId: draft.issued_to_user_id,
      externalTicket: draft.external_ticket_number ?? "",
      notes: draft.notes ?? "",
    });
  };

  // Seed existing lines as editable rows and mark originals for deletion (once).
  const hydrateRowsOnce = (seed: () => { seeded: IssueRow[]; originalIds: string[] }) => {
    if (rowsHydrated) return;
    const { seeded, originalIds } = seed();
    setRowsHydrated(true);
    setRows(seeded);
    setRemovedIds(new Set(originalIds));
    // Snapshot the seed so the guard treats an untouched edit form as clean.
    setRowsBaseline(rowsSignature(seeded));
  };

  const resetLines = () => setRows([]);

  const patchRow = (key: string, patch: Partial<IssueRow>) => {
    setFormError(null);
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  };
  const removeRow = (key: string) => {
    setFormError(null);
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  // ── Header-field handlers (each clears the inline error like before) ──────
  const selectIssueType = (next: WiredIssueType) => {
    setIssueType(next);
    setSource(null);
    resetLines();
  };
  const selectSource = (next: ScanOption | null) => {
    setFormError(null);
    setSource(next);
    resetLines();
  };
  const selectWarehouse = (next: string) => {
    setFormError(null);
    setWarehouseId(next);
    setEngineerId("");
    resetLines();
  };
  const selectEngineer = (next: string) => {
    setFormError(null);
    setEngineerId(next);
  };

  return {
    issueType,
    source,
    warehouseId,
    engineerId,
    externalTicket,
    setExternalTicket,
    notes,
    setNotes,
    rows,
    setRows,
    removedIds,
    headerBaseline,
    rowsBaseline,
    formError,
    setFormError,
    hydrateHeaderOnce,
    hydrateRowsOnce,
    patchRow,
    removeRow,
    selectIssueType,
    selectSource,
    selectWarehouse,
    selectEngineer,
  };
}
