import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom"
import { toast } from "sonner"

import { useNavigateBack } from "@/hooks/use-navigate-back"
import { useAuth } from "@/shared/auth/use-auth"
import { useFormErrors } from "@/hooks/use-form-errors"
import { deepEqual } from "@/lib/deep-equal"
import { validateCurrency } from "@/shared/lib/validation"
import { type AsyncOption } from "@/components/ui/async-multi-select"
import { getUserDisplayName, useUser, useUserOptionsByRoles } from "@modules/users"

import { DEAL_NON_TERMINAL_STAGES, dealValueToNumber, type DealChannelType, type DealCreatePayload, type DealPriority, type DealStage, type DealTag, type DealUpdatePayload } from "../../api"
import { DEAL_PRESALES_ROLE_NAMES, isOwnerExempt } from "../../crm-roles"
import { assignableChannelTags, dealsInChannel } from "@/constants/channel-tags"
import { useDeal, useCreateDeal, useUpdateDeal } from "../../hooks/deals/useDeals"
import { useAccount, useAccountOwners } from "../../hooks/accounts/useAccounts"
import { CHANNEL_TYPES, isDealChannelType } from "../../components/deals/dealForm.constants"
import { DEALS_STRINGS } from "../../components/deals/deals.strings"

// Container logic for the Deal create/edit form: field state, account-scoped
// owner/contact pickers, channel-type rules, validation, and create/update.
export function useDealForm() {
  const { id: dealId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!dealId
  // `/crm/deals/:id/view` reuses this form with every field disabled.
  const { pathname } = useLocation()
  const isView = isEdit && pathname.endsWith("/view")
  const [searchParams] = useSearchParams()
  // Create mode: pre-select the account when arriving from an account page
  // (e.g. "New Deal" on the account → /crm/deals/new?accountId=…).
  const prefillAccountId = isEdit ? null : searchParams.get("accountId") || null

  const {
    data: existing,
    isLoading: isLoadingDeal,
    isError: isDealError,
  } = useDeal(dealId)

  const [title, setTitle] = useState("")
  const [accountId, setAccountId] = useState<string | null>(prefillAccountId)
  const [contactId, setContactId] = useState<string | null>(null)
  const [ownerId, setOwnerId] = useState<string>("")
  const [presalesManagerId, setPresalesManagerId] = useState<string>("")
  const [stage, setStage] = useState<DealStage>("New")
  const [priority, setPriority] = useState<DealPriority | "">("")
  const [channelType, setChannelType] = useState<DealChannelType | "">("")
  const [tags, setTags] = useState<DealTag[]>([])
  const [categories, setCategories] = useState<AsyncOption[]>([])
  const [oems, setOems] = useState<AsyncOption[]>([])
  const [value, setValue] = useState("")
  const [requirement, setRequirement] = useState("")
  // TODO(backend): location pending Deal.location column. Until backend ships
  // it, `existing.location` is undefined on every hydrate so the input stays
  // empty after save/reload — Save still sends it (uppercased) so the value
  // will start persisting the moment backend accepts it.
  const [location, setLocation] = useState("")
  const [source, setSource] = useState("")
  const [closureDate, setClosureDate] = useState("")
  // Mandatory only when `stage === "Closed Lost"` — the backend requires it on
  // that transition and rejects it on any other stage (see DealUpdatePayload).
  const [closedLostReason, setClosedLostReason] = useState("")
  const [hydrated, setHydrated] = useState(false)
  // Picked presales label — AsyncSelect renders its trigger from the value's
  // label; set on selection, falls back to the `useUser` detail query on edit.
  const [presalesPickedLabel, setPresalesPickedLabel] = useState("")
  const [appliedOwnerForAccount, setAppliedOwnerForAccount] = useState<
    string | null
  >(null)
  // Mirrors `appliedOwnerForAccount` — tracks the last accountId for which
  // we auto-set `channelType` from the account's `account_type`. Suppressed
  // on edit hydration so the deal's stored channel_type wins on first load.
  const [appliedChannelTypeForAccount, setAppliedChannelTypeForAccount] =
    useState<string | null>(null)

  useEffect(() => {
    if (!existing || hydrated) return
    setTitle(existing.title)
    setStage(existing.stage)
    setPriority(existing.priority)
    setChannelType(existing.channel_type ?? "")
    setTags((existing.tags ?? []) as DealTag[])
    // Backend now embeds resolved `{id, name}` category refs on the deal —
    // hydrate chips directly. Fall back to id-as-label for older payloads
    // that only carry `category_ids`.
    const seededCategories =
      (existing.categories?.length ?? 0) > 0
        ? existing.categories.map((c) => ({ id: c.id, label: c.name }))
        : (existing.category_ids ?? []).map((id) => ({ id, label: id }))
    setCategories(seededCategories)
    setOems((existing.oems ?? []).map((o) => ({ id: o.id, label: o.name })))
    setValue(String(dealValueToNumber(existing.value)))
    setRequirement(existing.requirement ?? "")
    setLocation((existing.location ?? "").toUpperCase())
    setSource(existing.source ?? "")
    setClosureDate(existing.estimated_closure_date ?? "")
    setClosedLostReason(existing.closed_lost_reason ?? "")
    setOwnerId(existing.owner_id ?? "")
    setPresalesManagerId(existing.presales_manager_id ?? "")
    setAccountId(existing.account_id)
    setContactId(existing.contact_id)
    setAppliedOwnerForAccount(existing.account_id)
    setAppliedChannelTypeForAccount(existing.account_id)
    setHydrated(true)
  }, [existing, hydrated])

  const categoriesForDisplay = useMemo(() => {
    // ``categories`` is already seeded with `{id, name}` from the backend
    // — kept as-is. Future async-rename of a category (if it ever ships)
    // can re-introduce a name-resolver here.
    return categories
  }, [categories])

  const ownersQuery = useAccountOwners(accountId, {
    enabled: !!accountId,
  })
  const owners = ownersQuery.data ?? []
  // Pull the selected account's detail so we can auto-fill channel type
  // from its `account_type`. Same query is already cached if the Account
  // picker prefetched it; otherwise this is one extra `GET /accounts/{id}`
  // per account change.
  const selectedAccountQuery = useAccount(accountId, {
    enabled: !!accountId,
    // Prefill needs the account's details even when the operator lacks
    // per-record access to it — bypass the access gate (see fetchAccount).
    bypassAccess: true,
  })

  // The deal ships a server-resolved `account_name`; use it for the header so
  // it always reads as the account name (never the user-entered deal title,
  // which sales often types as "<Account> - <Project>" and would double up).
  // Only fall back to a direct /accounts/{id} fetch when the deal carries no
  // resolved name (rare — orphaned FK), so the common path fires no extra GET.
  const embeddedAccountName = existing?.account?.name ?? existing?.account_name ?? null
  const accountQuery = useAccount(accountId, {
    enabled: isEdit && !!accountId && !embeddedAccountName,
    // Header name resolution during edit — prefill needs the account even when
    // the operator lacks per-record access, so bypass the access gate.
    bypassAccess: true,
  })
  const headerAccountName =
    embeddedAccountName ?? accountQuery.data?.name ?? ""

  useEffect(() => {
    if (!accountId) return
    if (appliedOwnerForAccount === accountId) return
    if (ownersQuery.isLoading) return
    const primary = owners.find((o) => o.is_primary)
    if (primary) {
      setOwnerId(primary.user_id)
    } else if (owners.length === 1) {
      // Only one owner on the account — auto-select it (nothing else to pick).
      setOwnerId(owners[0].user_id)
    } else {
      setOwnerId("")
    }
    setAppliedOwnerForAccount(accountId)
  }, [
    accountId,
    appliedOwnerForAccount,
    owners,
    ownersQuery.isLoading,
  ])

  // Channel-tag scope for user pickers — driven by the channel-type
  // selector. When unset (create flow before the user picks one), the
  // filter is omitted so pickers behave as before. Memoised so the
  // hook query keys stay stable.
  const channelTagsForPickers = useMemo(
    () => (channelType ? assignableChannelTags(channelType) : undefined),
    [channelType],
  )

  // Presales dropdown is intentionally NOT channel-scoped — PSMs are a
  // shared pool, not bound to End Customer / Channel Partner / Cloud-DC.
  // AsyncSelect option-hook adapter: debounced search + infinite scroll are
  // handled inside AsyncSelect; gated on open via `loadOnOpen` (§16.11).
  const usePresalesOptions = (search: string, opts?: { enabled?: boolean }) =>
    useUserOptionsByRoles(DEAL_PRESALES_ROLE_NAMES, {
      enabled: opts?.enabled,
      search,
    })
  const presalesUserQuery = useUser(presalesManagerId)
  // Owner's detail record — used to verify, on save, that the deal owner deals
  // in the deal's channel type (channel_tags membership).
  const ownerUserQuery = useUser(ownerId)

  // Channel-type dropdown is scoped to what the logged-in user is allowed
  // to operate on — same rule as LeadFormPage. 1 tag → auto-select + lock.
  // N tags → user picks among them. null/[] (unrestricted) → all three.
  const { user: currentUser } = useAuth()
  const channelTypeOptions = useMemo<readonly DealChannelType[]>(() => {
    const allowed = currentUser?.channel_tags
    if (!allowed || allowed.length === 0) return CHANNEL_TYPES
    return CHANNEL_TYPES.filter((t) => allowed.includes(t))
  }, [currentUser?.channel_tags])
  // Selected account's `account_type` projected to a DealChannelType. When the
  // account has a recognized type, the deal's Type must mirror it and the
  // selector is locked (no user choice). null means "no account selected" or
  // "account has a legacy/unrecognized type" — fall back to the picker.
  const accountChannelType = useMemo<DealChannelType | null>(() => {
    const t = selectedAccountQuery.data?.account_type
    return isDealChannelType(t) ? t : null
  }, [selectedAccountQuery.data?.account_type])
  const isChannelTypeLocked =
    (!isEdit && channelTypeOptions.length === 1) || accountChannelType !== null

  // On-create auto-fill — Type from user's single channel tag. Runs once per
  // mount, never overwrites existing values, never touches the edit flow.
  // Deal owner is intentionally not auto-set here; the existing
  // account-driven `appliedOwnerForAccount` effect already handles it.
  const autoFilledRef = useRef(false)
  useEffect(() => {
    if (isEdit) return
    if (autoFilledRef.current) return
    if (!currentUser) return

    if (!channelType && channelTypeOptions.length === 1) {
      setChannelType(channelTypeOptions[0])
    }
    autoFilledRef.current = true
  }, [isEdit, currentUser, channelType, channelTypeOptions])

  // Channel-type selector handler. Presales is intentionally NOT
  // channel-scoped (PSMs are a shared pool), and BDE was removed from
  // the deal model — so this is now a thin setter, kept as a named
  // function so call sites stay uniform if channel-scoped fields come
  // back later.
  function handleChannelTypeChange(next: DealChannelType | "") {
    setChannelType(next)
  }

  // Sync deal Type from the selected account's `account_type`.
  // When the account has a recognized type the deal's channelType is forced
  // to match (and the selector is locked at render time via
  // `isChannelTypeLocked`). This runs on every load including edit-mode
  // hydration, so a deal whose stored channel_type drifted from its
  // account's type gets reconciled to the account's value on open.
  // Routes through `handleChannelTypeChange` so the picked presales user is
  // re-validated against the new channel and cleared with a toast when they
  // no longer match — same UX as a manual type change.
  //
  // When the account has no/unrecognized type we only clear on account
  // change (gated by `appliedChannelTypeForAccount`) so the user's manual
  // pick isn't wiped on every render.
  useEffect(() => {
    if (!accountId) return
    if (selectedAccountQuery.isLoading) return

    if (accountChannelType) {
      if (accountChannelType !== channelType) {
        handleChannelTypeChange(accountChannelType)
      }
      setAppliedChannelTypeForAccount(accountId)
      return
    }
    if (appliedChannelTypeForAccount === accountId) return
    if (channelType !== "") {
      handleChannelTypeChange("")
    }
    setAppliedChannelTypeForAccount(accountId)
  }, [
    accountId,
    appliedChannelTypeForAccount,
    accountChannelType,
    selectedAccountQuery.isLoading,
    // handleChannelTypeChange + channelType intentionally omitted —
    // recreated each render, would re-fire the effect.
  ])

  // Trigger display label: the picked label (set on selection) wins; on
  // edit-hydration the `useUser(id)` detail query resolves it.
  const presalesManagerDisplay =
    presalesPickedLabel ||
    (presalesUserQuery.data ? getUserDisplayName(presalesUserQuery.data) : "")

  const createMut = useCreateDeal()
  const updateMut = useUpdateDeal(dealId ?? "")

  const ownerOptions = useMemo(
    () =>
      owners.map((o) => ({
        userId: o.user_id,
        name: o.user_name,
        isPrimary: o.is_primary,
      })),
    [owners],
  )

  // The owner Select is scoped to the account's owners. A saved deal can
  // carry an owner who is no longer on that account (reassigned, or linked
  // indirectly) — that id won't be in `ownerOptions`, and without this the
  // trigger would fall back to rendering the raw UUID. Resolve the name from
  // the users API (only fired once the owners list has settled and the id is
  // confirmed missing) and surface it both on the trigger and as a
  // selectable row so the value still maps to an option.
  const ownerInOptions = useMemo(
    () => ownerOptions.some((o) => o.userId === ownerId),
    [ownerOptions, ownerId],
  )
  const missingOwnerId =
    ownerId && !ownerInOptions && !ownersQuery.isLoading ? ownerId : ""
  const fallbackOwnerQuery = useUser(missingOwnerId)
  const fallbackOwnerName = fallbackOwnerQuery.data
    ? getUserDisplayName(fallbackOwnerQuery.data)
    : null

  // Owner picker rows = the account's owners, plus the current off-account
  // owner (resolved via the users API) so the saved value still maps to a
  // selectable row. Owners are a bounded per-account list, so search filters
  // them client-side (no extra round-trip).
  const ownerItems = useMemo(() => {
    const rows = ownerOptions.map((o) => ({ id: o.userId, name: o.name }))
    if (ownerId && !ownerInOptions && fallbackOwnerName) {
      rows.unshift({ id: ownerId, name: fallbackOwnerName })
    }
    return rows
  }, [ownerOptions, ownerId, ownerInOptions, fallbackOwnerName])

  const useOwnerOptions = (search: string) => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? ownerItems.filter((o) => o.name.toLowerCase().includes(q))
      : ownerItems
    return {
      data: { pages: [{ items: filtered }] },
      isLoading: ownersQuery.isLoading,
      isError: ownersQuery.isError,
      error: ownersQuery.error,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: () => {},
    }
  }

  const ownerDisplay =
    ownerOptions.find((o) => o.userId === ownerId)?.name ??
    fallbackOwnerName ??
    ""

  const stageOptions: readonly DealStage[] = isEdit
    ? (["New", "Procurement", "Cold", "Proposal", "Negotiation"] as const)
    : DEAL_NON_TERMINAL_STAGES

  const { errors, setErrors, clearError, clearAll } = useFormErrors()

  function validateForm(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = DEALS_STRINGS.form.validation.titleRequired
    if (!accountId) e.accountId = DEALS_STRINGS.form.validation.accountRequired
    if (!contactId) e.contactId = DEALS_STRINGS.form.validation.contactRequired
    if (!ownerId) e.ownerId = DEALS_STRINGS.form.validation.ownerRequired
    // Owner ↔ channel consistency: the deal owner must hold the deal's channel
    // type in their `channel_tags`. No tags (`null` = superuser / role with
    // empty tags) doesn't explicitly deal in the channel → rejected too.
    // Checked once the owner's detail record is loaded.
    else if (channelType && ownerUserQuery.data) {
      const u = ownerUserQuery.data
      const tags = u.channel_tags
      // Admin / superadmin can own any channel → bypass the tag check.
      if (!isOwnerExempt(u.roles) && !dealsInChannel(tags, channelType)) {
        e.ownerId = DEALS_STRINGS.form.validation.ownerChannelMismatch(channelType)
      }
    }
    if (categories.length === 0) e.categories = DEALS_STRINGS.form.validation.categoryRequired

    const valueErr = validateCurrency(value, { min: 0 })
    if (valueErr) e.value = valueErr

    // Closure Date past-date guarding lives ONLY on the DatePicker (`min`), so a
    // deal that already carries a past closure date can still be saved on edit
    // without being forced to change it. No save-level past-date check here.

    // Closed Lost reason is mandatory when the deal is moved to "Closed Lost".
    if (stage === "Closed Lost" && !closedLostReason.trim()) {
      e.closedLostReason = "Closed lost reason is required."
    }
    return e
  }

  const canSave = !createMut.isPending && !updateMut.isPending

  const initialValues = useMemo(() => {
    if (isEdit && existing) {
      return {
        title: existing.title,
        accountId: existing.account_id,
        contactId: existing.contact_id,
        ownerId: existing.owner_id ?? "",
        presalesManagerId: existing.presales_manager_id ?? "",
        stage: existing.stage,
        priority: existing.priority,
        channelType: (existing.channel_type ?? "") as DealChannelType | "",
        tags: (existing.tags ?? []) as DealTag[],
        categoryIds: (existing.category_ids ?? []) as string[],
        oemIds: (existing.oem_ids ?? []) as string[],
        value: String(dealValueToNumber(existing.value)),
        requirement: existing.requirement ?? "",
        location: (existing.location ?? "").toUpperCase(),
        source: existing.source ?? "",
        closureDate: existing.estimated_closure_date ?? "",
        closedLostReason: existing.closed_lost_reason ?? "",
      }
    }
    return {
      title: "",
      accountId: prefillAccountId,
      contactId: null as string | null,
      ownerId: "",
      presalesManagerId: "",
      stage: "New" as DealStage,
      priority: "" as DealPriority | "",
      channelType: "" as DealChannelType | "",
      tags: [] as DealTag[],
      categoryIds: [] as string[],
      oemIds: [] as string[],
      value: "",
      requirement: "",
      location: "",
      source: "",
      closureDate: "",
      closedLostReason: "",
    }
  }, [isEdit, existing, prefillAccountId])

  const currentValues = useMemo(
    () => ({
      title,
      accountId,
      contactId,
      ownerId,
      presalesManagerId,
      stage,
      priority,
      channelType,
      tags,
      categoryIds: categories.map((c) => c.id),
      oemIds: oems.map((o) => o.id),
      value,
      requirement,
      location,
      source,
      closureDate,
      closedLostReason,
    }),
    [
      title,
      accountId,
      contactId,
      ownerId,
      presalesManagerId,
      stage,
      priority,
      channelType,
      tags,
      categories,
      oems,
      value,
      requirement,
      location,
      source,
      closureDate,
      closedLostReason,
    ],
  )

  const submitInFlight =
    createMut.isPending || updateMut.isPending || createMut.isSuccess || updateMut.isSuccess
  const isDirty =
    !submitInFlight &&
    (!isEdit || hydrated) &&
    !deepEqual(currentValues, initialValues)

  function buildCreatePayload(): DealCreatePayload {
    const payload: DealCreatePayload = {
      title: title.trim(),
      account_id: accountId!,
      contact_id: contactId!,
      stage,
    }
    if (priority) payload.priority = priority
    if (ownerId) payload.owner_id = ownerId
    if (presalesManagerId) payload.presales_manager_id = presalesManagerId
    if (channelType) payload.channel_type = channelType
    if (tags.length > 0) payload.tags = tags
    if (categories.length > 0) payload.category_ids = categories.map((c) => c.id)
    if (oems.length > 0) payload.oem_ids = oems.map((o) => o.id)
    if (value.trim()) payload.value = value.trim()
    if (requirement.trim()) payload.requirement = requirement.trim()
    if (location.trim()) payload.location = location.trim()
    if (source.trim()) payload.source = source.trim()
    payload.estimated_closure_date = closureDate || null
    return payload
  }

  function buildUpdatePayload(): DealUpdatePayload {
    const payload: DealUpdatePayload = {
      title: title.trim(),
      account_id: accountId!,
      contact_id: contactId!,
      priority: priority || undefined,
      owner_id: ownerId || null,
      presales_manager_id: presalesManagerId || null,
      channel_type: channelType || null,
      tags,
      category_ids: categories.map((c) => c.id),
      oem_ids: oems.map((o) => o.id),
      value: value.trim() ? value.trim() : 0,
      requirement: requirement.trim() ? requirement.trim() : null,
      location: location.trim() ? location.trim() : null,
      source: source.trim() ? source.trim() : null,
      estimated_closure_date: closureDate || null,
    }
    // Closed Won is finalised through the Closed-Won wizard + Sales Order
    // approval (the backend auto-flips the deal). Don't push stage=closed_won
    // directly here — leave the stage untouched and redirect (see handleSave).
    if (stage !== "Closed Won") {
      payload.stage = stage
    }
    // Only send the reason on the Closed-Lost transition — the backend rejects
    // it on any other stage.
    if (stage === "Closed Lost") {
      payload.closed_lost_reason = closedLostReason.trim()
    }
    return payload
  }

  function handleSave() {
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      toast.error(DEALS_STRINGS.toast.fixHighlighted)
      return
    }
    clearAll()
    if (isEdit && dealId) {
      // The wizard is for the TRANSITION into Closed Won, not for the state of
      // being Closed Won. Captured before the mutation because `existing`
      // refetches on success, which would make this read the new stage.
      const wasClosedWon = existing?.stage === "Closed Won"
      updateMut.mutate(buildUpdatePayload(), {
        onSuccess: () => {
          // Entering Closed Won → finalise via the wizard (Quote → Sales
          // Order); the backend flips the deal to closed_won on SO approval.
          //
          // A deal that was ALREADY Closed Won is just being edited — its
          // quote and sales order exist and its stage is not moving, so
          // sending it back through the wizard would ask it to redo work it
          // has already done. Editing any other field on a won deal now saves
          // and returns like any normal update. `buildUpdatePayload` already
          // omits `stage` whenever it is Closed Won, so nothing is written to
          // the stage on this path either way.
          if (stage === "Closed Won" && !wasClosedWon) {
            navigate(`/crm/deals/${dealId}/close-won?type=deal`)
          } else {
            navigate(-1)
          }
        },
      })
    } else {
      createMut.mutate(buildCreatePayload(), {
        onSuccess: (created) => navigate(`/crm/deals/${created.id}`, { replace: true }),
      })
    }
  }

  const backHref = isEdit ? `/crm/deals/${dealId}` : "/crm/deals"
  const goBack = useNavigateBack(backHref)


  return {
    title,
    accountId,
    contactId,
    ownerId,
    presalesManagerId,
    stage,
    priority,
    channelType,
    tags,
    categories,
    oems,
    value,
    requirement,
    location,
    source,
    closureDate,
    closedLostReason,
    hydrated,
    presalesPickedLabel,
    appliedOwnerForAccount,
    appliedChannelTypeForAccount,
    setTitle,
    setAccountId,
    setContactId,
    setOwnerId,
    setPresalesManagerId,
    setStage,
    setPriority,
    setChannelType,
    setTags,
    setCategories,
    setOems,
    setValue,
    setRequirement,
    setClosedLostReason,
    setLocation,
    setSource,
    setClosureDate,
    setHydrated,
    setPresalesPickedLabel,
    setAppliedOwnerForAccount,
    setAppliedChannelTypeForAccount,
    accountChannelType,
    accountQuery,
    autoFilledRef,
    backHref,
    buildCreatePayload,
    buildUpdatePayload,
    canSave,
    categoriesForDisplay,
    channelTagsForPickers,
    channelTypeOptions,
    createMut,
    currentValues,
    fallbackOwnerName,
    fallbackOwnerQuery,
    goBack,
    handleChannelTypeChange,
    handleSave,
    headerAccountName,
    initialValues,
    isChannelTypeLocked,
    isDirty,
    isEdit,
    isView,
    missingOwnerId,
    navigate,
    ownerDisplay,
    ownerInOptions,
    ownerItems,
    ownerOptions,
    ownerUserQuery,
    owners,
    ownersQuery,
    prefillAccountId,
    presalesManagerDisplay,
    presalesUserQuery,
    selectedAccountQuery,
    stageOptions,
    submitInFlight,
    updateMut,
    useOwnerOptions,
    usePresalesOptions,
    validateForm,
    dealId,
    existing,
    isLoadingDeal,
    isDealError,
    errors,
    setErrors,
    clearError,
    clearAll,
  }
}

export type DealFormController = ReturnType<typeof useDealForm>
