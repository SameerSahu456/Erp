import { useMemo } from "react";
import { stripHtml } from "@/lib/utils";

import { useVariantsByIds } from "@modules/ims";
import { useIssuedLines, useMaterialIssueDemandLines } from "./useMaterialIssues";
import type { MaterialIssueLineResponse, WiredIssueType } from "../../api";
import { ISSUE_TYPE_META } from "../../constants/material-issue-status";
import { MATERIAL_ISSUE_STRINGS as S } from "../../components/material-issue/material-issue.strings";
import type { DemandLine } from "../../components/material-issue/material-issue-form-helpers";
import { variantNameWithCondition } from "../../components/material-issue/variant-labels";

/**
 * The outward demand behind a material issue: the source document's issuable
 * lines (sales order / demo request / replacement request), how much of each
 * has already gone out, and a variant-id → label resolver for display.
 *
 * The lines come from the WMS `/material-issues/demand` endpoint, which resolves
 * them server-side through the gate-free CRM lookup adapters — so every outward
 * role loads them with an outward-read perm, not `crm:so_read`/`crm:dr_read`
 * (which only a warehouse manager held). The endpoint already returns ONLY the
 * issuable cut (SO Approved + customer-visible; demo PM-approved; replacement
 * dispatchable), so this hook no longer re-applies those filters client-side.
 */
export function useMaterialIssueDemand(
  issueType: WiredIssueType,
  sourceEntityId: string,
  draftLines: MaterialIssueLineResponse[] | undefined,
) {
  const sourceEntityType = ISSUE_TYPE_META[issueType].sourceEntityType;

  const demandQuery = useMaterialIssueDemandLines(issueType, sourceEntityId || null);

  const issuedLinesQuery = useIssuedLines({
    source_entity_type: sourceEntityType,
    source_entity_id: sourceEntityId || undefined,
  });
  // Post-D14 a line IS one unit, so count issued rows per demand line.
  const issuedByLine = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of issuedLinesQuery.data ?? []) {
      if (!row.source_line_id) continue;
      map.set(row.source_line_id, (map.get(row.source_line_id) ?? 0) + 1);
    }
    return map;
  }, [issuedLinesQuery.data]);

  // Resolve variant ids to part names; demo / replacement / draft lines carry only the id.
  const labelVariantIds = useMemo(() => {
    const ids = new Set<string>();
    for (const l of draftLines ?? []) {
      if (l.part_variant_id) ids.add(l.part_variant_id);
    }
    for (const r of demandQuery.data ?? []) {
      if (r.original_variant_id) ids.add(r.original_variant_id);
      if (r.suggested_unit) ids.add(r.suggested_unit.part_variant_id);
    }
    return [...ids];
  }, [draftLines, demandQuery.data]);
  const variantLabelQueries = useVariantsByIds(labelVariantIds);
  const variantLabelSig = variantLabelQueries.map((q) => q.data?.id ?? "").join(",");
  const variantLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const q of variantLabelQueries) {
      const v = q.data;
      if (v) map.set(v.id, variantNameWithCondition(v));
    }
    return (id: string) => map.get(id) ?? id.slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantLabelSig]);

  const demandLines = useMemo<DemandLine[]>(() => {
    // The backend already returns ONLY the issuable cut (SO Approved +
    // customer-visible; demo PM-approved; replacement dispatchable), so no
    // client-side status filtering here. Label precedence, uniform across all
    // three source types: a sales-order line's own name (an "-" placeholder
    // means a description-based line → fall back to its stripped rich-text
    // description), else the variant's part label, else "Unnamed line".
    // Already-issued units drop off per-line via `issuedQty` → `remainingFor`.
    return (demandQuery.data ?? []).map((r) => {
      const name = (r.item_name ?? "").trim();
      const fromName = name && name !== "-" ? name : "";
      const fromDesc = !fromName && r.description ? stripHtml(r.description).trim() : "";
      const fromVariant = r.original_variant_id ? variantLabel(r.original_variant_id) : "";
      const label = fromName || fromDesc || fromVariant || S.form.lines.unnamedLine;
      const unit = r.suggested_unit;
      return {
        sourceLineId: r.source_line_id,
        originalVariantId: r.original_variant_id,
        label,
        variantLabel: fromVariant || null,
        orderedQty: r.ordered_qty,
        issuedQty: issuedByLine.get(r.source_line_id) ?? 0,
        suggestedUnit: unit
          ? {
              stockItemId: unit.stock_item_id,
              serial: unit.internal_serial,
              variantId: unit.part_variant_id,
              variantLabel: variantLabel(unit.part_variant_id),
              warehouseId: unit.warehouse_id,
              mustIssue: unit.must_issue,
            }
          : null,
      };
    });
  }, [demandQuery.data, issuedByLine, variantLabel]);

  const linesLoading = !!sourceEntityId && demandQuery.isLoading;
  const linesError = !!sourceEntityId && demandQuery.isError;

  return { demandLines, variantLabel, linesLoading, linesError };
}
