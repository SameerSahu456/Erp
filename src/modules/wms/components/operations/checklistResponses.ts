import type { ChecklistItem, ChecklistResponseLine } from '../../api'

/** The typed answer for one item, by kind. The shape mirrors the backend
 *  `ChecklistAnswerValue` union (boolean → bool · text/select → string ·
 *  numeric → number · multi_select/photo → string[]). A per-item `notes` rides
 *  alongside (surfaced for failed pass/fail items, optional elsewhere). */
export type ChecklistAnswer = {
  value?: boolean | number | string | string[]
  notes?: string
  /** Evidence photos for a Pass/Fail item answered Fail. BUFFERED File objects,
   *  NOT uploaded until the stage is completed — so a cancelled/reopened dialog
   *  shows none (nothing hit the API while editing). */
  photos?: File[]
}
export type ChecklistResponses = Record<string, ChecklistAnswer>

/** Whether an answer value carries real input, by kind. */
function answerHasValue(v: ChecklistAnswer['value']): boolean {
  if (typeof v === 'string') return v.trim().length > 0
  if (typeof v === 'number') return !Number.isNaN(v)
  if (typeof v === 'boolean') return v
  if (Array.isArray(v)) return v.length > 0
  return v != null
}

/** True only when the operator has entered at least one MEANINGFUL answer.
 *
 *  A `photo` item reports its (server-derived) attachment id list up to the
 *  form on mount via ChecklistPhotoField's sync effect — and it reports an
 *  empty `[]` when there are no photos yet. That seeds a `{ value: [] }` entry
 *  the operator never touched, so a plain `Object.keys(responses).length > 0`
 *  reads a pristine form as dirty and the close guard prompts for nothing.
 *  This ignores those no-op entries: an empty string / empty array / nullish
 *  value / `false` toggle with blank notes does not count as input. */
export function hasChecklistInput(responses: ChecklistResponses): boolean {
  return Object.values(responses).some((ans) => {
    if (!ans) return false
    return answerHasValue(ans.value) || (ans.notes ?? '').trim().length > 0
  })
}

// Canonical Pass / Fail / N/A options (exact author casing). Any select whose
// options match this triplet renders as the familiar 3-button control.
export const PASS_FAIL_NA = ['Pass', 'Fail', 'N/A']

export const isCanonicalPassFailNa = (item: ChecklistItem): boolean =>
  item.kind === 'select' &&
  (item.options?.length ?? 0) === 3 &&
  PASS_FAIL_NA.every((o, i) => item.options?.[i] === o)

/** Mirrors the backend's evaluatable-item rule (`_is_evaluatable_select_item`):
 *  explicit `pass_fail_na` always counts, explicit `informational` never does,
 *  and an item predating the field falls back to the canonical
 *  Pass/Fail(/N-A) select heuristic. */
const VERDICT_OPTION_SETS = [
  ['fail', 'pass'],
  ['fail', 'n/a', 'pass'],
  ['fail', 'na', 'pass'],
]

export function isVerdictItem(item: ChecklistItem): boolean {
  if (item.evaluation_mode === 'pass_fail_na') return true
  if (item.evaluation_mode === 'informational') return false
  if (item.kind !== 'select') return false
  const opts = (item.options ?? []).map((o) => o.trim().toLowerCase()).sort()
  return VERDICT_OPTION_SETS.some(
    (set) => set.length === opts.length && set.every((o, i) => o === opts[i]),
  )
}

/** True when the checklist can decide pass/fail on its own (≥1 verdict item).
 *  When false — evidence-only checklist or no checklist — the operator's
 *  explicit Pass/Fail is required; the backend 422s without it. */
export const checklistDecidesVerdict = (items: ChecklistItem[]): boolean =>
  items.some(isVerdictItem)

/** The pass/fail a verdict-carrying checklist PROJECTS from its current answers,
 *  or null when it can't decide yet (no verdict item, or one is unanswered).
 *  Any verdict item answered `fail` ⇒ overall `fail`; all answered non-fail ⇒
 *  `pass`. Callers use this to decide whether a grade applies (grades are
 *  pass-only) instead of assuming pass just because the checklist *can* decide. */
export function projectedChecklistVerdict(
  items: ChecklistItem[],
  value: ChecklistResponses,
): 'pass' | 'fail' | null {
  const verdictItems = items.filter(isVerdictItem)
  if (verdictItems.length === 0) return null
  let allAnswered = true
  for (const item of verdictItems) {
    const raw = value[item.key]?.value
    const ans = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    if (!ans) {
      allAnswered = false
      continue
    }
    if (ans === 'fail') return 'fail'
  }
  return allAnswered ? 'pass' : null
}

/** True when a single item has a non-empty answer for its kind. */
export function isItemAnswered(item: ChecklistItem, ans: ChecklistAnswer | undefined): boolean {
  const v = ans?.value
  switch (item.kind) {
    case 'boolean':
      return typeof v === 'boolean'
    case 'numeric':
      return typeof v === 'number' && !Number.isNaN(v)
    case 'text':
    case 'select':
      return typeof v === 'string' && v.trim() !== ''
    case 'multi_select':
    case 'photo':
      return Array.isArray(v) && v.length > 0
    default:
      return v != null
  }
}

/** True when every required item has an answer for its kind. */
export function allRequiredAnswered(items: ChecklistItem[], value: ChecklistResponses): boolean {
  return items.filter((i) => i.required).every((i) => isItemAnswered(i, value[i.key]))
}

/** Map the collected responses into the backend submit shape. Items with no
 *  answer are skipped (the backend re-checks required-presence). `photoIds` is
 *  the {itemKey: attachment ids} map produced by uploading the buffered fail
 *  photos on Complete (see `collectFailPhotoIds`). */
export function toResponseLines(
  items: ChecklistItem[],
  value: ChecklistResponses,
  photoIds: Record<string, string[]> = {},
): ChecklistResponseLine[] {
  return items
    .filter((item) => isItemAnswered(item, value[item.key]))
    .map((item) => {
      const ans = value[item.key]
      const notes = ans?.notes?.trim() ? ans.notes.trim() : null
      const photos = photoIds[item.key]?.length ? photoIds[item.key] : null
      return { item_id: item.key, response: ans?.value ?? null, notes, photos }
    })
}

/** Upload each failed item's buffered evidence photos (on Complete) and return
 *  a {itemKey: attachment ids} map for the submit payload. Nothing is uploaded
 *  while the form is edited, so a cancelled dialog leaves no orphan attachments.
 *  `uploadOnce(documentType, file)` resolves to the new attachment's id; pass
 *  one built from the dialog's once-steps (dedup) + upload mutation. */
export async function collectFailPhotoIds(
  items: ChecklistItem[],
  value: ChecklistResponses,
  uploadOnce: (documentType: string, file: File) => Promise<string>,
): Promise<Record<string, string[]>> {
  const map: Record<string, string[]> = {}
  for (const item of items) {
    const files = value[item.key]?.photos
    if (!files?.length) continue
    const ids: string[] = []
    for (const file of files) ids.push(await uploadOnce(`checklist_${item.key}`, file))
    map[item.key] = ids
  }
  return map
}
