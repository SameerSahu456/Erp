import type { DeviceStatus } from './device-status'

// ── Stock Movement (Audit) ──
export interface StockMovement {
  id: string
  deviceId: string
  deviceBarcode: string
  fromStatus: DeviceStatus
  toStatus: DeviceStatus
  changedBy: string
  changedAt: string
  notes?: string
}

// ── IMS Types ──
export interface IMSCategory {
  id: string
  name: string
  parentId?: string
  subcategories?: IMSCategory[]
  partCount: number
  description?: string
  productManager?: string
  isActive: boolean
}

// ── Part/Product Management ──
export type PartProductType = 'parent' | 'variant'
export type PartAssemblyType = 'Assembled' | 'Disassembled'

// Hardware classification for server / workstation build composition.
// Used by the Compatible / Assembly / Disassembly pickers to group candidate parts.
export type HardwareType =
  | 'CPU'
  | 'RAM'
  | 'Memory'
  | 'Motherboard'
  | 'Storage'
  | 'HDD'
  | 'SATA SSD'
  | 'SAS SSD'
  | 'NVMe SSD'
  | 'DVD'
  | 'RAID'
  | 'NIC'
  | 'Ethernet Adapter'
  | 'FC HBA'
  | 'Riser'
  | 'Ports'
  | 'Expansion'
  | 'PSU'
  | 'Chassis'
  | 'Cooling'
  | 'Cable Kit'
  | 'BIOS'
  | 'OS'
  | 'Hypervisor'

export interface Part {
  id: string
  name: string
  aliases: string[]
  sku: string
  categoryId: string
  categoryName: string
  subcategoryId?: string
  subcategoryName?: string
  brand: string
  model?: string
  description?: string
  images: string[]  // URLs or placeholder paths
  videos?: string[]  // URLs or placeholder paths
  specifications?: Record<string, string>  // e.g., { 'RAM': '16GB', 'Storage': '512GB SSD' }
  productManager?: string
  productManagerEmail?: string
  // Checklist assignments
  inwardChecklistId?: string
  inspectionChecklistId?: string
  // Stock info
  reorderLevel: number
  unitOfMeasure: string  // 'Units', 'Pieces', 'Sets'
  hsnCode?: string  // for GST
  // Product type + variant linkage (productType defaults to 'parent' when omitted)
  productType?: PartProductType
  parentPartId?: string                // set when productType === 'variant'
  condition?: VariantCondition         // variant condition: 'New' | 'Refurbished' | 'New Pull'
  sellPrice?: number                   // canonical sell price shown in list view (variants carry this)
  assemblyType?: PartAssemblyType      // whether this part ships Assembled or Disassembled
  hardwareType?: HardwareType          // server-hardware taxonomy used for grouping in Compatible / BOM pickers
  // Status
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface StockItem {
  id: string
  name: string
  categoryId: string
  categoryName: string
  subcategory?: string
  sku: string
  brand: string
  variants: StockVariant[]
  reorderLevel: number
  location: string
  aliases?: string[]
}

export interface StockVariant {
  type: 'New' | 'Refurbished' | 'New Pull'
  quantity: number
  unitPrice: number
  lastUpdated: string
  skus: StockSku[]
}

export interface StockSku {
  sku: string
  serialNumber: string
  barcode: string
  status: 'In Stock' | 'Reserved' | 'Dispatched' | 'In Repair'
  grade?: 'A' | 'B'
  location: string
  poNumber?: string
  batchNumber?: string
  receivedDate: string
  lastMovement: string
}

// ── Variants (canonical SKU unit — the thing every dropdown, line item, and price refers to) ──
export type VariantCondition = 'New' | 'Refurbished' | 'New Pull'

export interface Variant {
  id: string                        // VAR-0001
  partId: string                    // parent template (grouping only)
  condition: VariantCondition
  attributes: Record<string, string> // { RAM: '16GB', Color: 'Gray' } — optional spec axes
  variantSku: string                // unique — e.g. 'DL-LAT-5540-NEW'
  displayName: string               // denormalized for pickers — 'Dell Latitude 5540 · New'
  // pricing lives on the variant directly
  sellPrice: number
  costPrice?: number
  mrp?: number
  currency: 'INR'
  // ops
  reorderLevel: number
  isActive: boolean
  // inventory roll-up — computed in a later phase from StockUnit[]; optional until then
  quantityOnHand?: number
  createdAt: string
  updatedAt?: string
}

// Procurement-only tag — lives on PO / inward records, NOT on the variant
export type PurchaseType = 'Local' | 'Import'

