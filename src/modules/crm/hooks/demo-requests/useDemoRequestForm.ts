import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import type { AsyncSelectOption } from "@/components/ui/async-select"
import { useNavigateBack } from "@/hooks/use-navigate-back"
import { useFormErrors } from "@/hooks/use-form-errors"
import { deepEqual } from "@/lib/deep-equal"

import { useAccountAddresses } from "../accounts/useAccounts"
import { useContactOptions } from "../contacts/useContacts"
import { useCreateDemoRequest } from "./useDemoRequests"
import { useDealsInfinite } from "../deals/useDeals"
import { useLeadsInfinite } from "../leads/useLeads"
import type {
  AccountAddressWire,
  AccountListItem,
  ContactListItem,
  CrmLeadListItem,
  DealListItem,
  DemoRequestSource,
} from "../../api"
import {
  buildDemoItems,
  demoLinesTotals,
  type DraftLine,
} from "../../components/demo-requests/demo-items"
import { DEMO_REQUESTS_STRINGS as S } from "../../components/demo-requests/demo-requests.strings"
import { istDateInDays, todayISTDate } from "../../lib/demo-requests/dates"

// Container logic for the Demo Request create form: source (lead/deal/account)
// selection, contact + shipping resolution (with lone-record auto-select),
// line items, and the submit flow (which branches by source type).
export function useDemoRequestForm() {
  const navigate = useNavigate()
  const goBack = useNavigateBack("/crm/demo-requests")
  const { errors, setErrors, clearError, clearAll } = useFormErrors()
  const createDemoRequest = useCreateDemoRequest()

  const [demoNumber] = useState(S.form.demoNumberPlaceholder)
  const [sourceType, setSourceType] = useState<DemoRequestSource>("account")
  const [sourceOption, setSourceOption] = useState<AsyncSelectOption | null>(null)
  const [selectedLead, setSelectedLead] = useState<CrmLeadListItem | null>(null)
  const [leadId, setLeadId] = useState("")
  const [dealId, setDealId] = useState("")
  const [accountId, setAccountId] = useState("")
  const [accountOption, setAccountOption] = useState<AsyncSelectOption | null>(null)
  const [contactId, setContactId] = useState("")
  const [contactOption, setContactOption] = useState<AsyncSelectOption | null>(null)
  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [shippingAddressId, setShippingAddressId] = useState("")
  const [shippingLine1, setShippingLine1] = useState("")
  const [shippingCity, setShippingCity] = useState("")
  const [shippingState, setShippingState] = useState("")
  const [shippingPincode, setShippingPincode] = useState("")
  // Return-date default + picker floor are IST calendar days (§ dates.ts —
  // the UTC day is yesterday before 05:30 IST).
  const [expectedReturnDate, setExpectedReturnDate] = useState(() =>
    istDateInDays(14),
  )
  // Today (IST) as YYYY-MM-DD — the `min` for the return-date picker.
  const todayIso = todayISTDate()
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<DraftLine[]>([])
  // Fetch all active addresses (no server-side address_type filter) — the
  // backend matches address_type exactly, so filtering by 'Shipping' there
  // would drop 'Both'-typed addresses, which serve shipping too. We narrow to
  // Shipping + Both client-side instead.
  const shippingAddressesQuery = useAccountAddresses(
    sourceType === "lead" ? null : accountId,
    { status: "Active" },
    { enabled: sourceType !== "lead" && Boolean(accountId) },
  )
  const shippingAddresses = (shippingAddressesQuery.data ?? []).filter(
    (a) => a.address_type === "Shipping" || a.address_type === "Both",
  )
  const [shippingSelectOpen, setShippingSelectOpen] = useState(false)
  const [addAddrOpen, setAddAddrOpen] = useState(false)
  // null → add a new shipping address; a row → edit that account address.
  const [editingAddr, setEditingAddr] = useState<AccountAddressWire | null>(null)
  const [addContactOpen, setAddContactOpen] = useState(false)
  // null → add flow; a row → edit that contact in the inline dialog.
  const [editingContact, setEditingContact] = useState<ContactListItem | null>(
    null,
  )

  // Background prefetch for the contact dropdown — feeds the auto-select effect.
  const contactPrefetchQuery = useContactOptions("", {
    accountId,
    status: "Active",
    enabled: sourceType !== "lead" && Boolean(accountId) && !contactId,
  })

  // Auto-select a default contact once an account is chosen. Priority:
  //   1. the contact whose PRIMARY account is the selected account (first such
  //      when several share it), then
  //   2. the lone contact when the account has exactly one linked.
  const autoContactForAccountRef = useRef<string | null>(null)
  useEffect(() => {
    if (autoContactForAccountRef.current !== accountId) {
      autoContactForAccountRef.current = null
    }
  }, [accountId])
  useEffect(() => {
    if (sourceType === "lead") return
    if (!accountId || contactId) return
    if (autoContactForAccountRef.current === accountId) return
    if (contactPrefetchQuery.isLoading || contactPrefetchQuery.isError) return
    const firstPage = contactPrefetchQuery.data?.pages[0]
    if (!firstPage) return
    const primaryMatch = firstPage.items.find(
      (c) => c.primary_account_id === accountId,
    )
    const lone =
      firstPage.total === 1 && firstPage.items.length === 1
        ? firstPage.items[0]
        : undefined
    const pick = primaryMatch ?? lone
    if (!pick) return
    autoContactForAccountRef.current = accountId
    setContactId(pick.id)
    setContactOption({ id: pick.id, label: pick.name })
    setContactName(pick.name)
    setContactPhone(pick.phone ?? "")
    setContactEmail(pick.email ?? "")
    clearError("contactId")
  }, [
    sourceType,
    accountId,
    contactId,
    contactPrefetchQuery.isLoading,
    contactPrefetchQuery.isError,
    contactPrefetchQuery.data?.pages,
    clearError,
  ])

  // Auto-select the lone shipping address when the account has exactly one.
  const autoShippingForAccountRef = useRef<string | null>(null)
  useEffect(() => {
    if (autoShippingForAccountRef.current !== accountId) {
      autoShippingForAccountRef.current = null
    }
  }, [accountId])
  useEffect(() => {
    if (sourceType === "lead") return
    if (!accountId || shippingAddressId) return
    if (autoShippingForAccountRef.current === accountId) return
    if (shippingAddressesQuery.isLoading || shippingAddressesQuery.isError) return
    if (shippingAddresses.length !== 1) return
    const lone = shippingAddresses[0]
    if (!lone) return
    autoShippingForAccountRef.current = accountId
    setShippingAddressId(lone.id)
    clearError("shippingAddress")
  }, [
    sourceType,
    accountId,
    shippingAddressId,
    shippingAddressesQuery.isLoading,
    shippingAddressesQuery.isError,
    shippingAddresses,
    clearError,
  ])

  function useLeadOptions(search: string, options?: { enabled?: boolean }) {
    return useLeadsInfinite(
      {
        search: search || undefined,
      },
      options,
    )
  }

  function useDealOptions(search: string, options?: { enabled?: boolean }) {
    return useDealsInfinite(
      {
        search: search || undefined,
        sort: "-created_at",
      },
      options,
    )
  }

  function useContactOptionsForSelectedAccount(
    search: string,
    options?: { enabled?: boolean },
  ) {
    return useContactOptions(search, {
      accountId,
      enabled: Boolean(accountId) && (options?.enabled ?? true),
    })
  }

  function handleAccountPick(account: AccountListItem) {
    setAccountId(account.id)
    setAccountOption({ id: account.id, label: account.name })
    setContactId("")
    setContactOption(null)
    setContactName("")
    setContactPhone("")
    setContactEmail("")
    setShippingAddressId("")
    clearError("accountId")
    clearError("sourceId")
  }

  function handleLeadPick(lead: CrmLeadListItem) {
    setSelectedLead(lead)
    setLeadId(lead.id)
    setSourceOption({
      id: lead.id,
      label: lead.company_name || lead.contact_name || lead.lead_code,
    })
    setAccountId("")
    setAccountOption(null)
    setContactId("")
    setContactOption(null)
    setContactName(lead.contact_name ?? "")
    setContactPhone(lead.phone ?? "")
    setContactEmail(lead.email ?? "")
    setShippingAddressId("")
    setShippingLine1(lead.location ?? "")
    clearError("sourceId")
    clearError("contactName")
    clearError("contactPhone")
    clearError("contactEmail")
    clearError("shippingAddress")
  }

  function handleDealPick(deal: DealListItem) {
    setDealId(deal.id)
    setSourceOption({ id: deal.id, label: deal.deal_number })
    setAccountId(deal.account_id)
    setAccountOption({
      id: deal.account_id,
      label: deal.account_name ?? deal.account_id,
    })
    setContactId("")
    setContactOption(null)
    setContactName("")
    setContactPhone("")
    setContactEmail("")
    setShippingAddressId("")
    clearError("sourceId")
    clearError("accountId")
  }

  function handleContactPick(contact: ContactListItem) {
    setContactId(contact.id)
    setContactOption({ id: contact.id, label: contact.name })
    setContactName(contact.name)
    setContactPhone(contact.phone ?? "")
    setContactEmail(contact.email ?? "")
    clearError("contactId")
    clearError("contactName")
    clearError("contactPhone")
    clearError("contactEmail")
  }

  function resetSource(next: DemoRequestSource) {
    setSourceType(next)
    setSourceOption(null)
    setSelectedLead(null)
    setLeadId("")
    setDealId("")
    setAccountId("")
    setAccountOption(null)
    setContactId("")
    setContactOption(null)
    setContactName("")
    setContactPhone("")
    setContactEmail("")
    setShippingAddressId("")
    setShippingLine1("")
    setShippingCity("")
    setShippingState("")
    setShippingPincode("")
    clearAll()
  }

  const { totalQty, totalAmount } = demoLinesTotals(lines)

  function buildLeadShippingAddress() {
    return {
      line1: shippingLine1.trim(),
      city: shippingCity.trim(),
      state: shippingState.trim(),
      pincode: shippingPincode.trim(),
      is_default: true,
    }
  }

  async function handleSubmit() {
    // Double-submit guard — the FormPageShell save button also disables via
    // `saving`, but the form's Enter-key submit path lands here directly.
    if (submitInFlight) return
    const V = S.form.validation
    const e: Record<string, string> = {}
    if (sourceType === "lead" && !leadId) e.sourceId = V.selectLead
    if (sourceType === "deal" && !dealId) e.sourceId = V.selectDeal
    if (sourceType === "account" && !accountId) e.sourceId = V.selectAccount
    if (sourceType !== "lead" && !accountId) e.accountId = V.accountRequired
    if (sourceType !== "lead" && !contactId) e.contactId = V.selectContact
    if (sourceType === "lead") {
      if (!contactName.trim()) e.contactName = V.contactNameRequired
      if (!contactPhone.trim() && !contactEmail.trim()) {
        e.contactPhone = V.contactReachRequired
        e.contactEmail = V.contactReachRequired
      }
      if (!shippingLine1.trim()) e.shippingAddress = V.shippingLine1Required
      if (!shippingCity.trim()) e.shippingCity = V.cityRequired
      if (!shippingState.trim()) e.shippingState = V.stateRequired
      if (!shippingPincode.trim()) e.shippingPincode = V.pincodeRequired
    } else if (!shippingAddressId) {
      e.shippingAddress = V.selectShippingAddress
    }
    if (!expectedReturnDate) e.expectedReturnDate = V.returnDateRequired
    else if (expectedReturnDate < todayIso)
      e.expectedReturnDate = V.returnDateInPast
    const items = buildDemoItems(lines)
    if (items.length === 0) e.items = V.addItem

    if (Object.keys(e).length > 0) {
      setErrors(e)
      toast.error(S.toast.fixHighlightedFields)
      return
    }
    clearAll()

    const base = {
      source: sourceType,
      source_type: sourceType,
      expected_return_date: expectedReturnDate,
      auto_submit: true,
      notes: notes || undefined,
      items,
    }
    try {
      const created = await createDemoRequest.mutateAsync(
        sourceType === "lead"
          ? {
              ...base,
              source_id: leadId,
              account: {
                name:
                  selectedLead?.company_name?.trim() ||
                  `${contactName.trim()} Demo Account`,
                website: selectedLead?.website ?? undefined,
                company_size: selectedLead?.company_size ?? undefined,
                employees: selectedLead?.employees ?? undefined,
              },
              contact_details: {
                name: contactName.trim(),
                phone: contactPhone.trim() || undefined,
                email: contactEmail.trim() || undefined,
                status: "Active",
              },
              shipping_address: buildLeadShippingAddress(),
            }
          : sourceType === "deal"
            ? {
                ...base,
                source_id: dealId,
                account_id: accountId,
                contact_id: contactId,
                shipping_address_id: shippingAddressId,
              }
            : {
                ...base,
                source_id: accountId,
                account_id: accountId,
                contact_id: contactId,
                shipping_address_id: shippingAddressId,
              },
      )
      toast.success(S.toast.createdPendingApproval(created.demo_number))
      navigate(`/crm/demo-requests/${created.id}`, { replace: true })
    } catch {
      // The mutation's onError toast already reported the failure; swallowing
      // here just prevents an unhandled rejection. The form stays filled so
      // the user can retry.
    }
  }

  const isFormValid =
    (sourceType === "lead" ? Boolean(leadId) : sourceType === "deal" ? Boolean(dealId) : Boolean(accountId)) &&
    (sourceType === "lead" ? Boolean(contactName.trim()) : Boolean(contactId)) &&
    (sourceType === "lead"
      ? Boolean((contactPhone.trim() || contactEmail.trim()) && shippingLine1.trim() && shippingCity.trim() && shippingState.trim() && shippingPincode.trim())
      : Boolean(shippingAddressId)) &&
    Boolean(expectedReturnDate) &&
    lines.length > 0

  // Create-only page; the snapshot is the hardcoded defaults.
  const initialReturnDate = useRef(expectedReturnDate).current
  const initialValues = {
    sourceType: "account",
    leadId: "",
    dealId: "",
    accountId: "",
    contactId: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    shippingAddressId: "",
    shippingLine1: "",
    shippingCity: "",
    shippingState: "",
    shippingPincode: "",
    expectedReturnDate: initialReturnDate,
    notes: "",
    lineCount: 0,
  }
  const currentValues = {
    sourceType,
    leadId,
    dealId,
    accountId,
    contactId,
    contactName,
    contactPhone,
    contactEmail,
    shippingAddressId,
    shippingLine1,
    shippingCity,
    shippingState,
    shippingPincode,
    expectedReturnDate,
    notes,
    lineCount: lines.length,
  }
  const submitInFlight = createDemoRequest.isPending || createDemoRequest.isSuccess
  const isDirty = !submitInFlight && !deepEqual(currentValues, initialValues)

  return {
    demoNumber,
    sourceType,
    sourceOption, setSourceOption,
    setSelectedLead,
    leadId, setLeadId,
    dealId, setDealId,
    accountId, setAccountId,
    accountOption, setAccountOption,
    contactId, setContactId,
    contactOption, setContactOption,
    contactName, setContactName,
    contactPhone, setContactPhone,
    contactEmail, setContactEmail,
    shippingAddressId, setShippingAddressId,
    shippingLine1, setShippingLine1,
    shippingCity, setShippingCity,
    shippingState, setShippingState,
    shippingPincode, setShippingPincode,
    expectedReturnDate, setExpectedReturnDate,
    todayIso,
    notes, setNotes,
    lines, setLines,
    shippingAddresses,
    shippingAddressesQuery,
    shippingSelectOpen, setShippingSelectOpen,
    addAddrOpen, setAddAddrOpen,
    editingAddr, setEditingAddr,
    addContactOpen, setAddContactOpen,
    editingContact, setEditingContact,
    useLeadOptions,
    useDealOptions,
    useContactOptionsForSelectedAccount,
    handleAccountPick,
    handleLeadPick,
    handleDealPick,
    handleContactPick,
    resetSource,
    totalQty, totalAmount,
    handleSubmit,
    isFormValid,
    submitInFlight,
    isDirty,
    errors, clearError,
    goBack,
  }
}

export type DemoRequestFormController = ReturnType<typeof useDemoRequestForm>
