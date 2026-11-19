import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { INWARDS_STRINGS } from '../inwards.strings'
import type { BomComponentDraft } from './model'

const S = INWARDS_STRINGS.bomComponentRow
const NONE = '__none__'

/** A BOM part the operator found NOT inside: kept, struck through, and sent as
 *  missing so procurement sees the shortfall (inward-verification D1). */
export function MissingBomRow({
  component: c,
  onRestore,
}: {
  component: BomComponentDraft
  onRestore: () => void
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-dashed border-destructive/40 px-2 py-1.5">
      <div className="min-w-0 flex-1">
        <Typography variant="body" className="truncate line-through" tone="muted">
          {c.label}
        </Typography>
        <Typography variant="helper" tone="danger">
          {S.missingNote}
        </Typography>
      </div>
      <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={onRestore}>
        {S.undoMissing}
      </Button>
    </div>
  )
}

/** For an added part: which missing BOM part it replaces — "listed 16GB, got
 *  8GB" (D7). Hidden when nothing is missing. */
export function InsteadOfPicker({
  missingRows,
  value,
  onChange,
}: {
  missingRows: BomComponentDraft[]
  value: string | null
  onChange: (rowKey: string | null) => void
}) {
  if (missingRows.length === 0) return null
  return (
    <div className="flex min-w-0 items-center gap-2 pl-1">
      <Typography variant="helper" tone="muted" className="shrink-0">
        {S.insteadOfLabel}
      </Typography>
      <Select
        value={value ?? NONE}
        onValueChange={(v) => onChange(!v || v === NONE ? null : (v as string))}
      >
        <SelectTrigger className="h-8 min-w-0 flex-1" aria-label={S.insteadOfLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{S.insteadOfNone}</SelectItem>
          {missingRows.map((m) => (
            <SelectItem key={m.rowKey} value={m.rowKey}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
