import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Quote } from '../types'

function fmt(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function downloadQuotePdf(quote: Quote) {
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()
  let y = 20

  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('QUOTATION', pageW / 2, y, { align: 'center' })
  y += 12

  // Meta
  doc.setFontSize(10)
  const meta: [string, string][] = [
    ['Quote #', quote.quoteNumber],
    ['Account', quote.accountName],
    ['Status', quote.status],
    ['Date', new Date(quote.createdAt).toLocaleDateString('en-IN')],
    ['Valid Until', new Date(quote.validUntil).toLocaleDateString('en-IN')],
    ['Version', `v${quote.version}`],
  ]
  if (quote.leadName) meta.push(['Lead', quote.leadName])

  meta.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(`${label}:`, 14, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, 55, y)
    y += 6
  })
  y += 4

  // Line Items table
  const tableBody = quote.lineItems.map((li, idx) => [
    idx + 1,
    `${li.item}\n${li.description}`,
    li.category,
    li.qty,
    `₹${fmt(li.rate)}`,
    `₹${fmt(li.amount)}`,
  ])

  autoTable(doc, {
    startY: y,
    head: [['#', 'Item', 'Category', 'Qty', 'Rate', 'Amount']],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [41, 98, 255], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 32, halign: 'right' },
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10

  // Totals
  const subtotal = quote.total
  const taxRate = 18
  const taxableAmount = subtotal
  const gstAmount = taxableAmount * (taxRate / 100)
  const halfGst = gstAmount / 2
  const grandTotal = taxableAmount + gstAmount

  const totalsX = pageW - 14
  const labelX = pageW - 80

  const totals: [string, string][] = [
    ['Subtotal', `₹${fmt(subtotal)}`],
    [`CGST (${taxRate / 2}%)`, `₹${fmt(halfGst)}`],
    [`SGST (${taxRate / 2}%)`, `₹${fmt(halfGst)}`],
  ]

  doc.setFontSize(9)
  totals.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal')
    doc.text(label, labelX, y)
    doc.text(value, totalsX, y, { align: 'right' })
    y += 6
  })

  y += 2
  doc.setDrawColor(200)
  doc.line(labelX, y - 4, totalsX, y - 4)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Grand Total', labelX, y)
  doc.text(`₹${fmt(grandTotal)}`, totalsX, y, { align: 'right' })

  doc.save(`${quote.quoteNumber}.pdf`)
}
