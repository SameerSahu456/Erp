import type { GrnDraftLine } from '../../../api'
import { lineUnitCount, type ManualLine } from '../inward-lines/model'
import { buildReturnLines, type ReturnState } from '../return-line-items-helpers'

// Chosen-part labels for description PO lines (they have no part name), kept for the Edit flow.
export function buildDescLabels(lines: ManualLine[]): Record<string, string> {
  const m: Record<string, string> = {}
  for (const l of lines) {
    if (l.descriptionOnly && l.variantId && l.label) m[l.variantId] = l.label
  }
  return m
}

// Off-PO items carry only a part_variant_id in the atomic line, so their
// display labels are stashed on the batch metadata for the finalize page.
export function buildOffpoLabels(lines: ManualLine[]): Record<string, string> {
  const offpoLabels: Record<string, string> = {}
  for (const l of lines) {
    if (!l.onPo && l.variantId && lineUnitCount(l) > 0) {
      offpoLabels[l.variantId] = l.label || l.partNumber || l.variantId
    }
  }
  return offpoLabels
}

/** A faulty part owed back on a replacement return. It has its own editor
 *  (the owed-parts list) and must never be loaded as a returning unit. */
export const isReplacementPartLine = (line: GrnDraftLine): boolean =>
  line.receive?.source_type === 'replacement_request_items'

/** Every staged line of a return: the returning units, then the faulty parts. */
export const buildReturnPayload = (
  returnState: ReturnState,
  partLines: GrnDraftLine[],
): GrnDraftLine[] => [...buildReturnLines(returnState), ...partLines]

/** The draft batch metadata the edit flow reads back. */
export type InwardEditMeta = {
  _atomic_lines?: GrnDraftLine[]
  offpo_labels?: Record<string, string>
  // Chosen-part labels for description PO lines, restored on edit.
  desc_labels?: Record<string, string>
  origin?: 'new' | 'refurbished'
}
