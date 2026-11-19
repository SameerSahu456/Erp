import type { StockItemComponent } from '@modules/ims'

import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { componentRowText } from './component-row-helpers'
import { COMPONENTS_CARD_STRINGS as S } from './components-card.strings'

const NONE = '__none__'

/** Links a found part to the missing one it replaces: "listed 16GB, got 8GB"
 *  (inward-verification D7). Hidden when nothing on the device is missing. */
export function InsteadOfSelect({
  missing,
  value,
  onChange,
}: {
  missing: StockItemComponent[]
  value: string | null
  onChange: (componentId: string | null) => void
}) {
  if (missing.length === 0) return null
  return (
    <div className="space-y-1.5">
      <Label htmlFor="found-instead-of">{S.add.insteadOfLabel}</Label>
      <Select
        value={value ?? NONE}
        onValueChange={(v) => onChange(!v || v === NONE ? null : (v as string))}
      >
        <SelectTrigger id="found-instead-of">
          <SelectValue placeholder={S.add.insteadOfPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{S.add.insteadOfNone}</SelectItem>
          {missing.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {componentRowText(c).label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Typography variant="helper" tone="muted" asChild>
        <p>{S.add.insteadOfHelp}</p>
      </Typography>
    </div>
  )
}
