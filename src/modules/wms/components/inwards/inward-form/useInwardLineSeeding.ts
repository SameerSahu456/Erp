import { useState } from 'react'

import type { ExpectedReturnLine, POExpectedLine } from '../../../api'
import { buildPoLines } from './buildPoLines'
import { makeDescLine, type ManualLine } from '../inward-lines/model'
import { hydratePoLines } from '../inward-lines/hydrate'
import { hydrateReturnState } from '../return-line-items-helpers'
import { buildReturnPayload } from './inward-form-helpers'
import type { InwardFormFields } from './useInwardFormFields'

type SeedingArgs = Pick<
  InwardFormFields,
  | 'isEdit'
  | 'editMeta'
  | 'editAtomic'
  | 'poId'
  | 'lines'
  | 'setLines'
  | 'returnState'
  | 'setReturnState'
  | 'partLines'
> & {
  isReturn: boolean
  isManual: boolean
  detailLoading: boolean
  receivableLines: POExpectedLine[]
  returnLines: ExpectedReturnLine[]
}

/** Rebuild the line editors from the draft's staged lines (edit mode). */
function hydrateFromDraft(a: SeedingArgs) {
  if (a.isReturn) {
    a.setReturnState(hydrateReturnState(a.editAtomic, a.returnLines))
    return
  }
  a.setLines(
    hydratePoLines(a.editAtomic, a.receivableLines, a.editMeta?.offpo_labels, a.editMeta?.desc_labels),
  )
}

/** Create flow, PO capture, detail loaded and this PO not yet seeded. */
const needsDescSeed = (a: SeedingArgs, descSeededPo: string | null) =>
  !a.isEdit && !a.isReturn && !a.isManual && !a.detailLoading && !!a.poId && descSeededPo !== a.poId

const descSeeds = (receivableLines: POExpectedLine[]) =>
  receivableLines
    .filter((l) => !l.part_variant_id && l.source_line_entity_id)
    .map((l) =>
      makeDescLine({
        sourceId: l.source_line_entity_id as string,
        description: l.description ?? '',
        pending: l.pending_quantity ?? 0,
      }),
    )

// Keep any rows the operator already added (part-number / off-PO), then append
// the description seeds. Avoid duplicating a source_id already seeded.
function appendDescSeeds(prev: ManualLine[], seeds: ManualLine[]): ManualLine[] {
  const seededSources = new Set(prev.filter((p) => p.descriptionOnly).map((p) => p.sourceId))
  const fresh = seeds.filter((s) => !seededSources.has(s.sourceId))
  return fresh.length ? [...prev, ...fresh] : prev
}

/** Render-phase seeding of the line editors (edit hydration + description-line seed).
 *  Returns the edit baseline snapshot, or null. */
export function useInwardLineSeeding(args: SeedingArgs): string | null {
  const { isEdit, poId, lines, setLines, returnState, isReturn, isManual, detailLoading } = args

  // Edit-mode dirty tracking. `editBaseline` is the draft's line payload snapshot,
  // taken once hydration lands (below).
  const [editBaseline, setEditBaseline] = useState<string | null>(null)

  // Edit mode: rebuild lines from the draft once, after the source lines load.
  // Render-phase, not an effect (React 19 set-state-in-effect).
  const [hydrated, setHydrated] = useState(false)
  if (isEdit && !hydrated && (isManual || !detailLoading)) {
    if (!isManual) hydrateFromDraft(args)
    setHydrated(true)
  }

  // Snapshot after hydration so dirty tracking ignores the initial load.
  if (isEdit && hydrated && editBaseline === null) {
    setEditBaseline(
      JSON.stringify(
        isReturn ? buildReturnPayload(returnState, args.partLines) : buildPoLines(lines),
      ),
    )
  }

  // Create flow: seed one row per description PO line, once per PO.
  // Render-phase, not an effect (React 19 set-state-in-effect).
  const [descSeededPo, setDescSeededPo] = useState<string | null>(null)
  if (needsDescSeed(args, descSeededPo)) {
    setDescSeededPo(poId)
    const seeds = descSeeds(args.receivableLines)
    if (seeds.length > 0) setLines((prev) => appendDescSeeds(prev, seeds))
  }

  return editBaseline
}
