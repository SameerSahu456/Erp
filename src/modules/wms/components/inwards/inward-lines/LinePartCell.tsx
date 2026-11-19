import { Typography } from '@/components/ui/typography'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { AsyncSelect, type AsyncQueryShape } from '@/components/ui/async-select'
import { type VariantListItem, partOptionDescription } from '@modules/ims'

import { type ManualLine } from './model'
import { descLineFromVariant, lineFromVariant } from './variant-map'
import type { POExpectedLine } from '../../../api'
import { INWARDS_STRINGS } from '../inwards.strings'
import { PickedPartSummary } from './LinePartSummary'

const S = INWARDS_STRINGS.lineItems

/** Shared per-row collaborators — grouped so LineRow / LinePartCell stay
 *  small-prop components. */
export interface LineRowCtx {
  pendingLines: POExpectedLine[]
  usePoVariantOptions: (search: string) => AsyncQueryShape<VariantListItem>
  // Full-catalog picker for description-only / off-PO lines, pre-filtered to the
  // source PO's condition (refurbished PO → refurbished variants only).
  useCatalogVariantOptions: (search: string) => AsyncQueryShape<VariantListItem>
  poVariantIds: string[]
  poVariantIdSet: Set<string>
  patch: (key: string, partial: Partial<ManualLine>) => void
  removeLine: (key: string) => void
  bomOpenKey: string | null
  setBomOpenKey: (fn: (k: string | null) => string | null) => void
  /** Normalized serials entered 2+ times across all lines/components — a line
   *  or component serial in this set is a duplicate and is flagged inline. */
  duplicateSerials: Set<string>
  /** Running claim index per line key: how many units of this PO source line
   *  have been claimed up to AND INCLUDING this row. Rendered as `{claim} of
   *  {pending}` — the 1st row picking a part shows `1 of 1`, a second row for the
   *  same part shows `2 of 1` (over the PO qty), so repeats are obvious. */
  claimIndexByKey: Record<string, number>
  /** Normalised serials the backend rejected at finalize (already in inventory).
   *  A line whose serial is in this set is flagged red — see LineRow. */
  flaggedSerials: ReadonlySet<string>
}

// Clearing a non-description picker resets the row but keeps its key (so React
// doesn't remount). Mirrors the original `{ ...makeLine(), key: line.key }`.
function makeBlankSamePart(key: string): Partial<ManualLine> {
  return {
    variantId: null,
    label: '',
    onPo: false,
    sourceId: null,
    descriptionOnly: false,
    description: '',
    partId: '',
    tracked: false,
    pending: 0,
    partNumber: '',
    variantName: '',
    condition: '',
    categoryId: '',
    bomEligible: false,
    bom: [],
    serial: '',
    qty: 0,
    components: [],
    key,
  }
}

// Clearing a description bucket's picker drops the identified part but keeps the
// row bound to its PO description line.
const DESC_CLEARED: Partial<ManualLine> = {
  variantId: null,
  partId: '',
  label: '',
  partNumber: '',
  variantName: '',
  condition: '',
  categoryId: '',
  bomEligible: false,
  bom: [],
  tracked: false,
  serial: '',
  qty: 0,
  components: [],
}

const variantTitle = (item: VariantListItem) =>
  item.display_title || `${item.part_number} · ${item.name}`

function VariantOption({
  item,
  showOnPo,
}: {
  item: VariantListItem
  showOnPo: boolean
}) {
  const aliasLine = (item.aliases ?? []).filter(Boolean).join(', ')
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{variantTitle(item)}</span>
        {aliasLine && (
          <Typography variant="helper" tone="muted" className="truncate">
            {S.akaPrefix}
            {aliasLine}
          </Typography>
        )}
      </span>
      {showOnPo && (
        <StatusBadge variant="success" className="shrink-0">
          {S.onPo}
        </StatusBadge>
      )}
    </span>
  )
}

/** The Part Number cell: searchable picker (PO-only for part rows, full catalog
 *  for description buckets) + the picked-part helper line + the BOM toggle. */
export function LinePartCell({ line, ctx }: { line: ManualLine; ctx: LineRowCtx }) {
  const { patch } = ctx
  const catalogMode = line.descriptionOnly

  return (
    <div className="min-w-0 space-y-1">
      <AsyncSelect<VariantListItem>
        value={line.variantId ? { id: line.variantId, label: line.label } : null}
        onValueChange={(next) => {
          if (next) return
          patch(line.key, catalogMode ? DESC_CLEARED : makeBlankSamePart(line.key))
        }}
        onItemPick={(item) =>
          patch(
            line.key,
            catalogMode ? descLineFromVariant(item) : lineFromVariant(item, ctx.pendingLines),
          )
        }
        useOptions={catalogMode ? ctx.useCatalogVariantOptions : ctx.usePoVariantOptions}
        toLabel={variantTitle}
        getDescription={partOptionDescription}
        placeholder={catalogMode ? S.pickPartForLine : S.pickPartFromPo}
        searchPlaceholder={catalogMode ? S.searchCatalog : S.searchThisPo}
        className="w-full"
        prioritizeIds={catalogMode ? ctx.poVariantIds : undefined}
        renderItem={(item) => (
          <VariantOption item={item} showOnPo={catalogMode && ctx.poVariantIdSet.has(item.id)} />
        )}
      />
      {line.variantId && <PickedPartSummary line={line} ctx={ctx} />}
      {!line.variantId && line.descriptionOnly && (
        <Typography variant="helper" tone="muted">
          {S.identifyPart}
        </Typography>
      )}
    </div>
  )
}
