import { CircleCheck, CircleX, Minus, Tag, Undo2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import type { StockItemComponent } from '@modules/ims'

import {
  COMPONENT_CHECK_STATE_LABELS,
  COMPONENT_CHECK_STATE_VARIANT,
  componentCheckStates,
} from '../../../constants/component-check-state'
import { COMPONENTS_CARD_STRINGS as S } from './components-card.strings'
import {
  componentRowText,
  componentRowVisibility,
  pulledPartBadge,
  type ComponentRowVisibility,
} from './component-row-helpers'

export interface RemoveOptions {
  pull: boolean
  undoAdd: boolean
}

/** Which per-row actions the viewer may take; each one is shown only where
 *  the component's state makes it meaningful. */
export interface ComponentRowActions {
  onPull?: (c: StockItemComponent) => void
  onConfirm?: (c: StockItemComponent) => void
  onMarkMissing?: (c: StockItemComponent) => void
  onFoundAfterAll?: (c: StockItemComponent) => void
  onIdentify?: (c: StockItemComponent) => void
  onPutBack?: (c: StockItemComponent) => void
  onUndoAdd?: (c: StockItemComponent) => void
  /** The Remove button: which of pull / undo-add apply to this row. */
  onRemove?: (c: StockItemComponent, options: RemoveOptions) => void
  busy?: boolean
}

/** One component inside the device — what it is, where it stands in the
 *  returned-device check, and what may be done with it. Pure presenter. */
export function ComponentRow({
  component: c,
  isRemoved,
  caption,
  actions,
  deviceAway,
}: {
  component: StockItemComponent
  isRemoved: boolean
  caption: string
  actions: ComponentRowActions
  /** The device is not with us, so no part can be checked: drop "Check needed". */
  deviceAway?: boolean
}) {
  const states = componentCheckStates(c).filter((s) => !(deviceAway && s === 'due'))
  const { label, serial } = componentRowText(c)
  const show = componentRowVisibility(c, states, isRemoved, actions)
  // A pulled-out part shows where it is now, e.g. "Scrapped" or "Pending QC".
  const nowAt = isRemoved ? pulledPartBadge(c) : null

  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2.5 last:border-0">
      {/* min-w-0 makes the truncate below truncate (PAGE-UI-RULES §8.7). */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Typography variant="body" className="min-w-0 truncate">
            {label}
          </Typography>
          {c.position ? (
            <Badge variant="outline" className="shrink-0">
              {S.row.positionLabel(c.position)}
            </Badge>
          ) : null}
          {states.map((state) => (
            <StatusBadge key={state} variant={COMPONENT_CHECK_STATE_VARIANT[state]} className="shrink-0">
              {COMPONENT_CHECK_STATE_LABELS[state]}
            </StatusBadge>
          ))}
          {nowAt ? (
            <StatusBadge variant={nowAt.variant} className="shrink-0">
              {S.row.nowAt(nowAt.label)}
            </StatusBadge>
          ) : null}
        </div>
        <Typography variant="helper" tone="muted" asChild>
          <p className="truncate font-mono">{serial}</p>
        </Typography>
        <Typography variant="caption" tone="muted" asChild>
          <p className="truncate">{caption}</p>
        </Typography>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        <ComponentRowButtons component={c} show={show} actions={actions} />
      </div>
    </div>
  )
}

/** The row's action buttons; `show` already folds in state + handler presence. */
function ComponentRowButtons({
  component: c,
  show,
  actions,
}: {
  component: StockItemComponent
  show: ComponentRowVisibility
  actions: ComponentRowActions
}) {
  return (
    <>
      {show.confirm ? (
        <Button size="sm" variant="outline" disabled={actions.busy} onClick={() => actions.onConfirm?.(c)}>
          <CircleCheck className="size-3.5" data-icon="inline-start" />
          {S.row.confirm}
        </Button>
      ) : null}
      {show.markMissing ? (
        <Button size="sm" variant="outline" disabled={actions.busy} onClick={() => actions.onMarkMissing?.(c)}>
          <CircleX className="size-3.5" data-icon="inline-start" />
          {S.row.markMissing}
        </Button>
      ) : null}
      {show.foundAfterAll ? (
        <Button size="sm" variant="outline" disabled={actions.busy} onClick={() => actions.onFoundAfterAll?.(c)}>
          <Undo2 className="size-3.5" data-icon="inline-start" />
          {S.row.foundAfterAll}
        </Button>
      ) : null}
      {show.identify ? (
        <Button size="sm" variant="outline" onClick={() => actions.onIdentify?.(c)}>
          <Tag className="size-3.5" data-icon="inline-start" />
          {S.row.identify}
        </Button>
      ) : null}
      {show.putBack ? (
        <Button size="sm" variant="outline" disabled={actions.busy} onClick={() => actions.onPutBack?.(c)}>
          <Undo2 className="size-3.5" data-icon="inline-start" />
          {S.row.putBack}
        </Button>
      ) : null}
      {/* One Remove button: "take it out" (pull) and "never inside" (undo the
          add) both take the part off this device, so the choice is made in
          the dialog, not by picking between two look-alike buttons. */}
      {show.pull || show.undoAdd ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => actions.onRemove?.(c, { pull: show.pull, undoAdd: show.undoAdd })}
        >
          <Minus className="size-3.5" data-icon="inline-start" />
          {S.row.remove}
        </Button>
      ) : null}
    </>
  )
}
