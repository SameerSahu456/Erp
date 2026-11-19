// User-facing copy for the invoices › sales sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, table column headers, card
// section labels, and this sub-feature's toast messages live here as one typed
// `as const` object instead of being hardcoded ("naked") in JSX.
// Components import this via a relative path — no translation runtime.
export const SALES_INVOICE_STRINGS = {
  // ── List page (SalesInvoicesPage) ───────────────────────────────────────
  list: {
    title: "Sales Invoices",
    subtitle: "Tax invoices issued to customers against sales orders.",
    newInvoice: "New Invoice",
    empty: {
      title: "No sales invoices yet",
      description:
        "Create your first invoice to bill a customer for goods delivered or services rendered.",
      action: "New Invoice",
    },
  },

  // ── Form page (SalesInvoiceFormBody) ────────────────────────────────────
  form: {
    title: "New Sales Invoice",
    subtitle:
      "Draft an invoice, add line items, and review totals before sending.",
    breadcrumbs: {
      invoices: "Invoices",
      sales: "Sales",
      new: "New",
    },
    // Section card titles
    invoiceDetails: "Invoice Details",
    lineItems: "Line Items",
    totals: "Totals",
    // Field labels
    customer: "Customer",
    paymentTerms: "Payment Terms",
    issueDate: "Issue Date",
    dueDate: "Due Date",
    // Placeholders
    selectCustomer: "Select customer...",
    itemDescriptionPlaceholder: "Item description",
    // Line item column headers
    columns: {
      description: "Description",
      qty: "Qty",
      unitPrice: "Unit Price",
      discount: "Discount",
      taxPct: "Tax %",
      amount: "Amount",
    },
    // Totals rows
    subtotal: "Subtotal",
    discountRow: "Discount",
    taxableAmount: "Taxable Amount",
    cgst: "CGST (9%)",
    sgst: "SGST (9%)",
    grandTotal: "Grand Total",
    // Action buttons
    addLineItem: "Add Line Item",
    sendInvoice: "Send Invoice",
    saveDraft: "Save Draft",
    cancel: "Cancel",
  },

  // ── Detail page (SalesInvoiceDetailBody) ────────────────────────────────
  detail: {
    // Not-found state
    notFoundTitle: "Invoice not found",
    notFoundDescription: "The invoice you are looking for does not exist.",
    backToList: "Back to Sales Invoices",

    // Action buttons
    send: "Send",
    recordPayment: "Record Payment",
    pdf: "PDF",
    void: "Void",

    // Tab labels
    tabs: {
      preview: "Invoice Preview",
      payments: "Payments",
      creditNotes: "Credit Notes",
    },

    // ── Invoice preview card ──
    preview: {
      // Company header block (static business info on the PDF stub)
      companyName: "Comprint Technologies",
      companyTagline: "IT Infrastructure Solutions",
      companyCity: "Mumbai, Maharashtra, India",
      companyGstin: "GSTIN: 27AABCC1234D1Z5",
      taxInvoice: "TAX INVOICE",
      dateLabel: "Date:",
      dueLabel: "Due:",
      // Address blocks
      billTo: "Bill To",
      shipTo: "Ship To",
      gstinPrefix: "GSTIN:",
      // Line items table columns
      lineItemColumns: {
        description: "Description",
        qty: "Qty",
        unitPrice: "Unit Price",
        discount: "Discount",
        tax: "Tax",
        amount: "Amount",
      },
      // Totals block
      subtotal: "Subtotal",
      discount: "Discount",
      cgst: "CGST (9%)",
      sgst: "SGST (9%)",
      igst: "IGST (18%)",
      grandTotal: "Grand Total",
      // Payment history sub-table
      paymentHistory: "Payment History",
      paymentColumns: {
        date: "Date",
        method: "Method",
        reference: "Reference",
        amount: "Amount",
      },
    },

    // ── Payments tab ──
    payments: {
      columns: {
        date: "Date",
        method: "Method",
        reference: "Reference",
        notes: "Notes",
        amount: "Amount",
      },
      empty: "No payments recorded yet",
      balanceDue: "Balance Due",
      recordPayment: "Record Payment",
    },

    // ── Credit notes tab ──
    creditNotes: {
      columns: {
        cnNumber: "CN#",
        date: "Date",
        amount: "Amount",
        reason: "Reason",
        status: "Status",
      },
      empty: "No credit notes for this invoice",
    },

    // ── Detail sidebar cards ──
    sidebar: {
      invoiceDetailsTitle: "Invoice Details",
      totalsTitle: "Totals",
      // Detail rows
      customer: "Customer",
      salesOrder: "Sales Order",
      issueDate: "Issue Date",
      dueDate: "Due Date",
      paymentTerms: "Payment Terms",
      createdBy: "Created By",
      // Totals rows
      grandTotal: "Grand Total",
      paid: "Paid",
      balanceDue: "Balance Due",
    },
  },
} as const
