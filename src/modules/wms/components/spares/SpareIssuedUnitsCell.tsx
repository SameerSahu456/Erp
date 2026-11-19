/**
 * The spare unit(s) issued against a request. One request is one physical unit,
 * so this is a single serial — rendered as plain text (a link to that unit's
 * device page), not a pill. On the rare legacy row with several units the
 * serials sit inline, comma-separated.
 */
import { useNavigate } from 'react-router-dom'

import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

import { SPARES_STRINGS } from './spares.strings'

interface SpareIssuedUnitsCellProps {
  units: { stock_item_id: string; serial?: string | null }[]
  /** Beside a small label rather than in a table cell: same size as the label,
   *  and it reads as plain text (black, underline on hover) while still opening
   *  that unit's device page. */
  inline?: boolean
}

export function SpareIssuedUnitsCell({ units, inline = false }: SpareIssuedUnitsCellProps) {
  const navigate = useNavigate()
  const P = SPARES_STRINGS.bodyView.issuedUnitPills

  if (units.length === 0) {
    return (
      <Typography variant="helper" tone="muted" asChild>
        <span>—</span>
      </Typography>
    )
  }

  return (
    // stopPropagation: the row's onRowClick opens the DEVICE dossier, and these
    // links go the other way — to the spare unit that was issued.
    <div className="flex min-w-0 flex-wrap gap-x-1.5" onClick={(e) => e.stopPropagation()}>
      {units.map((u, i) => (
        <Typography key={u.stock_item_id} variant={inline ? 'helper' : 'body'} asChild>
          <button
            type="button"
            aria-label={P.openUnitAria(u.serial ?? u.stock_item_id)}
            className={cn(
              'font-mono underline-offset-2',
              inline ? 'text-foreground hover:underline' : 'text-primary hover:underline',
            )}
            onClick={() => navigate(`/wms/devices/${u.stock_item_id}`)}
          >
            {u.serial ?? u.stock_item_id}
            {i < units.length - 1 ? ',' : ''}
          </button>
        </Typography>
      ))}
    </div>
  )
}
