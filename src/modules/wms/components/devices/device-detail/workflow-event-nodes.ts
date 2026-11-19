import { createElement, Fragment, type ReactNode } from 'react'

import { EntityRef } from '@/components/common/display/EntityRef'
import type { EntityKind } from '@shared/lib/entityRoutes'

/** A trimmed string field, or null (keeps optional metadata tidy). */
export function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** Identifier chip: click opens, double click copies. `createElement` keeps this a .ts module. */
export function entityRef(
  kind: EntityKind,
  id: string | null,
  label: string,
  value?: string,
): ReactNode {
  return createElement(EntityRef, value === undefined ? { kind, id } : { kind, id, value }, label)
}

// Join strings and <EntityRef> chips into one node, dropping empties.
export function joinNodes(nodes: ReactNode[], sep = ' · '): ReactNode {
  const kept = nodes.filter((n) => n !== null && n !== undefined && n !== '')
  if (kept.length === 0) return undefined
  return createElement(
    Fragment,
    null,
    kept.map((n, i) => createElement('span', { key: i }, i > 0 ? sep : '', n)),
  )
}
