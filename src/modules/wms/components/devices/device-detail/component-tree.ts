import type { StockItemComponent } from '@modules/ims'

/** Every current row plus the parts fitted inside them, all the way down. */
export function withInner(list: StockItemComponent[]): StockItemComponent[] {
  return list.flatMap((c) => [c, ...withInner(c.inner_components ?? [])])
}
