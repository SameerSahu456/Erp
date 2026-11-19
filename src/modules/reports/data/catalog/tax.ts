import { ReceiptIndianRupee } from 'lucide-react'

import type { ReportCategory } from '../../types'

export const TAX_CATEGORY: ReportCategory = {
  id: 'tax',
  label: 'GST & Compliance',
  description: 'GSTR summaries, input credit, HSN, e-way bills, TDS and TCS.',
  icon: ReceiptIndianRupee,
  reports: [
    {
      id: 'gstr1-summary',
      label: 'GSTR-1 Summary (Rental Invoices)',
      description:
        'Rental invoices and credit notes raised in the period by customer type, with IGST, CGST and SGST. Outright sales are not included because the ERP does not raise sales invoices yet.',
      columns: [
        { key: 'section', label: 'Customer Type' },
        {
          key: 'invoices',
          label: 'Documents',
          format: 'number',
          align: 'right',
        },
        {
          key: 'taxable',
          label: 'Taxable Value',
          format: 'currency',
          sortable: true,
          align: 'right',
        },
        { key: 'igst', label: 'IGST', format: 'currency', align: 'right' },
        { key: 'cgst', label: 'CGST', format: 'currency', align: 'right' },
        { key: 'sgst', label: 'SGST', format: 'currency', align: 'right' },
        {
          key: 'totalTax',
          label: 'Total Tax',
          format: 'currency',
          align: 'right',
        },
      ],
      kpis: [
        {
          label: 'Taxable Value',
          column: 'taxable',
          agg: 'sum',
          format: 'currency',
          accent: 'primary',
        },
        {
          label: 'Output Tax',
          column: 'totalTax',
          agg: 'sum',
          format: 'currency',
          accent: 'info',
        },
      ],
      chart: {
        type: 'bar',
        xKey: 'section',
        yKey: 'taxable',
        yFormat: 'currency',
        accent: 'indigo',
      },
    },
    {
      id: 'gstr3b-summary',
      label: 'GSTR-3B Summary (Output Tax)',
      description:
        'Output GST on rental invoices less credit notes for the period. Input tax credit and the net payable are not shown because the ERP does not record vendor bills yet.',
      columns: [
        { key: 'line', label: 'Line' },
        { key: 'igst', label: 'IGST', format: 'currency', align: 'right' },
        { key: 'cgst', label: 'CGST', format: 'currency', align: 'right' },
        { key: 'sgst', label: 'SGST', format: 'currency', align: 'right' },
        { key: 'total', label: 'Total', format: 'currency', align: 'right' },
      ],
      kpis: [
        {
          label: 'Net Output Tax',
          column: 'total',
          agg: 'sum',
          format: 'currency',
          accent: 'primary',
        },
        {
          label: 'IGST',
          column: 'igst',
          agg: 'sum',
          format: 'currency',
          accent: 'info',
        },
        {
          label: 'CGST + SGST (each)',
          column: 'cgst',
          agg: 'sum',
          format: 'currency',
          accent: 'warning',
        },
      ],
      chart: {
        type: 'bar',
        xKey: 'line',
        yKey: 'total',
        yFormat: 'currency',
        accent: 'violet',
      },
    },
    {
      id: 'itc-register',
      label: 'Input Tax Credit Register',
      description:
        'Vendor invoices with the ITC claimed and whether each appears in GSTR-2B, so unmatched credit is chased.',
      columns: [
        { key: 'vendor', label: 'Vendor', filterable: true },
        { key: 'gstin', label: 'GSTIN' },
        { key: 'invoice', label: 'Invoice' },
        {
          key: 'taxable',
          label: 'Taxable Value',
          format: 'currency',
          align: 'right',
        },
        {
          key: 'itc',
          label: 'ITC Claimed',
          format: 'currency',
          sortable: true,
          align: 'right',
        },
        {
          key: 'status',
          label: '2B Match',
          format: 'status',
          filterable: true,
        },
      ],
      kpis: [
        {
          label: 'ITC Claimed',
          column: 'itc',
          agg: 'sum',
          format: 'currency',
          accent: 'primary',
        },
        { label: 'Invoices', agg: 'count', accent: 'info' },
      ],
      chart: {
        type: 'bar',
        xKey: 'vendor',
        yKey: 'itc',
        yFormat: 'currency',
        accent: 'teal',
      },
    },
    {
      id: 'hsn-wise-summary',
      label: 'HSN-wise Summary (Rental Invoices)',
      description:
        'Units billed, taxable value and tax on rental invoices by HSN or SAC code, before credit notes. Outright sales are not included because the ERP does not raise sales invoices yet.',
      columns: [
        { key: 'hsn', label: 'HSN / SAC' },
        { key: 'qty', label: 'Units Billed', format: 'number', align: 'right' },
        {
          key: 'taxable',
          label: 'Taxable Value',
          format: 'currency',
          sortable: true,
          align: 'right',
        },
        { key: 'rate', label: 'GST Rate', format: 'percent', align: 'right' },
        { key: 'tax', label: 'Tax', format: 'currency', align: 'right' },
      ],
      kpis: [
        { label: 'HSN / Rate Lines', agg: 'count', accent: 'primary' },
        {
          label: 'Taxable Value',
          column: 'taxable',
          agg: 'sum',
          format: 'currency',
          accent: 'info',
        },
        {
          label: 'Tax',
          column: 'tax',
          agg: 'sum',
          format: 'currency',
          accent: 'violet',
        },
      ],
      chart: {
        type: 'bar',
        xKey: 'hsn',
        yKey: 'taxable',
        yFormat: 'currency',
        accent: 'indigo',
      },
    },
    {
      id: 'eway-bill-register',
      label: 'E-Way Bill Register',
      description:
        'E-way bills generated for dispatches, with validity so expired bills on goods in transit are caught.',
      columns: [
        { key: 'ewbNo', label: 'E-Way Bill' },
        { key: 'date', label: 'Generated', format: 'date', sortable: true },
        { key: 'document', label: 'Invoice / SO' },
        { key: 'from', label: 'From' },
        { key: 'to', label: 'To' },
        {
          key: 'value',
          label: 'Goods Value',
          format: 'currency',
          align: 'right',
        },
        { key: 'validUntil', label: 'Valid Until', format: 'date' },
        { key: 'status', label: 'Status', format: 'status', filterable: true },
      ],
      kpis: [
        { label: 'E-Way Bills', agg: 'count', accent: 'primary' },
        {
          label: 'Goods Value',
          column: 'value',
          agg: 'sum',
          format: 'currency',
          accent: 'info',
        },
      ],
      chart: {
        type: 'bar',
        xKey: 'to',
        yKey: 'value',
        yFormat: 'currency',
        accent: 'sky',
      },
    },
    {
      id: 'tds-summary',
      label: 'TDS Deducted Summary',
      description:
        'Tax deducted at source by section and deductee, and whether it has been deposited.',
      columns: [
        { key: 'section', label: 'Section', filterable: true },
        { key: 'deductee', label: 'Deductee' },
        {
          key: 'amountPaid',
          label: 'Amount Paid',
          format: 'currency',
          align: 'right',
        },
        { key: 'rate', label: 'TDS Rate', format: 'percent', align: 'right' },
        {
          key: 'tds',
          label: 'TDS',
          format: 'currency',
          sortable: true,
          align: 'right',
        },
        { key: 'status', label: 'Deposit', format: 'status', filterable: true },
      ],
      kpis: [
        {
          label: 'TDS Deducted',
          column: 'tds',
          agg: 'sum',
          format: 'currency',
          accent: 'primary',
        },
        { label: 'Deductees', agg: 'count', accent: 'info' },
      ],
      chart: {
        type: 'bar',
        xKey: 'section',
        yKey: 'tds',
        yFormat: 'currency',
        accent: 'violet',
      },
    },
    {
      id: 'tcs-on-sales',
      label: 'TCS on Sales (206C(1H))',
      description:
        'Customers whose purchases crossed the TCS threshold, and the tax collected on receipts.',
      columns: [
        { key: 'customer', label: 'Customer' },
        { key: 'pan', label: 'PAN' },
        {
          key: 'sales',
          label: 'Sales YTD',
          format: 'currency',
          sortable: true,
          align: 'right',
        },
        {
          key: 'aboveThreshold',
          label: 'Above ₹50L',
          format: 'currency',
          align: 'right',
        },
        { key: 'rate', label: 'TCS Rate', format: 'percent', align: 'right' },
        {
          key: 'tcs',
          label: 'TCS Collected',
          format: 'currency',
          sortable: true,
          align: 'right',
        },
      ],
      kpis: [
        {
          label: 'TCS Collected',
          column: 'tcs',
          agg: 'sum',
          format: 'currency',
          accent: 'primary',
        },
        {
          label: 'Sales Above Threshold',
          column: 'aboveThreshold',
          agg: 'sum',
          format: 'currency',
          accent: 'info',
        },
      ],
      chart: {
        type: 'bar',
        xKey: 'customer',
        yKey: 'tcs',
        yFormat: 'currency',
        accent: 'indigo',
      },
    },
  ],
}
