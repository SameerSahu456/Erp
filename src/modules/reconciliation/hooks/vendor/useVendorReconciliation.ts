import { useState } from 'react'


import { mockPurchaseInvoices } from '@/modules/invoices/data/purchase-invoices'
import { formatIST_date } from "@shared/lib/date"

export const formatDate = (dateStr: string) => formatIST_date(dateStr)

// Unique vendors
export const vendors = Array.from(
  new Map(mockPurchaseInvoices.map((inv) => [inv.vendorId, { id: inv.vendorId, name: inv.vendorName }])).values()
)

// Mock vendor statement data (placeholder)
export const vendorStatementData = [
  { ref: 'VS-001', date: '2026-04-05', description: 'Invoice DELL-INV-2026-88421', amount: 11357500 },
  { ref: 'VS-002', date: '2026-04-18', description: 'Invoice DELL-INV-2026-88422', amount: 1032500 },
  { ref: 'VS-003', date: '2026-05-02', description: 'Payment received', amount: -11357500 },
  { ref: 'VS-004', date: '2026-04-28', description: 'Payment received', amount: -1032500 },
]


export function useVendorReconciliation() {
  const [selectedVendor, setSelectedVendor] = useState('')

  const vendorInvoices = selectedVendor
    ? mockPurchaseInvoices.filter((inv) => inv.vendorId === selectedVendor)
    : []

  const ourTotal = vendorInvoices.reduce((s, inv) => s + inv.grandTotal, 0)
  const ourPaid = vendorInvoices.reduce((s, inv) => s + inv.paidAmount, 0)

  // Simplified discrepancy: difference between our records and vendor statement
  const vendorStatementTotal = selectedVendor === 'VEN-001'
    ? vendorStatementData.filter((v) => v.amount > 0).reduce((s, v) => s + v.amount, 0)
    : ourTotal
  const discrepancy = ourTotal - vendorStatementTotal


  return {
    selectedVendor,
    setSelectedVendor,
    vendorInvoices,
    ourTotal,
    ourPaid,
    vendorStatementTotal,
    discrepancy,
  }
}

export type VendorReconciliationController = ReturnType<typeof useVendorReconciliation>
