import { Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AsyncSelect } from "@/components/ui/async-select";
import {
  useStockItemComponents,
  useVariantsListInfinite,
  type StockItemComponent,
  type VariantListItem,
} from "@modules/ims";
import { Typography } from "@/components/ui/typography";
import type { PullOutState } from "../../hooks/material-issue/useIssuedComponentsPanel";
import { PULL_OUT_OTHER_PART, recordedPartLabel } from "../../hooks/material-issue/usePullOutForm";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { variantPlainLabel, variantPartLine } from "./variant-labels";
import { BlockReasonTooltip } from "./BlockReasonTooltip";
import { CountChip } from "./CountChip";
import { EditorSectionHeader } from "./EditorSectionHeader";
import {
  PullOutDestinationField,
  PullOutDetailsFields,
  PullOutSerialField,
} from "./PullOutDetailsFields";
import { StagedRemovesTable } from "./StagedRemovesTable";

function PullOutSourceSelect({ rm }: { rm: PullOutState }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label>{S.pullOut.sourceLabel}</Label>
      <Select
        value={rm.effectiveSource || undefined}
        onValueChange={(v) => rm.setSource(v ?? "")}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={S.pullOut.sourcePlaceholder}>
            {rm.sourceOptions.find((o) => o.id === rm.effectiveSource)?.label ??
              S.pullOut.sourcePlaceholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {rm.sourceOptions.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** The parts recorded inside the chosen unit, offered first; "Not in the
 *  list" falls back to picking any part. Hidden when nothing is recorded. */
function PullOutRecordedSelect({
  rm,
  recorded,
}: {
  rm: PullOutState;
  recorded: StockItemComponent[];
}) {
  if (recorded.length === 0) return null;
  const picked = recorded.find((c) => c.id === rm.recordedChoice);
  const current =
    rm.recordedChoice === PULL_OUT_OTHER_PART
      ? S.pullOut.recordedOther
      : picked
        ? recordedPartLabel(picked)
        : S.pullOut.recordedPlaceholder;
  return (
    <div className="min-w-0 space-y-1.5">
      <Label>{S.pullOut.recordedLabel}</Label>
      <Select
        value={rm.recordedChoice || undefined}
        onValueChange={(v) => {
          const choice = v ?? "";
          rm.pickRecorded(choice, recorded.find((c) => c.id === choice) ?? null);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={S.pullOut.recordedPlaceholder}>{current}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {recorded.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {recordedPartLabel(c)}
            </SelectItem>
          ))}
          <SelectItem value={PULL_OUT_OTHER_PART}>{S.pullOut.recordedOther}</SelectItem>
        </SelectContent>
      </Select>
      {picked && !picked.part_variant_id ? (
        <Typography variant="helper" tone="muted">
          {S.pullOut.recordedDescribedHint}
        </Typography>
      ) : null}
    </div>
  );
}

/** Pick any part — for one not recorded, or recorded only by description. */
function PullOutVariantPicker({ rm }: { rm: PullOutState }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className={cn("min-w-0 space-y-1.5", !rm.variant && "sm:col-span-2")}>
        <Label>{S.pullOut.variantLabel}</Label>
        <AsyncSelect<VariantListItem>
          value={rm.variant}
          onValueChange={(opt) => {
            if (!opt) rm.clear();
          }}
          onItemPick={rm.pickVariant}
          useOptions={useVariantsListInfinite}
          toLabel={variantPlainLabel}
          getDescription={variantPartLine}
          placeholder={S.form.lines.variantPlaceholder}
          searchPlaceholder={S.form.lines.variantSearchPlaceholder}
          searchable
          loadOnOpen
        />
      </div>
      {rm.variant && <PullOutSerialField rm={rm} />}
    </div>
  );
}

/** ── Pull Out Components ── */
export function PullOutComponentsSection({
  rm,
  warehouseId,
  besideAdd,
}: {
  rm: PullOutState;
  warehouseId: string;
  /** Rendered as the right-hand column next to the Add editor. */
  besideAdd: boolean;
}) {
  // The parts recorded inside the chosen unit are asked for first.
  const contents = useStockItemComponents(rm.sourceUnitId ?? "", {
    enabled: !!rm.sourceUnitId,
  });
  const recorded = (contents.data?.current_components ?? []).filter(
    (c) => !rm.stagedComponentIds.has(c.id),
  );
  const showVariantPicker =
    rm.needsVariant && (recorded.length === 0 || rm.recordedChoice !== "");
  return (
    <div className={cn("space-y-3.5", besideAdd && "lg:pl-6")}>
      <EditorSectionHeader
        icon={<Minus className="size-4" />}
        iconClassName="bg-destructive/12 text-destructive"
        title={S.issuedComponents.removeTitle}
        hint={S.issuedComponents.removeHint}
        trailing={rm.fittedCount != null && <CountChip n={rm.fittedCount} tone="danger" />}
      />

      <PullOutSourceSelect rm={rm} />
      <PullOutRecordedSelect rm={rm} recorded={recorded} />

      {showVariantPicker && <PullOutVariantPicker rm={rm} />}

      {rm.hasPart && (
        <>
          <PullOutDestinationField rm={rm} />
          <PullOutDetailsFields rm={rm} warehouseId={warehouseId} />
        </>
      )}

      <BlockReasonTooltip reason={rm.blockReason} triggerClassName="inline-flex w-full">
        <Button
          variant="destructive"
          className="w-full"
          onClick={rm.stage}
          disabled={!rm.canStage}
        >
          <Minus className="size-4" data-icon="inline-start" />
          {S.issuedComponents.removeAction}
        </Button>
      </BlockReasonTooltip>

      <StagedRemovesTable rm={rm} />
    </div>
  );
}
