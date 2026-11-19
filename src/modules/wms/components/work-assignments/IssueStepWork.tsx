/**
 * Choose the work: optionally a GRN, then a part.
 *
 * Two dropdowns, in the order the floor thinks — a storeman stands at one
 * pallet from one GRN and issues one part code at a time.
 *
 * **The GRN is a FILTER, not a required step** (unification spec U10b). It was
 * mandatory while the picker only served inspection, where devices arrive by
 * the container. Downstream that made the page unusable: a repair op is spawned
 * by a failed inspection, so before U10a it carried no GRN at all and every
 * device past inward collapsed into one bucket.
 *
 * What protects the labelling risk the mandatory field used to mask: the
 * eligibility query orders by (source_grn_batch_id, internal_serial), so a
 * quantity-first take stays inside one receipt by construction (U11). The
 * pallet warning is still shown, because it is still true.
 */
import { AsyncSelect } from '@/components/ui/async-select'
import { CategoryPicker } from '@/components/common/pickers/CategoryPicker'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { formatIST_date } from '@shared/lib/date'

import type { EligibleGrnGroup } from '../../api/work-assignments'
import { useIssueStepWork } from '../../hooks/work-assignments/useIssueStepWork'

import { ALL_PARTS, type GrnRow, type PartRow } from './issue-step-work-helpers'
import { WORK_ASSIGNMENT_STRINGS as S } from './work-assignments.strings'

export interface WorkSelection {
  grnBatchId: string | null
  /** NULL means the whole GRN — every part waiting on it. */
  partVariantId: string | null
  available: number
}

interface IssueStepWorkProps {
  groups: EligibleGrnGroup[]
  selected: WorkSelection | null
  onSelect: (selection: WorkSelection) => void
  /** Category filter, applied AFTER the GRN: pick the pallet, then narrow to
   *  what you are looking at within it. Null = every category. */
  categoryId: string | null
  onCategoryChange: (categoryId: string | null) => void
}

export function IssueStepWork({
  groups,
  selected,
  onSelect,
  categoryId,
  onCategoryChange,
}: IssueStepWorkProps) {
  const {
    group,
    grnValue,
    grnLabel,
    totalWaiting,
    scopeCount,
    partLabelText,
    useGrnOptions,
    usePartOptions,
  } = useIssueStepWork(groups, selected)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* FIRST now: narrow to the category you're looking at, then pick the GRN
          within it. Optional — it filters the summary (re-fetched per category,
          previous groups held on screen while it reloads), so leaving it at
          "All categories" lists every receipt, exactly as before. */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wa-category">{S.issue.category}</Label>
        <CategoryPicker
          id="wa-category"
          value={categoryId}
          onChange={(id) => onCategoryChange(id || null)}
          placeholder={S.issue.categoryPlaceholder}
          allowAll
          shape="short"
          isActive
          className="w-full"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {/* No longer `required` (U10b) — "All GRNs" is a valid, and now the
            default, answer. */}
        <Label htmlFor="wa-grn">{S.issue.grn}</Label>
        <AsyncSelect<GrnRow>
          id="wa-grn"
          value={grnValue && grnLabel ? { id: grnValue, label: grnLabel } : null}
          // Defaults to the whole GRN — the common case is "this pallet", and
          // narrowing to one part is the exception. The pick needs the whole
          // row (to seed the available count), so the work is in onItemPick;
          // `value` is parent-controlled, so onValueChange is a no-op.
          onValueChange={() => {}}
          onItemPick={(row) =>
            onSelect({
              // NULL on the "All GRNs" row, which the parent maps to an omitted
              // grn_batch_id — i.e. no server-side filter at all.
              grnBatchId: row.group?.grn_batch_id ?? null,
              partVariantId: null,
              available: row.group?.pending_count ?? totalWaiting,
            })
          }
          useOptions={useGrnOptions}
          toLabel={(r) => r.label}
          renderItem={(r) => (
            // The "All GRNs" row has no receipt date — it is not a receipt.
            <span className="block truncate">
              {r.group ? `${r.label} · ${formatIST_date(r.group.received_at)}` : r.label}
            </span>
          )}
          placeholder={S.issue.grnPlaceholder}
          searchPlaceholder={S.issue.grnPlaceholder}
          clearable={false}
          className="w-full"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wa-part" required>
          {S.issue.part}
        </Label>
        <AsyncSelect<PartRow>
          id="wa-part"
          disabled={!selected}
          value={partLabelText ? { id: selected?.partVariantId ?? ALL_PARTS, label: partLabelText } : null}
          onValueChange={() => {}}
          onItemPick={(row) => {
            if (!selected) return
            onSelect({
              grnBatchId: group?.grn_batch_id ?? null,
              partVariantId: row.line ? row.line.part_variant_id : null,
              available: row.line ? row.line.pending_count : (scopeCount ?? 0),
            })
          }}
          useOptions={usePartOptions}
          toLabel={(r) => r.label}
          placeholder={S.issue.partPlaceholder}
          searchPlaceholder={S.issue.partPlaceholder}
          clearable={false}
          className="w-full"
        />
        {!selected ? (
          <Typography variant="helper" tone="muted">
            {S.issue.pickScopeFirst}
          </Typography>
        ) : null}
      </div>
    </div>
  )
}
