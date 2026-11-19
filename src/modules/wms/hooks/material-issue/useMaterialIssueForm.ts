import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { asUuid } from "@shared/lib/validation";
import { useWarehouseScope } from "../../context/warehouse-scope";
import { useMaterialIssueAssignees } from "./useMaterialIssueAssignees";
import { useAvailableStockCounts } from "./useAvailableStockCounts";
import { useMaterialIssue } from "./useMaterialIssues";
import { useMaterialIssueDemand } from "./useMaterialIssueDemand";
import { useMaterialIssueSubmit } from "./useMaterialIssueSubmit";
import { useMaterialIssueFormState } from "./useMaterialIssueFormState";
import {
  type DemandLine,
  rowsSignature,
  newRow,
} from "../../components/material-issue/material-issue-form-helpers";
import {
  buildLineItems,
  collectSelectedSerials,
  findDuplicateSerials,
  stagedCountByLine,
  validateMaterialIssueForm,
} from "../../components/material-issue/material-issue-payload-helpers";
import {
  formHasEdits,
  headerDiffers,
  seedEditRows,
} from "../../components/material-issue/material-issue-edit-helpers";

// Only these roles get the warehouse pre-filled, and only when they hold exactly one.
const PREFILL_ROLES = new Set(["warehouse_manager", "store_manager"]);
const soleManagedWarehouseId = (warehouses: { warehouse_id: string; role?: string | null }[]) =>
  warehouses.length === 1 && PREFILL_ROLES.has(warehouses[0].role ?? "")
    ? warehouses[0].warehouse_id
    : "";

/** State owner for the material-issue create / edit form. useState-based by design. */
export function useMaterialIssueForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  // §11.1: validate `:id` so a malformed id disables the query instead of drawing a 422.
  const validId = asUuid(id) ?? "";
  // Choices = the user's assigned warehouses (GET /wms/my-warehouses).
  const { warehouses } = useWarehouseScope();

  const st = useMaterialIssueFormState(soleManagedWarehouseId(warehouses));
  const { issueType, source, warehouseId, engineerId, externalTicket, notes } = st;
  const { rows, setRows, removedIds, setFormError } = st;

  const detailQuery = useMaterialIssue(validId, { enabled: isEdit && !!validId });
  const draft = detailQuery.data;

  if (isEdit) st.hydrateHeaderOnce(draft);

  // Existing primary lines on the draft, minus those marked for deletion.
  const existingLines = (draft?.line_items ?? []).filter(
    (l) => l.role === "primary" && !removedIds.has(l.id),
  );

  const sourceEntityId = source?.id ?? "";

  const { engineers, useWarehouseOptions, useEngineerOptions } =
    useMaterialIssueAssignees(warehouseId, warehouses);

  const { demandLines, variantLabel, linesLoading, linesError } =
    useMaterialIssueDemand(issueType, sourceEntityId, draft?.line_items);

  const stagedByLine = stagedCountByLine(rows, existingLines);
  const remainingFor = (line: DemandLine) =>
    line.orderedQty - line.issuedQty - (stagedByLine.get(line.sourceLineId) ?? 0);

  const addable = demandLines.filter((l) => remainingFor(l) > 0);

  // Available units per variant at the chosen warehouse; `null` = unknown.
  const { countByVariant: availableByVariant } = useAvailableStockCounts(
    warehouseId,
    addable
      .map((l) => l.originalVariantId)
      .filter((id): id is string => !!id),
  );
  const availableFor = (line: DemandLine): number | null =>
    line.originalVariantId
      ? (availableByVariant.get(line.originalVariantId) ?? 0)
      : null;

  const duplicateSerials = useMemo(() => findDuplicateSerials(rows), [rows]);
  const isDuplicateSerial = (serial: string) => {
    const s = serial.trim();
    return s.length > 0 && duplicateSerials.has(s);
  };
  const selectedSerials = useMemo(() => collectSelectedSerials(rows), [rows]);

  // Selecting a demand line adds it straight away (no separate Add step).
  const addRowFor = (sourceLineId: string) => {
    const line = demandLines.find((l) => l.sourceLineId === sourceLineId);
    if (!line) return;
    setFormError(null);
    const unit = line.suggestedUnit;
    const prefillSuggested =
      !!unit && unit.warehouseId === warehouseId && !selectedSerials.has(unit.serial);
    setRows((prev) => [...prev, newRow(line, remainingFor(line), { prefillSuggested })]);
  };

  // Edit mode: seed existing lines as editable rows; Save rebuilds them (delete + add).
  if (isEdit && draft && !linesLoading) {
    st.hydrateRowsOnce(() => seedEditRows(draft, demandLines, variantLabel));
  }

  // Dirty = differs from the baselines, not merely non-empty. Split by part so a no-op
  // "Save Changes" calls no API.
  const headerChanged = headerDiffers(st.headerBaseline, {
    engineerId,
    externalTicket,
    notes,
  });
  const linesChanged = rowsSignature(rows) !== st.rowsBaseline;

  const { guard, isSubmitting, submit } = useMaterialIssueSubmit({
    isEdit,
    draft,
    hasEdits: formHasEdits({ isEdit, sourceEntityId, linesChanged, headerChanged }),
    headerChanged,
    linesChanged,
    newRowCount: rows.length,
    removedIds,
    header: { issueType, sourceEntityId, warehouseId, engineerId, externalTicket, notes },
    buildLineItems: () => buildLineItems(rows),
    validate: () =>
      validateMaterialIssueForm({
        isEdit,
        sourceEntityId,
        warehouseId,
        engineerId,
        rows,
        existingLineCount: existingLines.length,
        duplicateSerials,
        demandLines,
      }),
    setFormError,
  });

  return {
    isEdit,
    detailQuery,
    draft,
    guard,
    isSubmitting,
    submit,
    formError: st.formError,
    header: {
      issueType,
      source,
      warehouseId,
      engineerId,
      externalTicket,
      notes,
      warehouses,
      engineers,
      useWarehouseOptions,
      useEngineerOptions,
      selectIssueType: st.selectIssueType,
      selectSource: st.selectSource,
      selectWarehouse: st.selectWarehouse,
      selectEngineer: st.selectEngineer,
      setExternalTicket: st.setExternalTicket,
      setNotes: st.setNotes,
    },
    lines: {
      sourceEntityId,
      linesLoading,
      linesError,
      demandLines,
      addable,
      rows,
      remainingFor,
      availableFor,
      isDuplicateSerial,
      selectedSerials,
      addRowFor,
      patchRow: st.patchRow,
      removeRow: st.removeRow,
    },
  };
}

export type MaterialIssueFormState = ReturnType<typeof useMaterialIssueForm>;
export type MaterialIssueHeaderState = MaterialIssueFormState["header"];
export type MaterialIssueLinesState = MaterialIssueFormState["lines"];
