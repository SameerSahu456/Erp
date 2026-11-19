import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { AsyncSelectOption } from '@/components/ui/async-select'
import { useFormErrors } from '@/hooks/use-form-errors'
import { uploadAttachment } from '@modules/attachments'

import type { AccountDocumentType } from '../../constants/account-documents'
import { useAccountAddresses } from '../../hooks/accounts/useAccounts'
import { useContactOptions } from '../../hooks/contacts/useContacts'
import { useCreateDemoRequest } from '../../hooks/demo-requests/useDemoRequests'
import { istDateInDays, todayISTDate } from '../../lib/demo-requests/dates'
import type {
  AccountAddressWire,
  ContactListItem,
  DemoRequestCreatePayload,
  DemoRequestWire,
} from '../../api'
import { buildDemoItems, demoLinesTotals, type DraftLine } from './demo-items'
import { DEMO_REQUESTS_STRINGS as S, formatRupees } from './demo-requests.strings'

export interface ClosedWonDemoFormState {
  isValid: boolean
  isPending: boolean
  isDirty: boolean
  summary: string
}

export interface UseClosedWonDemoFormArgs {
  entityType: 'lead' | 'deal'
  entityId: string
  accountId?: string
  leadAccount?: NonNullable<DemoRequestCreatePayload['account']>
  leadContact?: NonNullable<DemoRequestCreatePayload['contact_details']>
  /** Step-1 KYC documents to attach to the provisioned account post-create. */
  documents?: Partial<Record<AccountDocumentType, File>>
  onStateChange: (state: ClosedWonDemoFormState) => void
  onCreated: (demoRequest: DemoRequestWire) => void
}

// All state, derivation, validation and submit for the Closed-Won → Demo
// Request branch, extracted so ClosedWonDemoForm is a thin render
// (Coding-guideline §17). Returns everything the form markup consumes.
export function useClosedWonDemoForm({
  entityType,
  entityId,
  accountId,
  leadAccount,
  leadContact,
  documents,
  onStateChange,
  onCreated,
}: UseClosedWonDemoFormArgs) {
  const isLead = entityType === 'lead'
  const { errors, setErrors, clearError, clearAll } = useFormErrors()
  const createDemoRequest = useCreateDemoRequest()

  // Today (IST calendar day) as YYYY-MM-DD — the `min` for the return-date
  // picker and the floor for its validation; a demo can't be due back before
  // today. IST, not UTC — see lib/demo-requests/dates.ts.
  const todayIso = useMemo(() => todayISTDate(), [])
  const defaultReturnDate = useMemo(() => istDateInDays(14), [])

  // The Closed-Won Demo Request keeps its own item list — it never inherits
  // the Sales Order's line items. Always start empty so the user picks demo
  // items fresh (no shared/"common" list between the SO and the DR).
  const [lines, setLines] = useState<DraftLine[]>([])
  const [expectedReturnDate, setExpectedReturnDate] = useState(defaultReturnDate)
  const [notes, setNotes] = useState('')

  // Deal branch — contact + shipping address pickers.
  const [contactId, setContactId] = useState('')
  const [contactOption, setContactOption] = useState<AsyncSelectOption | null>(
    null,
  )
  const [shippingAddressId, setShippingAddressId] = useState('')

  // Inline-create affordances (deal branch only — account exists). The Select
  // is controlled so the in-dropdown "Add" button can close it before the
  // dialog opens (Base UI doesn't auto-close on a non-item click).
  const [shippingSelectOpen, setShippingSelectOpen] = useState(false)
  const [addAddrOpen, setAddAddrOpen] = useState(false)
  // null → add a new shipping address; a row → edit that account address.
  const [editingAddr, setEditingAddr] = useState<AccountAddressWire | null>(null)
  const [addContactOpen, setAddContactOpen] = useState(false)
  // null → add flow; a row → edit that contact in the inline dialog.
  const [editingContact, setEditingContact] = useState<ContactListItem | null>(
    null,
  )

  // Lead branch — inline shipping address.
  const [shippingLine1, setShippingLine1] = useState('')
  const [shippingLine2, setShippingLine2] = useState('')
  const [shippingCity, setShippingCity] = useState('')
  const [shippingState, setShippingState] = useState('')
  const [shippingPincode, setShippingPincode] = useState('')

  // Fetch all ACTIVE addresses and narrow client-side — the backend matches
  // `address_type` exactly, so filtering by 'Shipping' server-side would drop
  // 'Both'-typed addresses, which serve shipping too (same rationale as
  // useDemoRequestForm).
  const shippingAddressesQuery = useAccountAddresses(
    !isLead ? (accountId ?? '') : '',
    { status: 'Active' },
    { enabled: !isLead && Boolean(accountId) },
  )
  const shippingAddresses = (shippingAddressesQuery.data ?? []).filter(
    (a) => a.address_type === 'Shipping' || a.address_type === 'Both',
  )

  // Effective shipping selection (deal branch): the explicit pick, or — when
  // the account has exactly one shipping address — that lone address.
  // Derived rather than written through an effect.
  const effectiveShippingId =
    shippingAddressId ||
    (!isLead && shippingAddresses.length === 1
      ? (shippingAddresses[0]?.id ?? '')
      : '')

  // Contact prefetch — feeds the lone-contact auto-select below. Same params
  // as `useContactOptionsForAccount`'s first page, so it dedupes in cache
  // with the AsyncSelect's own fetch.
  const contactPrefetchQuery = useContactOptions('', {
    accountId: accountId ?? '',
    enabled: !isLead && Boolean(accountId),
  })

  // Effective contact selection (deal branch): the explicit pick, or a sensible
  // default. Default priority: (1) the contact whose PRIMARY account is the
  // selected account (first such when several share it), then (2) the lone
  // contact when the account has exactly one linked. Derived, not an effect.
  const defaultContact = useMemo(() => {
    if (isLead || !accountId) return null
    const firstPage = contactPrefetchQuery.data?.pages[0]
    if (!firstPage) return null
    const primaryMatch = firstPage.items.find(
      (c) => c.primary_account_id === accountId,
    )
    if (primaryMatch) return primaryMatch
    if (firstPage.total === 1 && firstPage.items.length === 1) {
      return firstPage.items[0] ?? null
    }
    return null
  }, [isLead, accountId, contactPrefetchQuery.data?.pages])
  const effectiveContactId = contactId || defaultContact?.id || ''
  const effectiveContactOption: AsyncSelectOption | null =
    contactOption ??
    (defaultContact ? { id: defaultContact.id, label: defaultContact.name } : null)

  // Contact dropdown scoped to the deal's account.
  function useContactOptionsForAccount(
    search: string,
    options?: { enabled?: boolean },
  ) {
    return useContactOptions(search, {
      accountId: accountId ?? '',
      enabled: Boolean(accountId) && (options?.enabled ?? true),
    })
  }

  function handleContactPick(contact: ContactListItem) {
    setContactId(contact.id)
    setContactOption({ id: contact.id, label: contact.name })
    clearError('contactId')
  }

  const leadContactHasReach = Boolean(
    leadContact?.email?.trim() || leadContact?.phone?.trim(),
  )

  // ── Derived state reported to the parent footer ──
  const items = useMemo(() => buildDemoItems(lines), [lines])
  const { totalQty, totalAmount } = demoLinesTotals(lines)

  const isValid =
    items.length > 0 &&
    Boolean(expectedReturnDate) &&
    expectedReturnDate >= todayIso &&
    (isLead
      ? Boolean(leadContact?.name) &&
        leadContactHasReach &&
        Boolean(
          shippingLine1.trim() &&
            shippingCity.trim() &&
            shippingState.trim() &&
            shippingPincode.trim(),
        )
      : Boolean(accountId && effectiveContactId && effectiveShippingId))

  const submitInFlight = createDemoRequest.isPending || createDemoRequest.isSuccess

  const isDirty =
    !submitInFlight &&
    (lines.length > 0 ||
      notes.trim() !== '' ||
      expectedReturnDate !== defaultReturnDate ||
      (isLead
        ? Boolean(
            shippingLine1 ||
              shippingLine2 ||
              shippingCity ||
              shippingState ||
              shippingPincode,
          )
        : Boolean(contactId || shippingAddressId)))

  const summary = isValid
    ? `${S.form.footerSummary(totalQty)}${formatRupees(totalAmount)}`
    : ''

  useEffect(() => {
    onStateChange({ isValid, isPending: submitInFlight, isDirty, summary })
  }, [isValid, submitInFlight, isDirty, summary, onStateChange])

  async function handleSubmit() {
    if (submitInFlight) return
    const V = S.form.validation
    const e: Record<string, string> = {}

    if (isLead) {
      if (!leadContact?.name?.trim()) {
        e.contact = V.leadContactNameMissing
      } else if (!leadContactHasReach) {
        e.contact = V.leadContactReachMissing
      }
      if (!shippingLine1.trim()) e.shippingAddress = V.shippingLine1Required
      if (!shippingCity.trim()) e.shippingCity = V.cityRequired
      if (!shippingState.trim()) e.shippingState = V.stateRequired
      if (!shippingPincode.trim())
        e.shippingPincode = V.pincodeRequired
      else if (!/^\d{6}$/.test(shippingPincode.trim()))
        e.shippingPincode = V.pincodeInvalid
    } else {
      if (!accountId) e.contactId = V.accountMissingOnDeal
      if (!effectiveContactId) e.contactId = V.selectContact
      if (!effectiveShippingId) e.shippingAddress = V.selectShippingAddress
    }

    if (!expectedReturnDate) {
      e.expectedReturnDate = V.returnDateRequired
    } else if (expectedReturnDate < todayIso) {
      e.expectedReturnDate = V.returnDateInPast
    }

    const builtItems = buildDemoItems(lines)
    if (builtItems.length === 0) e.items = V.addItem
    else if (builtItems.length > 100) e.items = V.tooManyItems

    if (Object.keys(e).length > 0) {
      setErrors(e)
      toast.error(S.toast.fixHighlightedFields)
      return
    }
    clearAll()

    const base = {
      source: entityType,
      source_type: entityType,
      source_id: entityId,
      expected_return_date: expectedReturnDate,
      auto_submit: true,
      notes: notes.trim() || undefined,
      items: builtItems,
    }
    const payload: DemoRequestCreatePayload = isLead
      ? {
          ...base,
          account: leadAccount,
          contact_details: leadContact,
          shipping_address: {
            line1: shippingLine1.trim(),
            line2: shippingLine2.trim() || undefined,
            city: shippingCity.trim(),
            state: shippingState.trim(),
            pincode: shippingPincode.trim(),
            is_default: true,
          },
        }
      : {
          ...base,
          account_id: accountId,
          contact_id: effectiveContactId,
          shipping_address_id: effectiveShippingId,
        }

    let created: DemoRequestWire
    try {
      created = await createDemoRequest.mutateAsync(payload)
    } catch {
      // The mutation's onError toast already reported the failure; swallowing
      // here just prevents an unhandled rejection. The form stays filled so
      // the user can retry.
      return
    }
    // The create hook stays toast-silent (each flow raises its own, more
    // specific toast) — announce with the demo number here.
    toast.success(S.toast.createdPendingApproval(created.demo_number))

    // Attach Step-1 KYC documents onto the account the demo request just
    // provisioned/linked. The demo-request API has no multipart slot for them,
    // so we upload them here against the returned `account_id` via the shared
    // attachments endpoint (entity_type 'crm_account'). Best-effort: a failed
    // upload warns but never blocks the (already-created) demo request — the
    // user can re-add the doc from the account page.
    await uploadLeadDocuments(created.account_id)

    onCreated(created)
  }

  async function uploadLeadDocuments(accountId?: string | null) {
    if (!isLead || !accountId || !documents) return
    const entries = (
      Object.entries(documents) as [AccountDocumentType, File | undefined][]
    ).filter((entry): entry is [AccountDocumentType, File] => entry[1] instanceof File)
    if (entries.length === 0) return

    const results = await Promise.allSettled(
      entries.map(([documentType, file]) =>
        uploadAttachment({
          file,
          document_type: documentType,
          entity_type: 'crm_account',
          entity_id: accountId,
        }),
      ),
    )
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      toast.warning(S.toast.documentsUploadFailed(failed))
    }
  }

  return {
    isLead,
    errors,
    clearError,
    todayIso,
    lines,
    setLines,
    expectedReturnDate,
    setExpectedReturnDate,
    notes,
    setNotes,
    contactId,
    setContactId,
    setContactOption,
    setShippingAddressId,
    shippingSelectOpen,
    setShippingSelectOpen,
    addAddrOpen,
    setAddAddrOpen,
    editingAddr,
    setEditingAddr,
    addContactOpen,
    setAddContactOpen,
    editingContact,
    setEditingContact,
    shippingLine1,
    setShippingLine1,
    shippingLine2,
    setShippingLine2,
    shippingCity,
    setShippingCity,
    shippingState,
    setShippingState,
    shippingPincode,
    setShippingPincode,
    shippingAddresses,
    shippingAddressesQuery,
    effectiveShippingId,
    effectiveContactOption,
    useContactOptionsForAccount,
    handleContactPick,
    handleSubmit,
    leadContactHasReach,
  }
}
