import { useState, useMemo } from 'react'
import { useNavigateBack } from '@/hooks/use-navigate-back'


export interface InvoiceLineItem {
  id: string
  description: string
  qty: number
  unitPrice: number
  discount: number
  taxRate: number
}

export const customerOptions = [
  { id: 'CUST-001', name: 'TCS Ltd' },
  { id: 'CUST-002', name: 'HCL Technologies' },
  { id: 'CUST-003', name: 'Wipro Ltd' },
  { id: 'CUST-004', name: 'Infosys Ltd' },
  { id: 'CUST-005', name: 'HDFC Bank Ltd' },
  { id: 'CUST-006', name: 'Reliance Jio Infocomm' },
  { id: 'CUST-007', name: 'Mahindra & Mahindra Ltd' },
  { id: 'CUST-008', name: 'SBI (State Bank of India)' },
  { id: 'CUST-009', name: 'Bajaj Finance Ltd' },
]

export const paymentTermsOptions = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt']

export function useSalesInvoiceForm() {
  const goBack = useNavigateBack('/invoices/sales')

  const [customerId, setCustomerId] = useState('')
  const [issueDate, setIssueDate] = useState('2026-04-15')
  const [dueDate, setDueDate] = useState('2026-05-15')
  const [paymentTerms, setPaymentTerms] = useState('Net 30')

  // Lazy initializer so the `Date.now()` seed runs once at mount, not on every
  // render (Rules of React — no impure calls during render).
  const [items, setItems] = useState<InvoiceLineItem[]>(() => [
    { id: `ii-${Date.now()}`, description: '', qty: 1, unitPrice: 0, discount: 0, taxRate: 18 },
  ])

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    [items]
  )

  const totalDiscount = useMemo(
    () => items.reduce((sum, item) => sum + item.discount * item.qty, 0),
    [items]
  )

  const taxableAmount = Math.max(subtotal - totalDiscount, 0)
  const cgst = taxableAmount * 0.09
  const sgst = taxableAmount * 0.09
  const grandTotal = taxableAmount + cgst + sgst

  function addItem() {
    setItems([
      ...items,
      { id: `ii-${Date.now()}`, description: '', qty: 1, unitPrice: 0, discount: 0, taxRate: 18 },
    ])
  }

  function removeItem(id: string) {
    if (items.length <= 1) return
    setItems(items.filter((item) => item.id !== id))
  }

  function updateItem(id: string, field: keyof Omit<InvoiceLineItem, 'id'>, value: string | number) {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }


  return {
    goBack,
    customerId,
    setCustomerId,
    issueDate,
    setIssueDate,
    dueDate,
    setDueDate,
    paymentTerms,
    setPaymentTerms,
    items,
    setItems,
    subtotal,
    totalDiscount,
    taxableAmount,
    cgst,
    sgst,
    grandTotal,
    addItem,
    removeItem,
    updateItem,
  }
}

export type SalesInvoiceFormController = ReturnType<typeof useSalesInvoiceForm>
