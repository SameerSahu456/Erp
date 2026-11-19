import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { useNavigateBack } from "@/hooks/use-navigate-back"
import { useFormErrors } from "@/hooks/use-form-errors"
import { deepEqual } from "@/lib/deep-equal"
import { validateName, validatePhoneIndia } from "@/modules/crm/lib/validation"
import { findOrphanedAccounts } from "@/modules/crm/lib/contactAccountGuard"
import { ApiError } from "@/shared/api/envelope"

import {
  CONTACT_DEPARTMENT_OPTIONS,
  type ContactEmailExistsDetail,
  type ContactStatus,
  type ContactUpsertPayload,
} from "../../api"
import {
  useAddContactAccountLink,
  useContact,
  useContactAccounts,
  useCreateContact,
  usePromoteContactAccountPrimary,
  useRemoveContactAccountLink,
  useUpdateContact,
} from "./useContacts"
import { useAccount } from "../accounts/useAccounts"
import { CONTACTS_STRINGS } from "../../components/contacts/contacts.strings"
import type { ContactAccountOption } from "../../components/contacts/ContactAccountsSelect"

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Container logic for the Contact create/edit form: identity fields, the linked-
// account picker, hydration, validation, account-link sync, and submit.
export function useContactForm() {
  const { id: contactId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!contactId

  // When the create form is opened from an Account detail page's Contacts
  // tab, the link carries `?accountId=<uuid>` so we pre-link the new contact
  // to that account and lock the chip — users can't unlink the originating
  // account from this surface.
  const [searchParams] = useSearchParams()
  const presetAccountId = !isEdit ? searchParams.get("accountId") : null
  const presetAccountQuery = useAccount(presetAccountId ?? undefined)
  const lockedAccountIds = useMemo(
    () => (presetAccountId ? [presetAccountId] : []),
    [presetAccountId],
  )

  const {
    data: existing,
    isLoading: isLoadingContact,
    isError: isContactError,
  } = useContact(contactId)

  // In edit mode the contact's live account links live on a sub-route.
  // Use them to seed the picker so the chips show real names + primary star.
  const { data: liveLinks } = useContactAccounts(contactId)

  const backHref = isEdit ? `/crm/contacts/${contactId}` : "/crm/contacts"
  const goBack = useNavigateBack(backHref)

  // ── Local state ─────────────────────────────────────────────────────
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [altPhone, setAltPhone] = useState("")
  const [designation, setDesignation] = useState("")
  const [department, setDepartment] = useState<string>("")
  const [status, setStatus] = useState<ContactStatus>("Active")

  const [accountOptions, setAccountOptions] = useState<ContactAccountOption[]>([])
  const [primaryAccountId, setPrimaryAccountId] = useState<string | null>(null)

  const [hydrated, setHydrated] = useState(false)
  // 409 dedupe banner state — set when create returns CONTACT_EMAIL_EXISTS.
  const [duplicate, setDuplicate] = useState<ContactEmailExistsDetail | null>(null)

  // Hydrate state once when `existing` lands (edit mode).
  useEffect(() => {
    if (!existing || hydrated) return
    setName(existing.name)
    setEmail(existing.email ?? "")
    setPhone(existing.phone ?? "")
    setAltPhone(existing.alt_phone ?? "")
    setDesignation(existing.designation ?? "")
    setDepartment(existing.department ?? "")
    setStatus(existing.status)
    setPrimaryAccountId(existing.primary_account_id ?? null)
    // Embedded `accounts[]` carries the names — seed chips directly.
    setAccountOptions(
      existing.accounts.map((a) => ({
        id: a.account_id,
        label: a.account_name,
      })),
    )
    setHydrated(true)
  }, [existing, hydrated])

  // Create flow only: pre-link the originating account from `?accountId=…`
  // once we've resolved its name. The chip is then locked (see lockedIds
  // pass-through to <ContactAccountsSelect>). Idempotent — won't re-add if
  // the user already has it in the picker.
  useEffect(() => {
    if (isEdit || !presetAccountId) return
    const account = presetAccountQuery.data
    if (!account) return
    setAccountOptions((prev) =>
      prev.some((o) => o.id === presetAccountId)
        ? prev
        : [...prev, { id: presetAccountId, label: account.name }],
    )
    setPrimaryAccountId((prev) => prev ?? presetAccountId)
  }, [isEdit, presetAccountId, presetAccountQuery.data])

  // If the live link list updates after hydration (e.g. user added/removed
  // accounts on this page in edit mode), keep chips in sync. The detail
  // query is the source of truth for primary, so reflect it here too.
  useEffect(() => {
    if (!isEdit || !hydrated || !liveLinks) return
    setAccountOptions((prev) => {
      // Build a quick lookup of the current label per id so we don't lose
      // a chip's name when liveLinks (which doesn't carry names) is what
      // we'd otherwise rebuild from.
      const labelById = new Map(prev.map((p) => [p.id, p.label]))
      // Pull names from the embedded `accounts[]` on the detail response;
      // it's authoritative for both ids and names.
      const namesFromDetail = new Map(
        (existing?.accounts ?? []).map((a) => [a.account_id, a.account_name]),
      )
      return liveLinks.map((l) => ({
        id: l.account_id,
        label:
          namesFromDetail.get(l.account_id) ??
          labelById.get(l.account_id) ??
          "Account",
      }))
    })
    const newPrimary = liveLinks.find((l) => l.is_primary)?.account_id ?? null
    setPrimaryAccountId(newPrimary)
  }, [isEdit, hydrated, liveLinks, existing?.accounts])

  // Department: include saved value if it's not in the hint list so the
  // Select can render it (same pattern as industry on AccountFormPage).
  const departmentOptions = useMemo(() => {
    if (!department || CONTACT_DEPARTMENT_OPTIONS.includes(department))
      return CONTACT_DEPARTMENT_OPTIONS
    return [department, ...CONTACT_DEPARTMENT_OPTIONS]
  }, [department])

  const createMut = useCreateContact()
  const updateMut = useUpdateContact(contactId ?? "")
  const addLinkMut = useAddContactAccountLink(contactId ?? "")
  const removeLinkMut = useRemoveContactAccountLink(contactId ?? "")
  const promotePrimaryMut = usePromoteContactAccountPrimary(contactId ?? "")

  const { errors, setErrors, clearError, clearAll } = useFormErrors()

  const canSave = useMemo(() => {
    if (createMut.isPending || updateMut.isPending) return false
    return true
  }, [createMut.isPending, updateMut.isPending])

  // Snapshot of the form as loaded. Edit mode reflects `existing`; create mode
  // mirrors the hardcoded defaults. Account links in edit mode are excluded
  // from the dirty check because they sync via their own sub-route mutations
  // and the liveLinks effect can rewrite chips at any time.
  const initialValues = useMemo(() => {
    if (isEdit && existing) {
      return {
        name: existing.name,
        email: existing.email ?? "",
        phone: existing.phone ?? "",
        altPhone: existing.alt_phone ?? "",
        designation: existing.designation ?? "",
        department: existing.department ?? "",
        status: existing.status,
        accountOptions: [] as ContactAccountOption[],
        primaryAccountId: null as string | null,
      }
    }
    return {
      name: "",
      email: "",
      phone: "",
      altPhone: "",
      designation: "",
      department: "",
      status: "Active" as ContactStatus,
      accountOptions: [] as ContactAccountOption[],
      primaryAccountId: null as string | null,
    }
  }, [isEdit, existing])

  const currentValues = useMemo(
    () => ({
      name,
      email,
      phone,
      altPhone,
      designation,
      department,
      status,
      accountOptions: isEdit ? [] : accountOptions,
      primaryAccountId: isEdit ? null : primaryAccountId,
    }),
    [name, email, phone, altPhone, designation, department, status, accountOptions, primaryAccountId, isEdit],
  )

  const submitInFlight =
    createMut.isPending || updateMut.isPending || createMut.isSuccess || updateMut.isSuccess
  const isDirty =
    !submitInFlight &&
    (!isEdit || hydrated) &&
    !deepEqual(currentValues, initialValues)

  function validateForm(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = CONTACTS_STRINGS.validation.nameRequired
    else {
      const err = validateName(name, {
        maxLength: 100,
        label: CONTACTS_STRINGS.validation.nameLabel,
      })
      if (err) e.name = err
    }
    if (!email.trim() && !phone.trim()) {
      e.contact = CONTACTS_STRINGS.validation.contactRequired
    } else if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      e.email = CONTACTS_STRINGS.validation.emailInvalid
    }
    const phoneErr = validatePhoneIndia(phone)
    if (phoneErr) e.phone = phoneErr
    const altPhoneErr = validatePhoneIndia(altPhone)
    if (altPhoneErr) e.altPhone = altPhoneErr
    // Create flow requires the new contact to be linked to at least one
    // account. Edit mode is excluded — links there sync via the sub-routes
    // and the dirty check ignores them.
    if (!isEdit && accountOptions.length === 0) {
      e.accountOptions = CONTACTS_STRINGS.validation.accountRequired
    }
    if (
      primaryAccountId &&
      accountOptions.length > 0 &&
      !accountOptions.some((o) => o.id === primaryAccountId)
    ) {
      e.primaryAccountId = CONTACTS_STRINGS.validation.primaryMustBeLinked
    }
    return e
  }

  function buildCreatePayload(): ContactUpsertPayload {
    const payload: ContactUpsertPayload = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      alt_phone: altPhone.trim() || null,
      designation: designation.trim() || null,
      department: department.trim() || null,
      status,
    }
    if (accountOptions.length > 0) {
      payload.account_ids = accountOptions.map((o) => o.id)
      if (primaryAccountId) payload.primary_account_id = primaryAccountId
    }
    return payload
  }

  function buildUpdatePayload(): ContactUpsertPayload {
    // PATCH rejects account_ids (extra='forbid'). Link diffs go through the
    // sub-routes below in `syncLinks` so we don't blow up the request.
    return {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      alt_phone: altPhone.trim() || null,
      designation: designation.trim() || null,
      department: department.trim() || null,
      status,
    }
  }

  // Compute add/remove/promote-primary against the live link set, fire the
  // sub-route mutations sequentially. The hooks invalidate per-call; we let
  // the optimistic-feeling UX rely on those.
  async function syncLinks() {
    if (!contactId || !liveLinks) return
    const currentIds = new Set(liveLinks.map((l) => l.account_id))
    const desiredIds = new Set(accountOptions.map((o) => o.id))

    const toAdd = [...desiredIds].filter((id) => !currentIds.has(id))
    const toRemove = [...currentIds].filter((id) => !desiredIds.has(id))

    for (const accountId of toAdd) {
      await addLinkMut.mutateAsync({
        account_id: accountId,
        is_primary: accountId === primaryAccountId,
      })
    }
    // Primary swap among already-linked accounts — MUST run before removals.
    // The backend rejects unlinking a still-primary account while other links
    // exist (PRIMARY_ACCOUNT_REQUIRED), so demote the old primary first;
    // otherwise removing the previously-preferred account 400s.
    const currentPrimary = liveLinks.find((l) => l.is_primary)?.account_id ?? null
    if (
      primaryAccountId &&
      currentPrimary !== primaryAccountId &&
      !toAdd.includes(primaryAccountId)
    ) {
      await promotePrimaryMut.mutateAsync(primaryAccountId)
    }
    // Removals last: the old primary (if any) is now demoted, so unlinking it
    // is allowed.
    for (const accountId of toRemove) {
      await removeLinkMut.mutateAsync(accountId)
    }
  }

  async function handleSave() {
    setDuplicate(null)
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      toast.error(CONTACTS_STRINGS.validation.fixHighlighted)
      return
    }
    // Edit mode: removing an account chip unlinks this contact from it on save.
    // Block if any such account would be left with no contact at all (every
    // account must keep at least one contact).
    if (isEdit && contactId && liveLinks) {
      const desiredIds = new Set(accountOptions.map((o) => o.id))
      const toRemove = liveLinks.filter((l) => !desiredIds.has(l.account_id))
      if (toRemove.length > 0) {
        const nameById = new Map(
          (existing?.accounts ?? []).map((a) => [a.account_id, a.account_name]),
        )
        const orphaned = await findOrphanedAccounts(
          contactId,
          toRemove.map((l) => ({
            accountId: l.account_id,
            accountName: nameById.get(l.account_id) ?? "this account",
          })),
        )
        if (orphaned.length > 0) {
          toast.error(
            CONTACTS_STRINGS.validation.lastContactBlocked(
              orphaned.map((o) => o.accountName),
            ),
          )
          return
        }
      }
    }
    clearAll()
    if (isEdit && contactId) {
      updateMut.mutate(buildUpdatePayload(), {
        onSuccess: async () => {
          try {
            await syncLinks()
          } catch (e) {
            // Sub-route failures already toast inside the hook; surface
            // navigation regardless so the user isn't trapped on the page.
            console.error(e)
          }
          navigate(-1)
        },
      })
    } else {
      createMut.mutate(buildCreatePayload(), {
        onSuccess: (created) => navigate(`/crm/contacts/${created.id}`, { replace: true }),
        onError: (error) => {
          if (
            error instanceof ApiError &&
            error.businessCode === "CONTACT_EMAIL_EXISTS"
          ) {
            const detail = error.failureData as
              | ContactEmailExistsDetail
              | null
            if (detail?.existing_contact_id) {
              setDuplicate(detail)
              return
            }
          }
          toast.error(error.message || CONTACTS_STRINGS.toast.createFailed)
        },
      })
    }
  }

  function handleCancel() {
    goBack()
  }

  return {
    isEdit,
    contactId,
    existing,
    isLoadingContact,
    isContactError,
    hydrated,
    backHref,
    duplicate,
    canSave,
    isDirty,
    errors,
    clearError,
    handleSave,
    handleCancel,
    // fields
    name, setName,
    email, setEmail,
    phone, setPhone,
    altPhone, setAltPhone,
    designation, setDesignation,
    department, setDepartment,
    departmentOptions,
    status, setStatus,
    accountOptions, setAccountOptions,
    primaryAccountId, setPrimaryAccountId,
    lockedAccountIds,
  }
}

export type ContactFormController = ReturnType<typeof useContactForm>
