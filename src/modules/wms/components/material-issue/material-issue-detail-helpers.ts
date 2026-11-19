import type {
  MaterialIssueLineResponse,
  MaterialIssuePullOutUnit,
  MaterialIssueResponse,
  MaterialIssueStage,
  MaterialIssueStatus,
  WarehouseLocationTreeNode,
} from "../../api";
import {
  MATERIAL_ISSUE_STAGE_LABELS,
  MATERIAL_ISSUE_STAGE_VARIANT,
  MATERIAL_ISSUE_STATUS_LABELS,
  getMaterialIssueStatusVariant,
} from "../../constants/material-issue-status";
import type { LocationParts } from "./removedComponents";

const DASH = "—";
// A short id prefix shown when a label could not be resolved.
const SHORT_ID_CHARS = 8;
const shortId = (id: string) => id.slice(0, SHORT_ID_CHARS);

export interface LineLabels {
  variant: (id: string) => string;
  variantName: (id: string) => string;
  variantSku: (id: string) => string;
  serial: (id: string) => string;
}

/**
 * Build the deep link to the dispatch-create wizard pre-filled with a Material
 * Issue's source document. The wizard reads `source_entity_type` +
 * `source_entity_id` to seed its source picker (and the optional `source_label`
 * to show the code without a lookup). Used by the "Send to Dispatch" shortcut on
 * the MI detail page and worklist row menu.
 */
export function dispatchCreateHref(args: {
  sourceEntityType: string | null | undefined;
  sourceEntityId: string | null | undefined;
  sourceLabel?: string | null;
}): string {
  const params = new URLSearchParams();
  if (args.sourceEntityType) params.set("source_entity_type", args.sourceEntityType);
  if (args.sourceEntityId) params.set("source_entity_id", args.sourceEntityId);
  if (args.sourceLabel) params.set("source_label", args.sourceLabel);
  const qs = params.toString();
  return qs ? `/wms/dispatches/new?${qs}` : "/wms/dispatches/new";
}

/** { code, href } for the MI's source document; replacement has no route yet. Null if unresolved. */
export function sourceDocLink(
  mi: Pick<MaterialIssueResponse, "source_document_label" | "source_entity_type" | "source_entity_id">,
): { code: string; href: string | null } | null {
  const code = mi.source_document_label;
  if (!code) return null;
  switch (mi.source_entity_type) {
    case "sales_orders":
      return { code, href: `/crm/sales-orders/${mi.source_entity_id}` };
    case "demo_requests":
      return { code, href: `/crm/demo-requests/${mi.source_entity_id}` };
    default:
      return { code, href: null };
  }
}

/** Resolve a destination id to { location, rack, bin }; a direct-storage rack is itself a leaf. */
export function buildLocationResolver(
  tree: WarehouseLocationTreeNode[] | undefined,
): (locId: string | null) => LocationParts {
  const map = new Map<string, LocationParts>();
  for (const rack of tree ?? []) {
    if (rack.can_store_stock) {
      map.set(rack.id, { location: rack.name, rack: rack.name, bin: DASH });
    }
    for (const bin of rack.children ?? []) {
      map.set(bin.id, { location: `${rack.name} · ${bin.name}`, rack: rack.name, bin: bin.name });
    }
  }
  return (locId) => {
    if (!locId) return { location: DASH, rack: DASH, bin: DASH };
    return map.get(locId) ?? { location: shortId(locId), rack: DASH, bin: DASH };
  };
}

/** Variant + serial labels from the MI's denormalized lines — no extra fetch. */
export function buildLineLabels(
  lines: MaterialIssueLineResponse[],
  pullOuts: MaterialIssuePullOutUnit[],
): LineLabels {
  const variantMap = new Map<string, { name: string; sku: string }>();
  const serialMap = new Map<string, string>();
  const putVariant = (id: string, sku?: string | null, name?: string | null) => {
    variantMap.set(id, { name: name || sku || shortId(id), sku: sku || name || shortId(id) });
  };
  const walk = (l: MaterialIssueLineResponse) => {
    putVariant(l.part_variant_id, l.part_variant_sku, l.part_variant_name);
    if (l.stock_item_id && l.serial) serialMap.set(l.stock_item_id, l.serial);
    for (const c of l.components ?? []) walk(c);
  };
  lines.forEach(walk);
  for (const p of pullOuts) putVariant(p.part_variant_id, p.part_variant_sku, p.part_variant_name);
  return {
    // `variant` keeps its sku-first output (used by the components list).
    variant: (id) => variantMap.get(id)?.sku ?? shortId(id),
    // The line card's bold title is the variant name; the SKU is the small line under it.
    variantName: (id) => variantMap.get(id)?.name ?? shortId(id),
    variantSku: (id) => variantMap.get(id)?.sku ?? shortId(id),
    serial: (id) => serialMap.get(id) ?? shortId(id),
  };
}

/** Header badge: stored status stops at `issued`, so roll up a shared stage from the primary units. */
export function materialIssueHeaderBadge(
  status: MaterialIssueStatus,
  primaryLines: MaterialIssueLineResponse[],
) {
  if (status !== "issued") {
    return {
      label: MATERIAL_ISSUE_STATUS_LABELS[status] ?? status,
      variant: getMaterialIssueStatusVariant(status),
    };
  }
  const stages = new Set(primaryLines.map((l) => l.stage));
  if (stages.size === 1) {
    const stage = [...stages][0] as MaterialIssueStage;
    return {
      label: MATERIAL_ISSUE_STAGE_LABELS[stage] ?? stage,
      variant: MATERIAL_ISSUE_STAGE_VARIANT[stage] ?? "neutral",
    };
  }
  return {
    label: MATERIAL_ISSUE_STATUS_LABELS.issued,
    variant: getMaterialIssueStatusVariant("issued"),
  };
}
