import { salesOrders } from '../data/sales-orders'
import { mockPurchaseOrders } from '@/modules/procurement/data/purchase-orders'
import { mockVendors } from '@/modules/procurement/data/vendors'
import type { DemoRequest, SalesOrder, SalesOrderLineItem } from '../types'
import type { PurchaseOrder, PurchaseOrderItem } from '@/modules/procurement/types'
import type { VariantCondition } from '@/modules/wms/types'

export interface ConvertedLine {
  partId?: string
  partName: string
  partSku?: string
  brand?: string
  category?: string
  variantId?: string
  variantSku?: string
  condition?: VariantCondition
  qty: number
  rate: number
  description?: string
}

export function nextSequenceNumber(prefix: string, existing: string[]): string {
  const year = new Date().getFullYear()
  const yearPrefix = `${prefix}-${year}-`
  const used = existing
    .filter((n) => n.startsWith(yearPrefix))
    .map((n) => Number(n.slice(yearPrefix.length)))
    .filter((n) => Number.isFinite(n))
  const next = (used.length > 0 ? Math.max(...used) : 0) + 1
  return `${yearPrefix}${String(next).padStart(3, '0')}`
}

function pickVendorForBrand(brand: string) {
  const lower = brand.toLowerCase()
  const match =
    mockVendors.find((v) => v.name.toLowerCase().includes(lower) && v.status === 'Active')
    ?? mockVendors.find((v) => v.status === 'Active')
    ?? mockVendors[0]
  if (!match) {
    throw new Error('No vendors configured — cannot create back-to-back PO')
  }
  return match
}

export function createSOAndPOFromDemo(
  demo: DemoRequest,
  lines: ConvertedLine[],
  options: { dispatchNotes?: string } = {},
): { so: SalesOrder; po: PurchaseOrder } {
  const nowIso = new Date().toISOString()
  const today = nowIso.slice(0, 10)

  const soNumber = nextSequenceNumber('SO', salesOrders.map((s) => s.orderNumber))
  const poNumber = nextSequenceNumber('PO', mockPurchaseOrders.map((p) => p.poNumber))
  const soId = `SO-${soNumber}`
  const poId = `PO-${poNumber}`

  const soLines: SalesOrderLineItem[] = lines.map((l, idx) => ({
    id: `${soId}-L${String(idx + 1).padStart(2, '0')}`,
    variantId: l.variantId ?? 'VAR-UNKNOWN',
    condition: l.condition ?? 'New',
    variantSku: l.variantSku ?? l.partSku ?? '',
    partId: l.partId ?? '',
    partName: l.partName,
    partSku: l.partSku ?? '',
    category: l.category ?? '',
    brand: l.brand ?? '',
    qty: l.qty,
    rate: l.rate,
    amount: l.rate * l.qty,
    configAction: 'STANDARD',
  }))
  const soTotal = soLines.reduce((s, l) => s + l.amount, 0)

  const poLines: PurchaseOrderItem[] = lines.map((l, idx) => {
    const unitPrice = Math.round(l.rate * 0.8) // assume 20% margin for back-to-back PO
    const taxRate = 18
    const amount = unitPrice * l.qty
    return {
      id: `${poId}-I${String(idx + 1).padStart(2, '0')}`,
      variantId: l.variantId ?? 'VAR-UNKNOWN',
      condition: l.condition ?? 'New',
      variantSku: l.variantSku ?? l.partSku ?? '',
      partId: l.partId ?? '',
      partName: l.partName,
      partSku: l.partSku ?? '',
      category: l.category ?? '',
      description: l.description ?? l.partName,
      qtyOrdered: l.qty,
      qtyReceived: 0,
      unitPrice,
      taxRate,
      amount,
    }
  })
  const subtotal = poLines.reduce((s, l) => s + l.amount, 0)
  const taxAmount = poLines.reduce((s, l) => s + (l.amount * l.taxRate) / 100, 0)
  const grandTotal = subtotal + taxAmount

  const vendor = pickVendorForBrand(lines[0]?.brand ?? '')
  const expectedDelivery = demo.expectedReturnDate ?? today

  const so: SalesOrder = {
    id: soId,
    orderNumber: soNumber,
    accountId: demo.accountId,
    accountName: demo.accountName,
    total: soTotal,
    status: 'Confirmed',
    date: today,
    items: soLines.length,
    createdAt: nowIso,
    approvalStatus: 'Approved',
    approvedBy: demo.approvedBy ?? demo.productManager,
    hasPartConfig: false,
    version: 1,
    lineItems: soLines,
    purchaseOrderId: poId,
    purchaseOrderNumber: poNumber,
    demoRequestId: demo.id,
    demoRequestNumber: demo.demoNumber,
    dispatchNotes:
      options.dispatchNotes
      ?? `Generated from demo ${demo.demoNumber}. Back-to-back PO ${poNumber} raised on ${vendor.name}.`,
  }

  const po: PurchaseOrder = {
    id: poId,
    poNumber,
    salesOrderId: soId,
    salesOrderNumber: soNumber,
    vendorId: vendor.id,
    vendorName: vendor.name,
    vendorContact: vendor.contactPerson,
    vendorEmail: vendor.email,
    vendorAddress: vendor.address,
    items: poLines,
    subtotal,
    taxAmount,
    discount: 0,
    grandTotal,
    paymentTerms: vendor.paymentTerms,
    deliveryTerms: 'FOB',
    expectedDelivery,
    status: 'Draft',
    notes: `Back-to-back PO for ${soNumber} (originated from demo ${demo.demoNumber}).`,
    createdBy: demo.requestedBy,
    createdAt: today,
    version: 1,
  }

  return { so, po }
}

export function persistSOAndPOFromDemo(
  demo: DemoRequest,
  lines: ConvertedLine[],
  options: { dispatchNotes?: string } = {},
): { so: SalesOrder; po: PurchaseOrder } {
  const { so, po } = createSOAndPOFromDemo(demo, lines, options)
  salesOrders.push(so)
  mockPurchaseOrders.push(po)
  demo.salesOrderId = so.id
  demo.salesOrderNumber = so.orderNumber
  demo.updatedAt = new Date().toISOString()
  return { so, po }
}
