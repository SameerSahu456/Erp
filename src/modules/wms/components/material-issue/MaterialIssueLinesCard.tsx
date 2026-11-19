import { Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import type { MaterialIssueLinesState } from "../../hooks/material-issue/useMaterialIssueForm";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import {
  type FormFieldError,
  FIELD_LINES,
  rowAnchorId,
  rowQty,
} from "./material-issue-form-helpers";
import { IssueRowCard } from "./IssueRowCard";
import { AddLineItemSelect } from "./AddLineItemSelect";
import { InlineFieldError } from "./MaterialIssueFieldBits";

interface LinesProps {
  lines: MaterialIssueLinesState;
  warehouseId: string;
  formError: FormFieldError | null;
}

function StagedRows({ lines, warehouseId, formError }: LinesProps) {
  const { rows, demandLines, addable } = lines;
  if (rows.length === 0) {
    return (
      <Typography variant="body" tone="muted">
        {addable.length === 0
          ? S.form.lines.allIssued
          : S.form.lines.emptySelected}
      </Typography>
    );
  }
  return (
    <>
      {rows.map((r) => {
        const line = demandLines.find((l) => l.sourceLineId === r.sourceLineId);
        const maxQty = line ? lines.remainingFor(line) + rowQty(r) : r.quantity;
        return (
          <IssueRowCard
            key={r.key}
            row={r}
            maxQty={Math.max(1, maxQty)}
            warehouseId={warehouseId}
            isDuplicateSerial={lines.isDuplicateSerial}
            selectedSerials={lines.selectedSerials}
            errorMessage={
              formError?.target === rowAnchorId(r.key)
                ? formError.message
                : undefined
            }
            onPatch={(patch) => lines.patchRow(r.key, patch)}
            onRemove={() => lines.removeRow(r.key)}
          />
        );
      })}
    </>
  );
}

/** Why there's nothing to pick yet, or null once demand lines are ready. */
function linesBlockedMessage(
  lines: MaterialIssueLinesState,
  warehouseId: string,
): { text: string; danger?: boolean } | null {
  if (!lines.sourceEntityId) return { text: S.form.lines.pickSourceFirst };
  // Serials come from the chosen warehouse's stock, so block picking until one is selected.
  if (!warehouseId) return { text: S.form.lines.selectWarehouseFirst };
  if (lines.linesLoading) return { text: S.form.lines.linesLoading };
  if (lines.linesError) return { text: S.form.lines.linesError, danger: true };
  if (lines.demandLines.length === 0) return { text: S.form.lines.noDemandLines };
  return null;
}

export function MaterialIssueLinesCard({ lines, warehouseId, formError }: LinesProps) {
  const blocked = linesBlockedMessage(lines, warehouseId);
  return (
    <Card id={FIELD_LINES}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          {S.form.lines.section}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <InlineFieldError error={formError} target={FIELD_LINES} />
        {blocked ? (
          <Typography variant="body" tone={blocked.danger ? "danger" : "muted"}>
            {blocked.text}
          </Typography>
        ) : (
          <>
            {lines.addable.length > 0 && (
              <AddLineItemSelect
                addable={lines.addable}
                remainingFor={lines.remainingFor}
                availableFor={lines.availableFor}
                onAdd={lines.addRowFor}
              />
            )}
            <StagedRows lines={lines} warehouseId={warehouseId} formError={formError} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
