import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { useFormErrors } from "@/hooks/use-form-errors"
import { useAuth } from "@/shared/auth/use-auth"
import { useUsersByIds } from "@modules/users"
import {
  validateCurrency,
  validateFreeText,
  validateInteger,
  validateUrl,
} from "@/modules/crm/lib/validation"
import type { AccountDocumentType } from "@/modules/crm/constants/account-documents"
import type { AsyncOption } from "@/components/ui/async-multi-select"
import { useNavigateBack } from "@/hooks/use-navigate-back"
import { deepEqual } from "@/lib/deep-equal"

import {
  ACCOUNT_TYPE_VALUES,
  INDUSTRY_OPTIONS,
  fetchAccounts,
  type AccountStatus,
  type AccountTagWire,
  type AccountTypeWire,
  type AccountUpsertPayload,
  type AccountInlineContactPayload,
  type CompanySizeWire,
  type CreateAccountFiles,
  promoteContactAccountPrimary,
} from "../../api"
import { ACCOUNTS_STRINGS as S } from "../../components/accounts/accounts.strings"
import {
  useAccount,
  useCreateAccount,
  useSetParentAccount,
  useUpdateAccount,
} from "./useAccounts"
import {
  draftsToWirePayload,
  type DraftAddress,
} from "../../components/accounts/AccountAddressesEditor"
import type { OwnerOption } from "../../components/accounts/AccountOwnersSelect"
import { isOwnerExempt } from "../../crm-roles"
import { dealsInChannel } from "@/constants/channel-tags"
import { GST_REGEX, PAN_REGEX } from "../../components/accounts/accountForm.constants"

// Container logic for the Account create/edit form: company/size/ownership
// fields, KYC document slots, inline addresses + contacts (create) or their
// live editors (edit), hydration, validation, and submit.
export function useAccountForm() {
  const { id: accountId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!accountId

  // Create mode: a child account launched from a parent's "Create new account"
  // arrives as ?parentAccountId=… — pre-select that parent and lock the field
  // so the new account stays a child of the originating account (the user can't
  // change or remove the parent). See AccountHierarchyCards.
  const [searchParams] = useSearchParams()
  const prefillParentId = isEdit ? null : searchParams.get("parentAccountId")

  // Create mode launched from a child's "Create new parent account" — inverse
  // of `parentAccountId`. The NEW account becomes the PARENT of an existing
  // (child) account. The new account is still Pending approval, and the generic
  // link endpoints refuse a Pending parent, so the child id rides along in the
  // create payload (`adopt_child_account_id`) and the backend links the child —
  // and flattens its sub-accounts — in the same transaction. The new account's
  // own parent field stays empty/editable (we don't lock it).
  const setParentForChildId = isEdit ? null : searchParams.get("setParentForChild")
  // Which create flow this is — drives the page heading ("Create Child Account"
  // / "Create Parent Account" instead of the generic "Create Account").
  const createKind: "account" | "child" | "parent" = setParentForChildId
    ? "parent"
    : prefillParentId
      ? "child"
      : "account"

  // The existing account this new one will parent — read only for its type, so
  // the new parent defaults to (and is locked to) the child's account type.
  const { data: setParentForChildAccount } = useAccount(setParentForChildId)

  // The pre-selected parent (create-child path). If it is ITSELF a child, the
  // 2-level policy forbids creating a sub-account under it — guarded at save.
  const { data: prefillParentAccount } = useAccount(prefillParentId)
  const prefillParentIsChild = !!prefillParentAccount?.parent_account_id
  // Lock the parent field for a create-child launch — but not if the chosen
  // parent is itself a child (then we leave it editable so the user can clear
  // the invalid parent rather than getting stuck).
  const isParentLocked = !isEdit && !!prefillParentId && !prefillParentIsChild

  const {
    data: existing,
    isLoading: isLoadingAccount,
    isError: isAccountError,
  } = useAccount(accountId)

  // Edit-mode hierarchy: whether THIS account already has sub-accounts. Drives
  // both the re-parent warning in the form and the cascade path on save — when
  // true, setting a parent moves this account AND all its children under the
  // new parent (2-level policy). Mirrors the detail page's Set-parent dialog.
  const hasChildren = !!existing?.has_children

  const backHref = isEdit ? `/crm/accounts/${accountId}` : "/crm/accounts"
  const goBack = useNavigateBack(backHref)

  const [name, setName] = useState("")
  const [industry, setIndustry] = useState<string>("")
  // The type the user picked. The effective `accountType` (below) falls back to
  // the launching account's type on a create-child / create-parent launch.
  const [pickedAccountType, setAccountType] = useState<AccountTypeWire | "">("")
  const [status, setStatus] = useState<AccountStatus>("Active")
  const [tag, setTag] = useState<AccountTagWire | "">("")
  const [website, setWebsite] = useState("")
  const [revenue, setRevenue] = useState("")
  const [companySize, setCompanySize] = useState<CompanySizeWire | "">("")
  const [employees, setEmployees] = useState("")
  const [pan, setPan] = useState("")
  const [gst, setGst] = useState("")
  const [categoriesInterested, setCategoriesInterested] = useState<AsyncOption[]>([])
  const [categoriesBought, setCategoriesBought] = useState<AsyncOption[]>([])

  const [ownerOptions, setOwnerOptions] = useState<OwnerOption[]>([])
  const [primaryOwnerId, setPrimaryOwnerId] = useState<string | null>(null)

  // Owners hydrated on edit only carry {id, name} — no channel_tags. Re-fetch
  // each owner's detail so the type↔owner consistency check below has the tags
  // to validate against (freshly picked owners already carry them inline).
  const ownerTags = useUsersByIds(ownerOptions.map((o) => o.id))

  const [parentAccountId, setParentAccountId] = useState<string | null>(
    prefillParentId,
  )

  // The currently-selected parent's detail — used to validate at save that the
  // parent's account_type matches this account's type. The picker already
  // filters candidates by type, but a locked/prefilled parent (create-child) or
  // a type changed AFTER a parent was picked could still mismatch, so we re-check
  // on save. Cached: ParentAccountSelect already resolves this id for its label.
  const { data: selectedParentAccount } = useAccount(parentAccountId)

  const [drafts, setDrafts] = useState<DraftAddress[]>([])
  // Create-only: contacts staged to attach in the same POST /accounts call.
  const [contactRows, setContactRows] = useState<AccountInlineContactPayload[]>([])
  // Edit-only: primary-contact star choice, committed on Save via promote.
  const [pendingPrimaryContactId, setPendingPrimaryContactId] = useState<string | null>(null)

  // 2026-05-19: KYC document slots — create flow only.
  const [pendingFiles, setPendingFiles] = useState<
    Partial<Record<AccountDocumentType, File>>
  >({})

  // Hydrate state once when `existing` lands (edit mode).
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    if (!existing || hydrated) return
    setName(existing.name.toUpperCase())
    setIndustry(existing.industry ?? "")
    setAccountType(existing.account_type)
    setStatus(existing.status)
    setTag(existing.tag ?? "")
    setWebsite(existing.website ?? "")
    setRevenue(existing.revenue == null ? "" : String(existing.revenue))
    setCompanySize(existing.company_size ?? "")
    setEmployees(existing.employees == null ? "" : String(existing.employees))
    setPan(existing.pan_number ?? "")
    setGst(existing.gst_number ?? "")
    // Categories now arrive as `{id, name}` refs. Hydrate the picker with the
    // real id + display name. (Submit still projects `.label`/name to match the
    // current write contract — see the payload builder below.)
    setCategoriesInterested(
      (existing.categories_interested ?? []).map((c) => ({ id: c.id, label: c.name })),
    )
    setCategoriesBought(
      (existing.categories_bought ?? []).map((c) => ({ id: c.id, label: c.name })),
    )
    setPrimaryOwnerId(existing.primary_owner_id ?? null)
    setParentAccountId(existing.parent_account_id ?? null)
    setOwnerOptions(
      (existing.account_owner_ids ?? []).map((u) => ({ id: u.id, label: u.name })),
    )
    setHydrated(true)
  }, [existing, hydrated])

  // Account-type dropdown is scoped to what the logged-in user is allowed
  // to operate on — same rule as Lead/Deal forms.
  const { user: currentUser } = useAuth()
  const accountTypeOptions = useMemo<readonly AccountTypeWire[]>(() => {
    const allowed = currentUser?.channel_tags
    if (!allowed || allowed.length === 0) return ACCOUNT_TYPE_VALUES
    return ACCOUNT_TYPE_VALUES.filter((t) => allowed.includes(t))
  }, [currentUser?.channel_tags])

  // Launched from an account's detail page ("Create new account" under it, or
  // "Create new parent account" for it): default the type to THAT account's type
  // — a parent and its children share one type. Only when the user may operate
  // on that type; otherwise the field stays empty and editable.
  const launchAccountType =
    prefillParentAccount?.account_type ?? setParentForChildAccount?.account_type
  const prefilledAccountType: AccountTypeWire | "" =
    !isEdit && launchAccountType && accountTypeOptions.includes(launchAccountType)
      ? launchAccountType
      : ""
  const accountType: AccountTypeWire | "" = pickedAccountType || prefilledAccountType
  // Locked when the user has exactly one allowed type, or when the type came
  // from the launching account: a child and its parent must share one type, so
  // neither "Create new child account" nor "Create new parent account" may change it.
  const isAccountTypeLocked =
    !isEdit && (accountTypeOptions.length === 1 || prefilledAccountType !== "")

  // On-create auto-fill: Type if user has exactly one allowed value.
  const autoFilledRef = useRef(false)
  useEffect(() => {
    if (isEdit) return
    if (autoFilledRef.current) return
    if (!currentUser) return

    if (!accountType && accountTypeOptions.length === 1) {
      setAccountType(accountTypeOptions[0])
    }
    autoFilledRef.current = true
  }, [isEdit, currentUser, accountType, accountTypeOptions])

  // The backend accepts free strings for industry, but we surface a hint
  // list. If the saved account stores a value not in the hints, prepend it
  // so the Select can render the selected row.
  const industryOptions = useMemo(() => {
    if (!industry || INDUSTRY_OPTIONS.includes(industry)) return INDUSTRY_OPTIONS
    return [industry, ...INDUSTRY_OPTIONS]
  }, [industry])

  const createMut = useCreateAccount()
  const updateMut = useUpdateAccount(accountId ?? "")
  // Owns the parent change on save (edit mode). Same mutation the detail page's
  // Set-parent dialog uses: no children → bulk parent assignment; has children
  // → reparentWithChildren so the sub-accounts ride up to the new parent in one
  // transaction. The PATCH payload deliberately omits `parent_account_id` so
  // hierarchy is set through this dedicated, cascade-aware path only.
  const setParentMut = useSetParentAccount(accountId ?? "", { hasChildren })

  const { errors, setErrors, clearError, clearAll } = useFormErrors()

  // True while the pre-submit unique-name lookup is in flight, so the Save
  // button stays disabled until we know the name is free.
  const [isCheckingName, setIsCheckingName] = useState(false)

  const canSave = useMemo(() => {
    if (createMut.isPending || updateMut.isPending || isCheckingName) return false
    return true
  }, [createMut.isPending, updateMut.isPending, isCheckingName])

  const initialValues = useMemo(() => {
    if (isEdit && existing) {
      return {
        name: existing.name.toUpperCase(),
        industry: existing.industry ?? "",
        accountType: existing.account_type,
        status: existing.status,
        tag: existing.tag,
        website: existing.website ?? "",
        revenue: existing.revenue == null ? "" : String(existing.revenue),
        companySize: (existing.company_size ?? "") as CompanySizeWire | "",
        employees: existing.employees == null ? "" : String(existing.employees),
        pan: existing.pan_number ?? "",
        gst: existing.gst_number ?? "",
        categoriesInterested: (existing.categories_interested ?? []).map((c) => ({
          id: c.id,
          label: c.name,
        })),
        categoriesBought: (existing.categories_bought ?? []).map((c) => ({
          id: c.id,
          label: c.name,
        })),
        primaryOwnerId: existing.primary_owner_id ?? null,
        parentAccountId: existing.parent_account_id ?? null,
        ownerOptions: (existing.account_owner_ids ?? []).map((u) => ({
          id: u.id,
          label: u.name,
        })),
        drafts: [] as DraftAddress[],
      }
    }
    return {
      name: "",
      industry: "",
      accountType: prefilledAccountType,
      status: "Active" as AccountStatus,
      tag: "" as AccountTagWire | "",
      website: "",
      revenue: "",
      companySize: "" as CompanySizeWire | "",
      employees: "",
      pan: "",
      gst: "",
      categoriesInterested: [] as AsyncOption[],
      categoriesBought: [] as AsyncOption[],
      primaryOwnerId: null as string | null,
      parentAccountId: prefillParentId,
      ownerOptions: [] as OwnerOption[],
      drafts: [] as DraftAddress[],
    }
  }, [isEdit, existing, prefillParentId, prefilledAccountType])

  const currentValues = useMemo(
    () => ({
      name,
      industry,
      accountType,
      status,
      tag,
      website,
      revenue,
      companySize,
      employees,
      pan,
      gst,
      categoriesInterested,
      categoriesBought,
      primaryOwnerId,
      parentAccountId,
      ownerOptions,
      drafts: isEdit ? [] : drafts,
    }),
    [
      name,
      industry,
      accountType,
      status,
      tag,
      website,
      revenue,
      companySize,
      employees,
      pan,
      gst,
      categoriesInterested,
      categoriesBought,
      primaryOwnerId,
      parentAccountId,
      ownerOptions,
      drafts,
      isEdit,
    ],
  )

  const submitInFlight =
    createMut.isPending || updateMut.isPending || createMut.isSuccess || updateMut.isSuccess
  const isDirty =
    !submitInFlight &&
    (!isEdit || hydrated) &&
    !deepEqual(currentValues, initialValues)

  function buildPayload(): AccountUpsertPayload {
    const ownerIds = ownerOptions.map((o) => o.id)
    const payload: AccountUpsertPayload = {
      name: name.trim().toUpperCase(),
      account_type: accountType || undefined,
      status,
      tag: tag || undefined,
      industry: industry.trim() || null,
      website: website.trim() || null,
      company_size: companySize === "" ? null : companySize,
      employees: employees.trim() ? Number(employees) : null,
      revenue: revenue.trim() ? revenue.trim() : null,
      pan_number: pan.trim().toUpperCase() || null,
      gst_number: gst.trim().toUpperCase() || null,
      // Create only: the new account's parent is set inline. On edit the parent
      // is owned by the cascade-aware setParentMut path below (so children move
      // with it), so it's intentionally left out of the PATCH.
      // A new parent (create-parent launch) is a root account: it never has a
      // parent of its own, whatever the hidden picker may still hold.
      ...(isEdit ? {} : { parent_account_id: setParentForChildId ? null : parentAccountId }),
      // Create only: the child this new account will parent (see above).
      ...(!isEdit && setParentForChildId
        ? { adopt_child_account_id: setParentForChildId }
        : {}),
      // Send the selected category IDs (was bare names before the 2026-06
      // {id,name} migration). `o.id` is the real IMS category uuid — hydrated
      // from the GET response and set by the picker on selection.
      categories_interested: Array.from(
        new Set(categoriesInterested.map((o) => o.id)),
      ),
      categories_bought: Array.from(
        new Set(categoriesBought.map((o) => o.id)),
      ),
      account_owner_ids: ownerIds,
      primary_owner_id: primaryOwnerId ?? null,
    }
    if (!isEdit) {
      const wireAddresses = draftsToWirePayload(drafts)
      if (wireAddresses.length > 0) payload.addresses = wireAddresses
      if (contactRows.length > 0) payload.contacts = contactRows
    }
    return payload
  }

  // Map the per-slot file state to the multipart field names the backend's
  // create endpoint expects. Only create flow — edit uses the Documents tab.
  function collectCreateFiles(): CreateAccountFiles {
    const files: CreateAccountFiles = {}
    if (pendingFiles.pan_card) files.account_doc_pan_card = pendingFiles.pan_card
    if (pendingFiles.gst_certificate)
      files.account_doc_gst_certificate = pendingFiles.gst_certificate
    if (pendingFiles.aadhaar) files.account_doc_aadhaar = pendingFiles.aadhaar
    if (pendingFiles.msme) files.account_doc_msme = pendingFiles.msme
    if (pendingFiles.bank_statement)
      files.account_doc_bank_statement = pendingFiles.bank_statement
    return files
  }

  // Changing the type drops any already-picked owner that doesn't deal in the
  // new channel (matches the owner dropdown's channel scope), and clears the
  // primary if it was one of them. `channelTags == null`/`undefined` are kept
  // (can't prove a mismatch). validateForm is the save-time backstop.
  function handleAccountTypeChange(next: AccountTypeWire) {
    const prev = accountType
    setAccountType(next)
    clearError("accountType")
    if (!prev || prev === next) return

    const dropped = ownerOptions.filter((o) => {
      // Admin / superadmin oversee every channel — never dropped on a type change.
      const roles = o.roles ?? ownerTags.rolesById[o.id]
      if (isOwnerExempt(roles)) return false
      if (o.channelTags === undefined) return false
      return !dealsInChannel(o.channelTags, next)
    })
    if (dropped.length === 0) return

    const droppedIds = new Set(dropped.map((o) => o.id))
    setOwnerOptions((curr) => curr.filter((o) => !droppedIds.has(o.id)))
    if (primaryOwnerId && droppedIds.has(primaryOwnerId)) setPrimaryOwnerId(null)
    clearError("accountOwners")
    clearError("primaryOwnerId")
    toast.info(
      `Removed ${dropped.map((o) => o.label).join(", ")} from Account Owners — ${
        dropped.length === 1 ? "does" : "do"
      } not deal in ${next}.`,
    )
  }

  function validateForm(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = "Account name is required."
    else {
      // Free text — only length is enforced; spaces/digits are allowed.
      const err = validateFreeText(name, { maxLength: 100, label: "Company name" })
      if (err) e.name = err
    }
    if (!industry.trim()) e.industry = "Industry is required."
    if (!accountType) e.accountType = "Type is required."
    if (!tag) e.tag = "Tag is required."
    if (ownerOptions.length === 0) {
      e.accountOwners = "At least one account owner is required."
    } else if (
      primaryOwnerId &&
      !ownerOptions.some((o) => o.id === primaryOwnerId)
    ) {
      e.primaryOwnerId = "Primary owner must be one of the selected account owners."
    } else if (accountType) {
      // Type ↔ Account-Owner consistency: each owner must hold the chosen
      // account type in their channel_tags. `null` = no tags (superuser / role
      // with empty tags) → rejected too. Tags come from the picked option
      // (create) or from the re-fetched user detail (edit, via `ownerTags`).
      // `undefined` = detail not loaded yet → skipped (can't prove a mismatch,
      // mirrors the lead form's "skip while loading").
      const mismatched = ownerOptions.filter((o) => {
        // Admin / superadmin can own any channel → bypass the tag check.
        const roles = o.roles ?? ownerTags.rolesById[o.id]
        if (isOwnerExempt(roles)) return false
        const tags =
          o.channelTags !== undefined ? o.channelTags : ownerTags.channelTagsById[o.id]
        if (tags === undefined) return false
        return !dealsInChannel(tags, accountType)
      })
      if (mismatched.length > 0) {
        e.accountOwners = `${mismatched.map((o) => o.label).join(", ")} ${
          mismatched.length === 1 ? "does" : "do"
        } not deal in ${accountType}.`
      }
    }
    const websiteErr = validateUrl(website)
    if (websiteErr) e.website = websiteErr
    const employeesErr = validateInteger(employees, { min: 0, max: 9_999_999 })
    if (employeesErr) e.employees = employeesErr
    const revenueErr = validateCurrency(revenue, { min: 0 })
    if (revenueErr) e.revenue = revenueErr
    if (pan && !PAN_REGEX.test(pan.trim().toUpperCase())) {
      e.pan_number = "PAN must be 10 characters (e.g. ABCDE1234F)."
    }
    if (!gst.trim()) {
      e.gst_number = "GST number is required."
    } else if (!GST_REGEX.test(gst.trim().toUpperCase())) {
      e.gst_number = "GST must be 15 characters (e.g. 27ABCDE1234F1Z5)."
    }
    // Create-only: every account must be created with at least one contact,
    // and the backend allows at most one primary contact in the payload.
    if (!isEdit && contactRows.length === 0) {
      e.contacts = "At least one contact is required."
    } else if (!isEdit && contactRows.filter((c) => c.is_primary).length > 1) {
      e.contacts = "Only one contact can be marked primary."
    }
    // Parent ↔ account-type consistency: a parent must share this account's
    // type. The picker already filters candidates by type, but a locked/prefilled
    // parent (create-child) or a type changed AFTER a parent was picked could
    // still leave a mismatch, so we re-check here. Skipped while the parent's
    // detail is still loading (can't prove a mismatch) — backend stays the final
    // arbiter, same "skip while loading" stance as the owner-tags check above.
    if (
      accountType &&
      parentAccountId &&
      !setParentForChildId &&
      selectedParentAccount &&
      selectedParentAccount.account_type !== accountType
    ) {
      e.parentAccount = `Parent account must be of the same type (${accountType}).`
    }
    return e
  }

  // Account names must be unique. The list endpoint's `search` matches on the
  // name, so we fetch candidates and look for an exact (case-insensitive) hit —
  // names are stored uppercase, so we compare uppercase. Self is excluded so an
  // edit that keeps the name doesn't flag itself. Fails OPEN: a flaky check
  // shouldn't block a legitimate save (the backend stays the final arbiter).
  async function isAccountNameTaken(): Promise<boolean> {
    const target = name.trim().toUpperCase()
    if (!target) return false
    try {
      // Only an APPROVED account counts as a name clash — a Pending/Rejected
      // account with the same name is not treated as an existing duplicate.
      const res = await fetchAccounts({ search: target, approval_statuses: ["Approved"] })
      return res.items.some(
        (a) => a.name.trim().toUpperCase() === target && a.id !== accountId,
      )
    } catch {
      return false
    }
  }

  async function handleSave() {
    // 2-level policy: can't create a sub-account under an account that is
    // itself a child (defense-in-depth — the UI also hides this affordance for
    // child accounts). Guards the hand-crafted ?parentAccountId=<child> URL.
    if (!isEdit && parentAccountId && prefillParentIsChild) {
      toast.error(S.toast.childUnderChildBlocked)
      return
    }
    if (createMut.isPending || updateMut.isPending || isCheckingName) return
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      toast.error(S.toast.fixHighlighted)
      return
    }

    // Unique-name guard — run on create, and on edit only when the name
    // actually changed (no point re-checking an unchanged name).
    const nameChanged =
      !isEdit || name.trim().toUpperCase() !== (existing?.name ?? "").toUpperCase()
    if (nameChanged) {
      setIsCheckingName(true)
      let taken = false
      try {
        taken = await isAccountNameTaken()
      } finally {
        setIsCheckingName(false)
      }
      if (taken) {
        setErrors({ name: `An account named "${name.trim()}" already exists.` })
        toast.error(S.toast.fixHighlighted)
        return
      }
    }

    clearAll()
    const payload = buildPayload()
    if (isEdit && accountId) {
      // Did the parent actually change? Only then do we touch the hierarchy —
      // an unchanged parent skips the cascade call entirely.
      const parentChanged =
        (parentAccountId ?? null) !== (existing?.parent_account_id ?? null)
      updateMut.mutate(payload, {
        onSuccess: async () => {
          // Commit the staged primary-contact star (PATCH /accounts can't
          // carry it). promote is idempotent if it's already primary.
          if (pendingPrimaryContactId) {
            try {
              await promoteContactAccountPrimary(pendingPrimaryContactId, accountId)
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Failed to set primary contact",
              )
            }
          }
          // Apply the parent change through the cascade-aware path (same as the
          // detail page): when this account has children they move under the new
          // parent too. Navigate only after it settles so the toast/refetch land;
          // on failure the mutation surfaces the reason and we stay on the form.
          if (parentChanged) {
            setParentMut.mutate(parentAccountId, {
              onSuccess: () => navigate(-1),
            })
            return
          }
          navigate(-1)
        },
      })
    } else {
      const files = collectCreateFiles()
      createMut.mutate(
        { payload, files },
        {
          onSuccess: (created) => {
            // Launched as "create new parent for <child>": the backend already
            // linked the child under the new (Pending) parent, so land on the
            // child where the Parent card shows it awaiting approval.
            if (setParentForChildId) {
              toast.success(S.toast.parentAccountPendingApproval)
              navigate(`/crm/accounts/${setParentForChildId}`, { replace: true })
              return
            }
            navigate(`/crm/accounts/${created.id}`, { replace: true })
          },
        },
      )
    }
  }

  function handleCancel() {
    goBack()
  }

  return {
    isEdit,
    createKind,
    accountId,
    existing,
    isLoadingAccount,
    isAccountError,
    hydrated,
    backHref,
    canSave,
    isDirty,
    errors,
    clearError,
    handleSave,
    handleCancel,
    // company details
    name, setName,
    industry, setIndustry, industryOptions,
    accountType, setAccountType, handleAccountTypeChange, accountTypeOptions, isAccountTypeLocked,
    tag, setTag,
    website, setWebsite,
    pan, setPan,
    gst, setGst,
    // size & revenue
    companySize, setCompanySize,
    employees, setEmployees,
    revenue, setRevenue,
    // status & ownership
    status, setStatus,
    ownerOptions, setOwnerOptions,
    primaryOwnerId, setPrimaryOwnerId,
    parentAccountId, setParentAccountId,
    isParentLocked,
    // Create-parent launch: the new account is a root, so its Parent field is hidden.
    hidesParentField: !!setParentForChildId,
    // Edit-mode: this account already has sub-accounts. The parent picker shows
    // a warning that they'll be re-parented too, and save cascades them.
    hasChildren,
    // Parent linking is hidden for accounts still in / failed the creation
    // approval workflow (Pending / Rejected) — they shouldn't anchor a
    // hierarchy until approved. Null in create mode (no approval state yet).
    approvalStatus: existing?.approval_status ?? null,
    // categories
    categoriesInterested, setCategoriesInterested,
    categoriesBought, setCategoriesBought,
    // addresses / contacts / documents
    drafts, setDrafts,
    contactRows, setContactRows,
    setPendingPrimaryContactId,
    pendingFiles, setPendingFiles,
  }
}

export type AccountFormController = ReturnType<typeof useAccountForm>
