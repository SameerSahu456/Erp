import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { useNavigateBack } from "@/hooks/use-navigate-back"
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"
import { useFormErrors } from "@/hooks/use-form-errors"
import { deepEqual } from "@/lib/deep-equal"

import { createEmptyItem, type LineItem } from "../../components/shared/LineItemsEditor"
import { invoices } from "../../data/invoices"
import type { Invoice } from "../../types"
import { CRM_INVOICES_STRINGS } from "../../components/invoices/invoices.strings"

// Re-exported for the form body's status dropdown; canonical source is constants.
export { INVOICE_STATUSES } from "../../constants/invoice-status"
export const MOCK_OWNERS = ["Amit Patel", "Sneha Desai", "Rahul Verma"] as const

function getToday(): string {
  return new Date().toISOString().split("T")[0] ?? ""
}

function getDatePlusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0] ?? ""
}

// Container logic for the (mock-data) Invoice create/edit form: header fields,
// line items, totals, dirty detection, and the save/send flows.
export function useInvoiceForm() {
  const { id: invoiceId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const existingInvoice = invoiceId ? invoices.find((inv) => inv.id === invoiceId) : undefined
  const isEdit = !!existingInvoice

  const [invoiceNumber] = useState(
    existingInvoice?.invoiceNumber ?? `INV-2026-${String(invoices.length + 1).padStart(4, "0")}`
  )
  const [accountId, setAccountId] = useState(existingInvoice?.accountId ?? "")
  const [issueDate, setIssueDate] = useState(existingInvoice?.issueDate ?? getToday())
  const [dueDate, setDueDate] = useState(existingInvoice?.dueDate ?? getDatePlusDays(30))
  const [status, setStatus] = useState<Invoice["status"]>(existingInvoice?.status ?? "Draft")
  const [owner, setOwner] = useState<string>(MOCK_OWNERS[0])

  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (existingInvoice?.lineItems?.length) {
      return existingInvoice.lineItems.map((li) => ({
        id: li.id,
        item: li.item,
        description: li.description,
        qty: li.qty,
        rate: li.rate,
      }))
    }
    return [createEmptyItem()]
  })

  const [discount, setDiscount] = useState(0)
  const [paymentTerms, setPaymentTerms] = useState("Net 30")
  const [notes, setNotes] = useState("")

  const subtotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0),
    [lineItems]
  )

  const backHref = "/crm/invoices"
  const goBack = useNavigateBack(backHref)
  const { errors, setError, clearError } = useFormErrors()

  const initialValues = useMemo(
    () => ({
      accountId: existingInvoice?.accountId ?? "",
      issueDate: existingInvoice?.issueDate ?? getToday(),
      dueDate: existingInvoice?.dueDate ?? getDatePlusDays(30),
      status: (existingInvoice?.status ?? "Draft") as Invoice["status"],
      owner: MOCK_OWNERS[0] as string,
      lineItems: existingInvoice?.lineItems?.length
        ? existingInvoice.lineItems.map((li) => ({
            id: li.id,
            item: li.item,
            description: li.description,
            qty: li.qty,
            rate: li.rate,
          }))
        : [],
      lineCount: existingInvoice?.lineItems?.length ?? 1,
      discount: 0,
      paymentTerms: "Net 30",
      notes: "",
    }),
    [existingInvoice],
  )
  const currentValues = {
    accountId,
    issueDate,
    dueDate,
    status,
    owner,
    lineItems: lineItems.map((li) => ({
      id: li.id,
      item: li.item,
      description: li.description,
      qty: li.qty,
      rate: li.rate,
    })),
    lineCount: lineItems.length,
    discount,
    paymentTerms,
    notes,
  }
  const isDirty = !deepEqual(currentValues, initialValues)
  const guard = useUnsavedChangesGuard({ isDirty })

  function handleSaveDraft() {
    if (!accountId) {
      setError("accountId", CRM_INVOICES_STRINGS.validation.accountRequiredForSave)
      toast.error(CRM_INVOICES_STRINGS.toast.fixHighlighted)
      return
    }
    clearError("accountId")
    toast.success(CRM_INVOICES_STRINGS.toast.savedDraft)
    navigate(backHref, { replace: true })
  }

  function handleSendInvoice() {
    if (!accountId) {
      setError("accountId", CRM_INVOICES_STRINGS.validation.accountRequiredForSend)
      toast.error(CRM_INVOICES_STRINGS.toast.fixHighlighted)
      return
    }
    clearError("accountId")
    toast.success(CRM_INVOICES_STRINGS.toast.sent)
    navigate(backHref, { replace: true })
  }

  function handleCancel() {
    guard.attempt(goBack)
  }

  return {
    invoiceNumber,
    isEdit,
    existingInvoice,
    accountId, setAccountId,
    issueDate, setIssueDate,
    dueDate, setDueDate,
    status, setStatus,
    owner, setOwner,
    lineItems, setLineItems,
    discount, setDiscount,
    paymentTerms, setPaymentTerms,
    notes, setNotes,
    subtotal,
    errors, clearError,
    isDirty,
    guard,
    backHref,
    handleSaveDraft,
    handleSendInvoice,
    handleCancel,
  }
}

export type InvoiceFormController = ReturnType<typeof useInvoiceForm>
