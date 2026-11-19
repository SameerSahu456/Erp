import type {
  GrnBatchResponse,
  GrnBatchStatus,
  InwardType,
  POExpectedLine,
} from "../../../api";
import { paginateEmbedded } from "@/shared/hooks/useClientPager";

import { INWARDS_STRINGS } from "../inwards.strings";
import {
  extractStagedLines,
  type GrnLine,
  type StagedRow,
} from "../batch-devices-helpers";

/** Which identity-correction dialog is open, and for which unit. ONE dialog
 *  instance per kind serves the whole table (see CorrectionDialogs). */
export type UnitCorrection = {
  kind: "serial" | "reidentify" | "relink";
  deviceId: string;
  currentSerial: string | null;
  poItemId: string | null;
};

/** The device a correction dialog of `kind` should open for, else null (closed). */
export const correctionDeviceFor = (
  c: UnitCorrection | null,
  kind: UnitCorrection["kind"],
): string | null => (c?.kind === kind ? c.deviceId : null);

// Received units grouped per PO description line, or per parent part for catalog lines.
export type ReceivedGroup = {
  key: string;
  label: string;
  isDescription: boolean;
  lines: GrnLine[];
};

/** Search filter over the received (finalized) lines — serials + part name/sku. */
export function filterReceivedLines(lines: GrnLine[], search: string): GrnLine[] {
  const q = search.trim().toLowerCase();
  if (!q) return lines;
  return lines.filter((l) =>
    [
      l.internal_serial,
      // A held box brought into stock got a fresh barcode of its own.
      l.stock_internal_serial,
      l.manufacturer_serial,
      l.part_variant?.part_name,
      l.part_variant?.sku_code,
    ]
      .filter((v): v is string => Boolean(v))
      .some((v) => v.toLowerCase().includes(q)),
  );
}

// PO lines by source id, to tell description (free-text) lines from catalog lines.
// Return batches have no description lines.
function expectedBySource(batch: GrnBatchResponse, isReturnBatch: boolean) {
  const expBySource = new Map<string, POExpectedLine>();
  if (isReturnBatch) return expBySource;
  for (const e of (batch.expected_lines ?? []) as POExpectedLine[]) {
    if (e.source_line_entity_id) expBySource.set(e.source_line_entity_id, e);
  }
  return expBySource;
}

function partGroupKeyLabel(l: GrnLine) {
  const pv = l.part_variant;
  return {
    key: `part:${pv?.part_id ?? pv?.part_name ?? pv?.sku_code ?? "unknown"}`,
    label:
      pv?.part_name ??
      pv?.sku_code ??
      INWARDS_STRINGS.batchDevices.fallbackUnknownPart,
  };
}

function groupKeyLabel(l: GrnLine, exp: POExpectedLine | undefined) {
  const isDescription = Boolean(exp && !exp.part_variant_id);
  if (!isDescription) return { isDescription, ...partGroupKeyLabel(l) };
  return {
    isDescription,
    key: `desc:${l.source_line_entity_id}`,
    label:
      exp?.description || INWARDS_STRINGS.batchDevices.fallbackDescriptionLine,
  };
}

export function groupReceivedLines(
  pagedLines: GrnLine[],
  batch: GrnBatchResponse,
  isReturnBatch: boolean,
): ReceivedGroup[] {
  const expBySource = expectedBySource(batch, isReturnBatch);
  const receivedGroups: ReceivedGroup[] = [];
  const groupByKey = new Map<string, ReceivedGroup>();
  for (const l of pagedLines) {
    const exp = l.source_line_entity_id
      ? expBySource.get(l.source_line_entity_id)
      : undefined;
    const { key, label, isDescription } = groupKeyLabel(l, exp);
    let g = groupByKey.get(key);
    if (!g) {
      g = { key, label, isDescription, lines: [] };
      groupByKey.set(key, g);
      receivedGroups.push(g);
    }
    g.lines.push(l);
  }
  return receivedGroups;
}

function filterStagedRows(rows: StagedRow[], searchQuery: string): StagedRow[] {
  return searchQuery
    ? rows.filter((r) =>
        [r.partNumber, r.variantName, r.serial].some((v) =>
          v.toLowerCase().includes(searchQuery),
        ),
      )
    : rows;
}

/** Pure derivation of everything the batch page shows from a loaded batch. */
export function deriveBatchView(args: {
  batch: GrnBatchResponse;
  lines: GrnLine[];
  filteredLines: GrnLine[];
  variantInfoById: Record<string, { name: string; sku_code: string }>;
  unitSearch: string;
  receivedPage: number;
  stagedPage: number;
  pageSize: number;
}) {
  const { batch, lines, filteredLines, variantInfoById, unitSearch } = args;
  const inwardType = batch.inward_type as InwardType;
  const status = batch.status as GrnBatchStatus;
  const isOpen = status === "open";
  const isReturnBatch = inwardType !== "purchase_order";
  const searchQuery = unitSearch.trim().toLowerCase();

  // Lines are embedded whole in the response (no paged endpoint), so page a clamped slice.
  const received = paginateEmbedded(filteredLines, args.receivedPage, args.pageSize);
  const receivedGroups = groupReceivedLines(received.pageItems, batch, isReturnBatch);

  // ── Staged lines (from batch metadata) — drive the line-items table whenever
  //    the batch has no finalized units yet, i.e. DRAFT and CANCELLED. ──
  const allStagedLines =
    lines.length === 0
      ? extractStagedLines(batch, variantInfoById, isReturnBatch)
      : [];
  const stagedLines = filterStagedRows(allStagedLines, searchQuery);
  // Finalize actions gate on the full (unfiltered) staged count.
  const stagedTotal = allStagedLines.reduce((sum, r) => sum + r.qty, 0);
  const hasStaged = allStagedLines.length > 0;
  const staged = paginateEmbedded(stagedLines, args.stagedPage, args.pageSize);

  return {
    batch,
    inwardType,
    status,
    isOpen,
    receivedPageCount: received.totalPages,
    receivedPageSafe: received.page,
    receivedGroups,
    stagedLines,
    pagedStagedLines: staged.pageItems,
    stagedTotal,
    hasStaged,
    stagedPageCount: staged.totalPages,
    stagedPageSafe: staged.page,
  };
}

export type BatchDerivedView = ReturnType<typeof deriveBatchView>;
