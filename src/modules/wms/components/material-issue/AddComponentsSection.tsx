import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial";
import { AsyncSelect } from "@/components/ui/async-select";
import { useVariantsListInfinite, type VariantListItem } from "@modules/ims";
import type { AddComponentState } from "../../hooks/material-issue/useIssuedComponentsPanel";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { variantAvailLabel, variantPartLine } from "./variant-labels";
import { AvailableUnitScanSelect } from "./AvailableUnitScanSelect";
import { BlockReasonTooltip } from "./BlockReasonTooltip";
import { CountChip } from "./CountChip";
import { EditorSectionHeader } from "./EditorSectionHeader";
import { StagedTable } from "./StagedTable";
import { RowRemove } from "./RowRemove";

function StagedAdds({ add }: { add: AddComponentState }) {
  return (
    <StagedTable
      emptyText={S.issuedComponents.stagedAddEmpty}
      count={add.staged.length}
    >
      {add.staged.map((a) => (
        <div
          key={a.key}
          className="grid grid-cols-[1fr_auto_1.75rem] items-center gap-3 py-2"
        >
          <Typography variant="body" truncate asChild>
            <span className="min-w-0">{a.label}</span>
          </Typography>
          <Typography variant="mono" tone="muted" asChild>
            <TruncatedSerial value={a.serial} className="max-w-full" mono={false} />
          </Typography>
          <RowRemove onClick={() => add.unstage(a.key)} />
        </div>
      ))}
    </StagedTable>
  );
}

/** ── Add Components ── (only offered while assembling). */
export function AddComponentsSection({
  add,
  warehouseId,
}: {
  add: AddComponentState;
  warehouseId: string;
}) {
  // Only variants with a pickable unit in the MI's warehouse; named `use*` because AsyncSelect calls it as a hook.
  function useAvailableVariants(search: string, opts?: { enabled?: boolean }) {
    return useVariantsListInfinite(search, {
      ...opts,
      warehouse_id: warehouseId,
      available_only: true,
    });
  }

  return (
    <div className="space-y-3.5 lg:pr-6">
      <EditorSectionHeader
        icon={<Plus className="size-4" />}
        iconClassName="bg-success/12 text-success"
        title={S.issuedComponents.addTitle}
        hint={S.issuedComponents.addHint}
        trailing={add.avail != null && <CountChip n={add.avail} tone="success" />}
      />

      <div className="min-w-0 space-y-1.5">
        <Label>{S.topUp.variantLabel}</Label>
        <AsyncSelect<VariantListItem>
          value={add.variant}
          onValueChange={(opt) => {
            if (!opt) add.clear();
          }}
          onItemPick={add.pickVariant}
          useOptions={useAvailableVariants}
          toLabel={variantAvailLabel}
          getDescription={variantPartLine}
          placeholder={S.form.lines.variantPlaceholder}
          searchPlaceholder={S.form.lines.variantSearchPlaceholder}
          searchable
          loadOnOpen
        />
      </div>

      {add.variant && (
        <div className="min-w-0 space-y-1.5">
          <Label>
            {add.tracking ? S.topUp.serialLabel : S.topUp.serialOptionalLabel}
          </Label>
          <AvailableUnitScanSelect
            warehouseId={warehouseId}
            variantId={add.variant.id}
            serial={add.serial}
            onPicked={add.setSerial}
            onClear={() => add.setSerial("")}
          />
          {add.duplicateSerial && (
            <Typography variant="helper" tone="danger">
              {S.issuedComponents.duplicateSerialError}
            </Typography>
          )}
        </div>
      )}

      <BlockReasonTooltip reason={add.blockReason} triggerClassName="inline-flex w-full">
        <Button className="w-full" onClick={add.stage} disabled={!add.canStage}>
          <Plus className="size-4" data-icon="inline-start" />
          {S.issuedComponents.addAction}
        </Button>
      </BlockReasonTooltip>

      <StagedAdds add={add} />
    </div>
  );
}
