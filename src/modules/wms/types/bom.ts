import type { VariantCondition } from './inventory'

// ── Assembly BOM (Bill of Materials) ──
export type BOMType = 'ASSEMBLY' | 'DISASSEMBLY'
export type BOMStatus = 'Draft' | 'Active' | 'Revision' | 'Obsolete'

export interface BOMItem {
  id: string
  // Canonical FK — introduced in Phase 2B of the Variant migration.
  variantId: string
  condition: VariantCondition
  variantSku: string
  // Part-level fields kept for display + backwards-compat (Phase 3/4 cleanup).
  partId: string
  partName: string
  partSku: string
  quantity: number
  unitOfMeasure: string
  isOptional: boolean
  allowSubstitution: boolean  // can use related/replaceable parts
  substituteVariantIds?: string[]
  substitutePartIds?: string[]
  position?: string   // e.g., 'Slot 1', 'Bay 2'
  notes?: string
}

export interface BillOfMaterials {
  id: string
  name: string          // e.g., 'Dell R750xs Standard Build'
  bomNumber: string     // BOM-2026-001
  type: BOMType
  status: BOMStatus
  version: number
  // Parent product
  parentPartId: string
  parentPartName: string
  parentPartSku: string
  // Components
  items: BOMItem[]
  // Metadata
  estimatedAssemblyTime?: number  // minutes
  estimatedCost?: number
  createdBy: string
  approvedBy?: string
  createdAt: string
  updatedAt?: string
  notes?: string
}

