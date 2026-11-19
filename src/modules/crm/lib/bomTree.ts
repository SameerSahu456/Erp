// BOM tree helpers shared across Quote and Sales Order.
//
// Asymmetry: Quote responses are already TREE-shaped (children embedded
// under headlines via `QuoteItemWire.children`), but Sales Order responses
// are FLAT — children sit alongside headlines in `SalesOrderWire.items`
// with `parent_sales_order_item_id` pointing at the headline. The FE must
// group them client-side for any UI that wants nested rendering.
//
// `flattenTreeForCalculate` rebuilds the flat sibling array the
// `/quotes/calculate` and `/sales-orders/calculate` endpoints expect.

import type { SalesOrderItemWire } from "../api"

// ── SO grouping ────────────────────────────────────────────────────────

export interface SalesOrderItemTreeNode extends SalesOrderItemWire {
  children: SalesOrderItemWire[]
}

/**
 * Group a flat SO items array into a tree of headlines + children.
 *
 * Preserves the input order of headlines and sorts each headline's
 * children by `sort_order` (then `created_at` as a stable tiebreaker
 * since two same-tx-inserted siblings can share sort_order=0).
 *
 * Orphan children — rows whose `parent_sales_order_item_id` does not
 * resolve to any headline in the input — are surfaced as standalone
 * top-level nodes. The backend's depth-1 invariant means this should
 * never happen on a healthy response, but the fallback keeps the UI
 * from silently dropping rows if the contract drifts.
 */
export function groupSoItemsToTree(
  items: readonly SalesOrderItemWire[],
): SalesOrderItemTreeNode[] {
  const headlines: SalesOrderItemTreeNode[] = []
  const byId = new Map<string, SalesOrderItemTreeNode>()
  const orphanChildren: SalesOrderItemWire[] = []

  for (const item of items) {
    if (item.parent_sales_order_item_id === null) {
      const node: SalesOrderItemTreeNode = { ...item, children: [] }
      headlines.push(node)
      byId.set(item.id, node)
    }
  }

  for (const item of items) {
    if (item.parent_sales_order_item_id === null) continue
    const parent = byId.get(item.parent_sales_order_item_id)
    if (parent) {
      parent.children.push(item)
    } else {
      orphanChildren.push(item)
    }
  }

  for (const node of headlines) {
    node.children.sort(
      (a, b) =>
        a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
    )
  }

  return orphanChildren.length === 0
    ? headlines
    : [
        ...headlines,
        ...orphanChildren.map((c) => ({ ...c, children: [] })),
      ]
}

// ── /calculate flatteners ──────────────────────────────────────────────

