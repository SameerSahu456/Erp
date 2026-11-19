import type {
  DeviceSummary,
  ExpectedReturnLine,
  GrnBatchResponse,
  GrnDraftLine,
  POExpectedLine,
} from "../../api";
import { INWARDS_STRINGS } from "./inwards.strings";

export type GrnLine = NonNullable<GrnBatchResponse["lines"]>[number];

// Non-null `workflow_status` literals a device can carry.
type DeviceWorkflowStatus = NonNullable<DeviceSummary["workflow_status"]>;

// Pipeline stages at which a received unit still has a physical presence in
// the warehouse, so it can be given / moved to a location. Racked & sellable
// units are caught by the `available` status branch in `isLocationAssignable`;
// dispatch, return, vendor-custody and terminal states (consumed / disposed /
// issued / in_transit, plus `inspected` / `awaiting_rack` which are transient
// hand-offs) are deliberately excluded — those units aren't on a shelf here to
// place.
const LOCATION_ASSIGNABLE_WORKFLOW_STATUSES = new Set<DeviceWorkflowStatus>([
  "pending_inspection",
  "under_inspection",
  "in_repair",
  "waiting_for_spares",
  "pending_qc",
  "under_qc",
]);

/** Can this unit be given / moved to a warehouse location right now?
 *
 *  GRN "Assign Location" opens the same physical relocate the device page's
 *  Move Stock uses, so the picker must not offer units that have left the
 *  building. A unit qualifies when it is `available` (racked, sellable) OR it
 *  sits at a refurbishment stage that keeps it physically on site. Units out
 *  for dispatch / return, at a vendor, or consumed / disposed are excluded.
 *  FE-only gate — the backend relocate still enforces its own rack_assign
 *  authority; this only stops the list offering ineligible units. */
export function isLocationAssignable(
  device: Pick<DeviceSummary, "status" | "workflow_status">,
): boolean {
  if (device.status === "available") return true;
  // A condemned unit is still physically on site and still needs a shelf —
  // scrap deliberately leaves it unplaced (device-scrap D3), so it is exactly
  // the population that needs assigning. It carries NO workflow_status, so the
  // stage branch below would never catch it.
  if (device.status === "scrapped") return true;
  return (
    device.workflow_status != null &&
    LOCATION_ASSIGNABLE_WORKFLOW_STATUSES.has(device.workflow_status)
  );
}

// A one-line plain-text preview of a rich-text description — for the collapsed
// accordion trigger (the full styled description renders inside, via RichTextView).
// Uses the DOM so tags are stripped AND every HTML entity is decoded (—, ×, “”…).
export function descPreview(html: string): string {
  if (typeof document === "undefined") {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

// An open/cancelled GRN's staged receive lines live on its metadata until
// finalize. Join them with the PO expected lines to show what will be received:
// part number, variant name, manufacturer serial (from the staged units), qty.
export type StagedRow = {
  partNumber: string;
  variantName: string;
  serial: string;
  qty: number;
};

export type StagedMeta = {
  _atomic_lines?: GrnDraftLine[];
  // Display labels for off-PO "unexpected" items, stashed at create (the
  // atomic line only carries part_variant_id, no name).
  offpo_labels?: Record<string, string>;
  // Chosen-part labels for description-based PO lines, keyed by the picked
  // variant id (the PO line is free text, so it carries no part name).
  desc_labels?: Record<string, string>;
};

type StagedReceive = NonNullable<
  NonNullable<StagedMeta["_atomic_lines"]>[number]["receive"]
>;
type VariantInfo = { name: string; sku_code: string } | undefined;

/** Normalised view of a batch's staged metadata + PO expected lines. */
function readStaged(batch: GrnBatchResponse | undefined) {
  const meta = batch?.metadata as StagedMeta | null | undefined;
  return {
    atomic: meta?._atomic_lines ?? [],
    offpoLabels: meta?.offpo_labels ?? {},
    descLabels: meta?.desc_labels ?? {},
    expected: (batch?.expected_lines ?? []) as POExpectedLine[],
  };
}

/** part_variant_ids whose display name can't be resolved from the batch payload
 *  alone — off-PO staged items (no source_id) and description-line chosen parts
 *  (the PO line is free text) — AND whose label wasn't stashed on metadata. Only
 *  these need a live variant lookup; a well-formed batch (labels stashed at
 *  create) returns [] here, so the detail page fires no extra /variants calls. */
export function unnamedVariantIds(
  batch: GrnBatchResponse | undefined,
): string[] {
  const { atomic, offpoLabels, descLabels, expected } = readStaged(batch);
  const namedBySource = new Map(
    expected.map((e) => [
      e.source_line_entity_id,
      Boolean(e.part_name ?? e.variant_name),
    ]),
  );
  const ids = new Set<string>();
  for (const al of atomic) {
    const pvid = al.receive?.part_variant_id;
    if (!pvid) continue;
    const sid = al.receive?.source_id;
    // off-PO item, or description-line chosen part — label not stashed
    const unnamed = sid
      ? !namedBySource.get(sid) && !descLabels[pvid]
      : !offpoLabels[pvid];
    if (unnamed) ids.add(pvid);
  }
  return [...ids];
}

// Tracked units carry a serial each; non-tracked lines have a quantity and no
// serials. A unit staged by id alone (a returning device, a faulty part) takes
// its serial from what the source expects. Join (usually just one) or em-dash.
function stagedQtySerial(
  receive: StagedReceive | undefined,
  serialByStock: Map<string, string>,
) {
  const units = receive?.units ?? [];
  const qty = units.length || receive?.quantity || 0;
  const serial =
    units
      .map(
        (u) =>
          (u?.manufacturer_serial ?? "").trim() ||
          serialByStock.get(u?.stock_item_id ?? "") ||
          "",
      )
      .filter(Boolean)
      .join(", ") || "—";
  return { qty, serial };
}

type OwedPart = NonNullable<
  GrnBatchResponse["expected_replacement_parts"]
>[number];

/** Serials of the units a return batch expects — its devices and its faulty
 *  parts — keyed by stock item. */
function expectedSerials(batch: GrnBatchResponse): Map<string, string> {
  const m = new Map<string, string>();
  for (const l of (batch.expected_lines ?? []) as ExpectedReturnLine[]) {
    if (l.stock_item_id)
      m.set(l.stock_item_id, l.manufacturer_serial || l.internal_serial);
  }
  for (const p of batch.expected_replacement_parts ?? []) {
    const serial = p.manufacturer_serial || p.internal_serial;
    if (p.expected_stock_item_id && serial)
      m.set(p.expected_stock_item_id, serial);
  }
  return m;
}

// A faulty part staged against its replacement line — named from the request.
const faultyPartNames = (part: OwedPart, info: VariantInfo) => ({
  partNumber: part.part_number || info?.sku_code || "—",
  variantName: INWARDS_STRINGS.batchDevices.faultyPartLine(
    part.part_name ||
      part.description ||
      info?.name ||
      INWARDS_STRINGS.replacementParts.describedFallback,
  ),
});

// Return batches: staged lines are dispatched units coming back (no PO).
const returnNames = (info: VariantInfo) => ({
  partNumber: info?.sku_code || "—",
  variantName: info?.name || INWARDS_STRINGS.batchDevices.fallbackReturningUnit,
});

// On-PO line — a description-based (free-text) PO line has no part of its own,
// so its chosen-part label was stashed in desc_labels (or resolved live).
const onPoNames = (
  exp: POExpectedLine | undefined,
  info: VariantInfo,
  descLabel: string | undefined,
) => ({
  partNumber: exp?.part_number || info?.sku_code || "—",
  variantName:
    exp?.variant_name ||
    descLabel ||
    info?.name ||
    INWARDS_STRINGS.batchDevices.fallbackPendingLine,
});

// Off-PO unexpected item — the live variant or the label stashed at create.
const offPoNames = (info: VariantInfo, offpoLabel: string | undefined) => ({
  partNumber: info?.sku_code || "—",
  variantName:
    info?.name || offpoLabel || INWARDS_STRINGS.batchDevices.fallbackOffPoItem,
});

export function extractStagedLines(
  batch: GrnBatchResponse,
  variantInfoById: Record<string, { name: string; sku_code: string }>,
  isReturnBatch: boolean,
): StagedRow[] {
  const { atomic, offpoLabels, descLabels, expected } = readStaged(batch);
  const serialByStock = expectedSerials(batch);
  const owedById = new Map(
    (batch.expected_replacement_parts ?? []).map((p) => [
      p.replacement_request_item_id,
      p,
    ]),
  );
  return atomic.map((al) => {
    const sid = al.receive?.source_id ?? "";
    const pvid = al.receive?.part_variant_id ?? "";
    const info = variantInfoById[pvid];
    const owed =
      al.receive?.source_type === "replacement_request_items"
        ? owedById.get(sid)
        : undefined;
    const names = owed
      ? faultyPartNames(owed, info)
      : isReturnBatch
        ? returnNames(info)
        : sid
          ? onPoNames(
              expected.find((e) => e.source_line_entity_id === sid),
              info,
              descLabels[pvid],
            )
          : offPoNames(info, offpoLabels[pvid]);
    return { ...names, ...stagedQtySerial(al.receive, serialByStock) };
  });
}
