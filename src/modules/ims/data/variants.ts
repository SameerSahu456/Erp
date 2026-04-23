import type { Variant, VariantCondition } from '@/modules/wms/types'
import { mockParts } from './parts'
import { mockStockItems } from './stock-items'

// Parts → matching StockItem (by curation, since names and SKUs drifted across the two legacy sources).
// Parts not listed here get a single default "New" variant generated with a placeholder price.
const PART_TO_STOCK_ITEM: Record<string, string> = {
  'PART-001': 'item-001',
  'PART-002': 'item-002',
  'PART-003': 'item-003',
  'PART-004': 'item-004',
  'PART-005': 'item-007',
  'PART-007': 'item-009',
  'PART-010': 'item-010',
  'PART-012': 'item-011',
  'PART-015': 'item-012',
  'PART-016': 'item-014',
  'PART-018': 'item-006',
  'PART-022': 'item-016',
}

// Fallback sell prices for parts that have no matching stock item yet.
const DEFAULT_NEW_SELL_PRICE: Record<string, number> = {
  // Top-level products (parts without a linked stock item)
  'PART-006': 38000,
  'PART-008': 345000,
  'PART-009': 465000,
  'PART-011': 1250000,
  'PART-013': 285000,
  'PART-014': 16500,
  'PART-017': 185000,
  'PART-019': 145000,
  'PART-020': 175000,
  'PART-021': 85000,
  // Component-level parts (BOM building blocks)
  'COMP-001': 75000, 'COMP-002': 82000,
  'COMP-003': 12000, 'COMP-004': 6500,
  'COMP-005': 25000, 'COMP-006': 22000,
  'COMP-007': 12000, 'COMP-008': 18000, 'COMP-009': 20000, 'COMP-010': 28000,
  'COMP-011': 15000, 'COMP-012': 4500,
  'COMP-013': 62000, 'COMP-014': 18000, 'COMP-015': 9000, 'COMP-016': 3500,
  'COMP-017': 95000, 'COMP-018': 14000, 'COMP-019': 18000, 'COMP-020': 13500,
  'COMP-021': 24000, 'COMP-022': 5000,
  'COMP-023': 3000, 'COMP-024': 400, 'COMP-025': 600, 'COMP-026': 45000,
  // HPE DL360 Gen11 + compatible components (parents from Data.xlsx import)
  'PART-022': 435000,
  'COMP-027': 740000, 'COMP-028': 285000, 'COMP-029': 115000,
  'COMP-030': 5500, 'COMP-031': 6000,
  'COMP-032': 185000, 'COMP-033': 145000, 'COMP-034': 148000, 'COMP-035': 85000,
  'COMP-036': 7500, 'COMP-037': 3500,
  'COMP-038': 52000, 'COMP-039': 44000,
  'COMP-040': 28000, 'COMP-041': 13500,
  'COMP-042': 30000, 'COMP-043': 35000,
  'COMP-044': 85000, 'COMP-045': 65000,
  'COMP-046': 85000, 'COMP-047': 95000,
  'COMP-048': 8500,
  'COMP-049': 13500, 'COMP-050': 29000, 'COMP-051': 48000,
  'COMP-052': 14500, 'COMP-053': 30000, 'COMP-054': 52000, 'COMP-055': 115000,
  'COMP-056': 18500, 'COMP-057': 12000,
  'COMP-058': 6000, 'COMP-059': 3800,
  'COMP-060': 24000, 'COMP-061': 5500,
  'COMP-062': 115000,
  'COMP-063': 35000, 'COMP-064': 38000,
}

function conditionCode(condition: VariantCondition): string {
  switch (condition) {
    case 'New':
      return 'NEW'
    case 'Refurbished':
      return 'REF'
    case 'New Pull':
      return 'PULL'
  }
}

function buildVariants(): Variant[] {
  const result: Variant[] = []
  let seq = 1

  for (const part of mockParts) {
    const stockItemId = PART_TO_STOCK_ITEM[part.id]
    const stockItem = stockItemId
      ? mockStockItems.find((s) => s.id === stockItemId)
      : undefined

    if (stockItem && stockItem.variants.length > 0) {
      for (const sv of stockItem.variants) {
        const id = `VAR-${String(seq++).padStart(4, '0')}`
        result.push({
          id,
          partId: part.id,
          condition: sv.type,
          attributes: {},
          variantSku: `${part.sku}-${conditionCode(sv.type)}`,
          displayName: `${part.name} · ${sv.type}`,
          sellPrice: sv.unitPrice,
          costPrice: Math.round(sv.unitPrice * 0.75),
          mrp: Math.round(sv.unitPrice * 1.15),
          currency: 'INR',
          reorderLevel: part.reorderLevel,
          isActive: part.isActive,
          quantityOnHand: sv.quantity,
          createdAt: part.createdAt,
          updatedAt: sv.lastUpdated,
        })
      }
    } else {
      const id = `VAR-${String(seq++).padStart(4, '0')}`
      const sellPrice = part.sellPrice ?? DEFAULT_NEW_SELL_PRICE[part.id] ?? 50000
      result.push({
        id,
        partId: part.id,
        condition: 'New',
        attributes: {},
        variantSku: `${part.sku}-NEW`,
        displayName: `${part.name} · New`,
        sellPrice,
        costPrice: Math.round(sellPrice * 0.75),
        mrp: Math.round(sellPrice * 1.15),
        currency: 'INR',
        reorderLevel: part.reorderLevel,
        isActive: part.isActive,
        quantityOnHand: 0,
        createdAt: part.createdAt,
      })
    }
  }

  return result
}

export const mockVariants: Variant[] = buildVariants()

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getVariantById(id: string): Variant | undefined {
  return mockVariants.find((v) => v.id === id)
}

export function getVariantsByPartId(partId: string): Variant[] {
  return mockVariants.filter((v) => v.partId === partId)
}

export function getDefaultVariantForPart(partId: string): Variant | undefined {
  const variants = getVariantsByPartId(partId)
  return variants.find((v) => v.condition === 'New') ?? variants[0]
}

export function formatVariantLabel(
  variant: Variant,
  opts: { withPrice?: boolean } = {},
): string {
  if (!opts.withPrice) return variant.displayName
  return `${variant.displayName} — ₹${variant.sellPrice.toLocaleString('en-IN')}`
}

export function getPartIdForVariant(variantId: string): string | undefined {
  return getVariantById(variantId)?.partId
}
