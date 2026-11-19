// User-facing copy for the CRM › invoices sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error text, dialog copy, and the sub-feature's
// toast messages live here as one typed `as const` object instead of being
// hardcoded ("naked") in JSX/hooks. Components, pages, and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member (e.g. `form.editTitle`).
export const CRM_INVOICES_STRINGS = {
  list: {
    title: "Invoices",
    subtitle: "Tax invoices raised against customer sales orders.",
    breadcrumbCrm: "CRM",
    breadcrumbInvoices: "Invoices",
    create: "Create Invoice",
    tabLabel: "All Invoices",
    columns: {
      invoiceNumber: "Invoice #",
      accountName: "Account",
      amount: "Amount",
      status: "Status",
      issueDate: "Issue Date",
      dueDate: "Due Date",
    },
    empty: {
      title: "No invoices yet",
      description: "Create an invoice to bill a customer for a confirmed order.",
      action: "Create Invoice",
    },
  },
  detail: {
    dialogTitle: (invoiceNumber: string) => `Invoice ${invoiceNumber}`,
    dialogDescription: (accountName: string) => `Invoice details for ${accountName}`,
    companyName: "comprinttech",
    companyTagline: "IT Infrastructure Solutions",
    invoiceLabel: "Invoice",
    billTo: "Bill To",
    billToAddressLine1: "123 Business Park, Suite 456",
    billToAddressLine2: "Mumbai, Maharashtra 400001",
    invoiceNumberLabel: "Invoice #:",
    issueDateLabel: "Issue Date:",
    dueDateLabel: "Due Date:",
    statusLabel: "Status:",
    columns: {
      item: "Item",
      description: "Description",
      qty: "Qty",
      rate: "Rate",
      amount: "Amount",
    },
    subtotal: "Subtotal",
    gst: "GST (18%)",
    total: "Total",
    print: "Print",
  },
  form: {
    createTitle: "Create Invoice",
    editTitle: (invoiceNumber: string) => `Edit Invoice: ${invoiceNumber}`,
    createSubtitle: "Draft a new invoice for an account.",
    editSubtitle: "Update line items, totals, and terms.",
    newInvoiceBreadcrumb: "New Invoice",
    editBreadcrumb: "Edit",
    cardTitleNew: "New Invoice",
    cardTitleEdit: "Edit Invoice",
    invoiceNumber: "Invoice Number",
    account: "Account",
    accountPlaceholder: "Select account",
    issueDate: "Issue Date",
    dueDate: "Due Date",
    status: "Status",
    owner: "Owner",
    paymentTerms: "Payment Terms",
    paymentTermsPlaceholder: "Enter payment terms...",
    notes: "Notes",
    notesPlaceholder: "Add any notes...",
    cancel: "Cancel",
    saveDraft: "Save Draft",
    sendInvoice: "Send Invoice",
  },
  validation: {
    accountRequiredForSave: "Select an account to save the invoice.",
    accountRequiredForSend: "Select an account to send the invoice.",
  },
  toast: {
    fixHighlighted: "Please fix the highlighted fields.",
    savedDraft: "Invoice saved as draft",
    sent: "Invoice sent successfully",
  },
} as const
