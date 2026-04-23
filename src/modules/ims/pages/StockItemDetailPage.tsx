import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { mockStockItems } from '../data/stock-items'
import { mockParts } from '../data/parts'

/**
 * Stock Items and Parts share a single detail UI. When the user opens a stock
 * item, redirect to the matching Part's detail page so they see the complete
 * set of tabs (Overview, Variants, Compatible, Inventory, Checklists, …).
 */
export default function StockItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const item = useMemo(
    () => mockStockItems.find((i) => i.id === id),
    [id],
  )

  const matchedPartId = useMemo(() => {
    if (!item) return null
    const itemSkuTail = item.sku.split('-').pop() ?? ''
    const candidates = mockParts.filter(
      (p) =>
        p.name === item.name ||
        (itemSkuTail && p.sku.includes(itemSkuTail)) ||
        item.sku.includes(p.sku.split('-').pop() ?? ''),
    )
    const parent = candidates.find((p) => (p.productType ?? 'parent') === 'parent')
    const picked = parent ?? candidates[0]
    return picked ? picked.id : null
  }, [item])

  if (!item) {
    return (
      <EmptyState
        title="Stock item not found"
        description="The stock item you are looking for does not exist."
      />
    )
  }

  if (matchedPartId) {
    return <Navigate to={`/ims/parts/${matchedPartId}`} replace />
  }

  return (
    <EmptyState
      title="No matching part"
      description="This stock item is not linked to a part record."
    />
  )
}
