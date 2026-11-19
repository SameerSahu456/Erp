import { Fragment, type ReactNode } from 'react'

import type { StockItemComponent } from '@modules/ims'

import { COMPONENTS_CARD_STRINGS as S } from './components-card.strings'
import { ComponentRow } from './ComponentRow'

/** A part's own contents, listed under it and read only — they belong to the
 *  part, so the device's actions do not apply to them. */
export function InnerComponentRows({
  parent,
  caption,
  deviceAway,
}: {
  parent: StockItemComponent
  caption: (c: StockItemComponent, isRemoved: boolean) => string
  deviceAway?: boolean
}): ReactNode {
  const inner = parent.inner_components ?? []
  if (inner.length === 0) return null
  return (
    <div className="ml-6 border-l border-border pl-3">
      {inner.map((c) => (
        <Fragment key={c.id}>
          <ComponentRow
            component={c}
            isRemoved={false}
            caption={`${S.row.insidePart(parent.part_name)} · ${caption(c, false)}`}
            actions={{}}
            deviceAway={deviceAway}
          />
          <InnerComponentRows parent={c} caption={caption} deviceAway={deviceAway} />
        </Fragment>
      ))}
    </div>
  )
}
