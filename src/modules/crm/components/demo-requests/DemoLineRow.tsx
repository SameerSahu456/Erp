import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'

import { SO_LINE_CONDITION_LABELS } from '../../constants/so-status'
import type { DraftLine } from './demo-items'
import { DEMO_REQUESTS_STRINGS as S, formatRupees } from './demo-requests.strings'

// One demo-item line: quantity + amount. Pure presenter — all mutations flow
// up through callbacks. (The mock-backed BOM expander was removed — see the
// note in demo-items.ts.)
export function DemoLineRow({
  line,
  onChangeLine,
  onRemoveLine,
}: {
  line: DraftLine
  onChangeLine: (patch: Partial<DraftLine>) => void
  onRemoveLine: () => void
}) {
  return (
    <tr className="align-middle">
      <td className="px-3 py-2">
        <Typography variant="body-strong" asChild>
          <div>{line.partName}</div>
        </Typography>
        <Typography variant="helper" asChild>
          <div>
            {line.partSku} · {line.brand} · {line.subcategory ?? line.category}
          </div>
        </Typography>
      </td>
      {/* Brand/OEM + Condition — derived from the picked variant, so they are
          READ-ONLY here. The Sales Order form renders the same two fields as
          pickers because an SO can carry a freeform row; a demo line cannot,
          which is why these are text rather than a locked combobox. */}
      <td className="px-3 py-2">
        <Typography variant="helper" truncate asChild>
          <div>{line.brand || S.form.items.noValue}</div>
        </Typography>
      </td>
      <td className="px-3 py-2">
        <Typography variant="helper" truncate asChild>
          {/* Label map, not the raw wire value (`new_pull`). */}
          <div>
            {line.condition
              ? SO_LINE_CONDITION_LABELS[line.condition]
              : S.form.items.noValue}
          </div>
        </Typography>
      </td>
      <td className="px-3 py-2 text-right">
        <Input
          type="number"
          min={1}
          value={line.qty}
          onChange={(e) =>
            onChangeLine({
              qty: Math.min(10_000_000, Math.max(1, Number(e.target.value) || 0)),
            })
          }
          className="h-8 text-right"
        />
      </td>
      <td className="px-3 py-2 text-right">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={line.unitPrice}
          readOnly
          disabled
          className="h-8 text-right"
        />
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {`${line.taxRate ?? 0}%`}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {formatRupees(line.qty * line.unitPrice)}
      </td>
      <td className="px-2 py-2 text-right">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemoveLine}
          aria-label={S.form.line.removeLine}
          className="size-8"
        >
          <Trash2 className="size-4" />
        </Button>
      </td>
    </tr>
  )
}
