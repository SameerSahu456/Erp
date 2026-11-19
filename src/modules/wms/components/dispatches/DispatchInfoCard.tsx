import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AsyncSelect } from "@/components/ui/async-select";
import {
  useOutwardSourcesInfinite,
  type OutwardSourceOption,
} from "../../hooks/material-issue/useOutwardSources";
import type { DispatchCreateSourceState } from "../../hooks/dispatches/useDispatchCreateSource";
import { useWarehouseScope } from "../../context/warehouse-scope";
import { SectionHeader } from "../shared/section-primitives";
import { FormField } from "../shared/FormField";
import { DISPATCH_CREATE_STRINGS as S } from "./dispatch-create.strings";
import { DispatchSourceTypeTiles } from "./DispatchSourceTypeTiles";
import { SourceSummary } from "./SourceSummary";
import { sourceOptionDescription } from "../shared/source-option-description";
import { SourceOptionTitle } from "../shared/SourceOptionTitle";

/** Step 0 · 1 — Dispatch Info: source type tiles + source document. */
export function DispatchInfoCard({ src }: { src: DispatchCreateSourceState }) {
  const { sourceType } = src;
  // Scope the source list to the navbar's selected warehouse so a Sales Order
  // whose material issue was raised in another warehouse no longer shows here
  // (CP-432). `selectedWarehouseId` is set only when exactly one warehouse is
  // picked; "all"/multi leaves it undefined = no scope (unchanged).
  const { selectedWarehouseId } = useWarehouseScope();
  // Safe as an inline hook: the AsyncSelect below remounts on `sourceTypeKey`.
  const useSourceOptions = (search: string) =>
    useOutwardSourcesInfinite(sourceType.dispatchType, search, {
      readyOnly: true,
      warehouseId: selectedWarehouseId ?? undefined,
    });

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          step={1}
          title={S.dispatchInfoHeading}
          description={S.dispatchInfoDesc}
        />
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField label={S.typeLabel} required className="gap-2">
          <DispatchSourceTypeTiles value={src.sourceTypeKey} onSelect={src.selectType} />
        </FormField>

        <FormField label={S.sourceLabel} required>
          {/* Every source type feeds the same ready-only shape; only the
              dispatch_type differs, so one adapter covers them all —
              a per-type hardcoded pair silently excluded any third. */}
          <AsyncSelect<OutwardSourceOption>
            // Remount on type change: `useOptions` is called as a hook.
            key={src.sourceTypeKey}
            value={src.source}
            onValueChange={src.changeSource}
            onItemPick={(item) => src.pickSourceRow(item)}
            useOptions={useSourceOptions}
            toLabel={(o) =>
              `${o.display_number} · ${S.sourceReadyCount(o.ready_unit_count)}`
            }
            renderItem={(o) => (
              <SourceOptionTitle
                number={o.display_number}
                isRental={o.is_rental}
                aside={S.sourceReadyCount(o.ready_unit_count)}
              />
            )}
            // Who it is for; the search matches the customer's name too.
            getDescription={(o) =>
              sourceOptionDescription({
                who: o.account_name,
                partsSummary: o.parts_summary,
              })
            }
            placeholder={S.pickSourcePlaceholderFor(sourceType.label)}
            searchable
            searchPlaceholder={S.pickSourcePlaceholderFor(sourceType.label)}
          />
        </FormField>

        {/* Details about the selected source (mirrors Inward's PO box).
            Falls back to the seed-fetched row so a deep-linked source
            shows its summary without a manual re-pick. */}
        {src.summaryRow && <SourceSummary row={src.summaryRow} />}
      </CardContent>
    </Card>
  );
}
