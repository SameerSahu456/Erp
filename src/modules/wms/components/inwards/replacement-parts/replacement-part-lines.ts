// Draft-line helpers for the faulty parts of a replacement return (spec D10,
// D15). Shared by the new-inward form and the batch page's owed-parts card.
import type {
  ExpectedReturnLine,
  GrnBatchResponse,
  GrnDraftLine,
} from "../../../api";

export type OwedPart = NonNullable<
  GrnBatchResponse["expected_replacement_parts"]
>[number];

// A faulty part never had a dispatch line of its own, so its GRN line is
// sourced from the replacement line itself.
const PART_SOURCE = "replacement_request_items" as const;

export const isLineForPart = (line: GrnDraftLine, part: OwedPart): boolean =>
  line.receive?.source_type === PART_SOURCE &&
  line.receive?.source_id === part.replacement_request_item_id;

/** A part we track is received by its own unit; a described one by the IMS
 *  part the store picks for it. */
function buildPartLine(part: OwedPart, variantId: string | null): GrnDraftLine {
  return {
    receive: variantId
      ? {
          source_type: PART_SOURCE,
          source_id: part.replacement_request_item_id,
          part_variant_id: variantId,
          quantity: 1,
        }
      : {
          source_type: PART_SOURCE,
          source_id: part.replacement_request_item_id,
          units: [{ stock_item_id: part.expected_stock_item_id }],
        },
  };
}

/** The lines with this part staged (replacing any earlier staging of it). */
export const withPartStaged = (
  lines: GrnDraftLine[],
  part: OwedPart,
  variantId: string | null,
): GrnDraftLine[] => [
  ...lines.filter((l) => !isLineForPart(l, part)),
  buildPartLine(part, variantId),
];

export const withoutPart = (
  lines: GrnDraftLine[],
  part: OwedPart,
): GrnDraftLine[] => lines.filter((l) => !isLineForPart(l, part));

/** Dispatch lines of devices whose parts were raised to come in on their own.
 *  Those devices are only a fallback at inward: the part is what is expected,
 *  but the whole device may still turn up instead (spec D15). */
export function fallbackDeviceLineIds(parts: OwedPart[]): Set<string> {
  const ids = new Set<string>();
  for (const p of parts) {
    if (p.in_house_return === "part" && p.device_dispatch_request_item_id) {
      ids.add(p.device_dispatch_request_item_id);
    }
  }
  return ids;
}

/** The stock units behind those fallback device lines. */
export const fallbackStockIds = (
  lines: ExpectedReturnLine[],
  deviceLineIds: Set<string>,
) =>
  new Set(
    lines
      .filter((l) => deviceLineIds.has(l.dispatch_request_item_id))
      .map((l) => l.stock_item_id),
  );

/** The owed parts still to receive on their own: those whose whole device is
 *  coming in on these draft lines arrive inside it instead (spec D15 — the
 *  device wins), so they are not offered at all. */
export const partsStillLoose = (
  parts: OwedPart[],
  expectedLines: ExpectedReturnLine[],
  comingLines: GrnDraftLine[],
): OwedPart[] => {
  const inside = partsInsideComingDevice(parts, expectedLines, comingLines);
  return parts.filter((p) => !inside.has(p.replacement_request_item_id));
};

/** Owed parts whose device is itself coming in on these draft lines — by its
 *  own serial, or (a model we count rather than serialise) by a quantity of
 *  its model. The part then arrives inside the device, so it is not received
 *  on its own (spec D15 — the device wins). Keyed by replacement line id. */
export function partsInsideComingDevice(
  parts: OwedPart[],
  expectedLines: ExpectedReturnLine[],
  comingLines: GrnDraftLine[],
): Set<string> {
  const stockIds = new Set<string>();
  const countedModels = new Set<string>();
  for (const l of comingLines) {
    const r = l.receive;
    if (!r || r.source_type === PART_SOURCE) continue;
    for (const u of r.units ?? [])
      if (u.stock_item_id) stockIds.add(u.stock_item_id);
    if ((r.quantity ?? 0) > 0 && r.part_variant_id)
      countedModels.add(r.part_variant_id);
  }
  const deviceByLine = new Map(
    expectedLines.map((l) => [l.dispatch_request_item_id, l]),
  );
  const inside = new Set<string>();
  for (const p of parts) {
    const device = p.device_dispatch_request_item_id
      ? deviceByLine.get(p.device_dispatch_request_item_id)
      : undefined;
    if (!device) continue;
    if (
      stockIds.has(device.stock_item_id) ||
      countedModels.has(device.expected_part_variant_id)
    )
      inside.add(p.replacement_request_item_id);
  }
  return inside;
}

/** Draft lines minus any part staged on its own for these replacement lines. */
export const withoutPartLinesFor = (
  lines: GrnDraftLine[],
  itemIds: Set<string>,
) =>
  lines.filter(
    (l) =>
      !(
        l.receive?.source_type === PART_SOURCE &&
        itemIds.has(l.receive?.source_id ?? "")
      ),
  );
