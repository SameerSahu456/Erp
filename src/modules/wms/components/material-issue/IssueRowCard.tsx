import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { type IssueRow, rowAnchorId } from "./material-issue-form-helpers";
import { ComponentsSection } from "./ComponentsSection";
import {
  IssueRowErrorBanner,
  IssueRowFields,
  IssueRowLabel,
  IssueRowSubstitution,
  IssueRowSuggestedUnit,
} from "./IssueRowCardParts";

// ── One line-item row (GRN-style: Part | Serial | Qty | ✕) + components ──────

export function IssueRowCard({
  row,
  maxQty,
  warehouseId,
  isDuplicateSerial,
  selectedSerials,
  errorMessage,
  onPatch,
  onRemove,
}: {
  row: IssueRow;
  maxQty: number;
  warehouseId: string;
  isDuplicateSerial: (serial: string) => boolean;
  /** Serials picked across the whole form, so each serial dropdown can hide
   *  units already selected on other rows. */
  selectedSerials?: Set<string>;
  /** Inline validation message for this row after a blocked Save. */
  errorMessage?: string;
  onPatch: (patch: Partial<IssueRow>) => void;
  onRemove: () => void;
}) {
  const serialDuplicate = isDuplicateSerial(row.serial);
  const isSubstitute =
    !!row.originalVariantId &&
    !!row.variantOption &&
    row.variantOption.id !== row.originalVariantId;

  return (
    <div className="rounded-lg border" id={rowAnchorId(row.key)}>
      <IssueRowLabel label={row.label} />
      <IssueRowSuggestedUnit row={row} warehouseId={warehouseId} onPatch={onPatch} />

      {errorMessage && (
        <IssueRowErrorBanner message={errorMessage} className="border-b" />
      )}
      <IssueRowFields
        row={row}
        maxQty={maxQty}
        warehouseId={warehouseId}
        serialDuplicate={serialDuplicate}
        selectedSerials={selectedSerials}
        onPatch={onPatch}
        onRemove={onRemove}
      />

      {serialDuplicate && (
        <IssueRowErrorBanner
          message={S.form.lines.duplicateSerialField(row.serial.trim())}
          className="border-t"
        />
      )}

      {isSubstitute && (
        <IssueRowSubstitution
          reason={row.substitutionReason}
          onPatch={onPatch}
        />
      )}

      {/* Extra: components (BOM) fitted into this line */}
      {row.variantOption && (
        <div className="border-t p-3">
          <ComponentsSection
            title={S.form.lines.components}
            components={row.components}
            warehouseId={warehouseId}
            isDuplicateSerial={isDuplicateSerial}
            selectedSerials={selectedSerials}
            onChange={(components) => onPatch({ components })}
          />
        </div>
      )}
    </div>
  );
}
