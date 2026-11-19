import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { type AsyncOption } from "@/components/ui/async-multi-select"
import { useFormErrors } from "@/hooks/use-form-errors"
import { useAuth } from "@/shared/auth/use-auth"
import { fullName } from "@/shared/auth/AuthContext"
import { validateCurrency, validateEmail, validateFreeText, validateInteger, validatePhoneIndia, validateUrl } from "@/modules/crm/lib/validation"
import { useNavigateBack } from "@/hooks/use-navigate-back"
import { deepEqual } from "@/lib/deep-equal"
import { getUserDisplayName, useUser, useUserOptionsByRoles, useUserOptionsWithPinnedRoles } from "@modules/users"

import { checkLeadDuplicates, type CrmLeadUpsertPayload } from "../../api"
import { ASSIGNEE_EXCLUDE_ROLE_NAMES, isAssigneeExcluded, isOwnerExempt, LEAD_BDE_ROLE_NAMES, LEAD_BDE_ROLES_BY_CHANNEL, LEAD_PRESALES_ROLE_NAMES } from "../../crm-roles"
import { assignableChannelTags, dealsInChannel } from "@/constants/channel-tags"
import { useCreateLead, useLead, useUpdateLead } from "../../hooks/leads/useLeads"
import {
  LEAD_DETAILS_REQUIRED_STAGES,
  LEAD_OWNER_REQUIRED_STAGES,
  LEAD_TYPE_OPTIONAL_STAGES,
} from "../../types"
import { checkLeadNotRejected, hasLeadDescription } from "../../lib/lead-close-won-gate"
import type { CrmTag, CustomerType, Lead } from "../../types"
import { makeStaticAsyncOptions } from "@/components/ui/async-select"
import {
  LEAD_SOURCES,
  leadSourceSearchText,
  normalizeOptional,
  parseNumber,
  toLeadSourceOption,
} from "../../components/leads/leadForm.constants"
import { LEADS_STRINGS as S } from "../../components/leads/leads.strings"

// Container logic for the Lead create/edit form: field state, duplicate
// detection, role-scoped user pickers, validation, and the create/update save.
export function useLeadForm() {
  const { id: routeLeadId } = useParams<{ id: string }>()
  const leadId = routeLeadId ?? ""
  const isEdit = Boolean(leadId)
  const navigate = useNavigate()
  const goBack = useNavigateBack("/crm/leads")

  const leadQuery = useLead(leadId)
  const createLeadMutation = useCreateLead()
  const updateLeadMutation = useUpdateLead(leadId)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [stage, setStage] = useState<Lead["stage"]>("New")
  const [value, setValue] = useState("")
  const [source, setSource] = useState<string>("")
  const [closureDate, setClosureDate] = useState("")
  // Mandatory only when `stage === "Closed Lost"` — the backend requires it on
  // that transition and rejects it on any other stage (see CrmLeadUpsertPayload).
  const [closedLostReason, setClosedLostReason] = useState("")
  const [description, setDescription] = useState("")
  const [categories, setCategories] = useState<AsyncOption[]>([])
  const [oems, setOems] = useState<AsyncOption[]>([])
  const [location, setLocation] = useState("")
  const [companySize, setCompanySize] = useState("")
  const [website, setWebsite] = useState("")
  const [employees, setEmployees] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [presalesManager, setPresalesManager] = useState("")
  const [priority, setPriority] = useState<Lead["priority"] | "">("")
  const [customerType, setCustomerType] = useState<CustomerType | "">("")
  const [tags, setTags] = useState<CrmTag[]>([])
  const [bde, setBde] = useState("")

  // Picked-option labels — AsyncSelect renders its trigger from the value's
  // label, so we keep the display name alongside each id. Set on pick / on
  // the current-user default; on edit-hydration the `useUser(id)` detail
  // queries below resolve the label as a fallback.
  const [assignedToLabel, setAssignedToLabel] = useState("")
  const [presalesManagerLabel, setPresalesManagerLabel] = useState("")
  const [bdeLabel, setBdeLabel] = useState("")
  const [hydrated, setHydrated] = useState(false)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)

  // Channel-tag scope for the Assigned-To and Presales pickers — derived
  // from the customer-type selector. When unset (initial create flow
  // before the user picks a type), the filter is omitted so the pickers
  // behave as before. Wrapped in useMemo so the hooks' query keys stay
  // stable across renders.
  const channelTagsForPickers = useMemo(
    () => (customerType ? assignableChannelTags(customerType) : undefined),
    [customerType],
  )

  // BDE picker role scope — when a customer type is selected, narrow to
  // the dedicated BDE role for that channel (see LEAD_BDE_ROLES_BY_CHANNEL
  // in crm-roles.ts). When unset, fall back to the full BDE pool. We use
  // this INSTEAD of `channel_tags` for the BDE dropdown so each channel
  // pulls from its own role bucket rather than relying on tag overlap on
  // the generic `bde` role. Mirrors the DealFormPage behaviour.
  const bdeRoleNames = useMemo<string[]>(() => {
    if (!customerType) return LEAD_BDE_ROLE_NAMES
    return LEAD_BDE_ROLES_BY_CHANNEL[customerType] ?? LEAD_BDE_ROLE_NAMES
  }, [customerType])

  // Customer-type dropdown is scoped to what the logged-in user is allowed
  // to operate on. Rule (per product):
  //   - user.channel_tags has 1 value  → dropdown shows that 1 option,
  //                                       auto-selected, field disabled.
  //   - user.channel_tags has N values → dropdown shows those N options,
  //                                       user picks among them.
  //   - user.channel_tags is null/[]   → unrestricted (superuser, no roles,
  //                                       or any role with empty tags) →
  //                                       dropdown shows ALL values.
  // Edit hydration sets customerType from the lead record regardless of
  // these rules — we don't overwrite existing data.
  const ALL_CUSTOMER_TYPES: readonly CustomerType[] = [
    "End Customer",
    "Channel Partner",
    "Cloud / Data Center",
    "End User",
  ]
  const { user: currentUser } = useAuth()
  const customerTypeOptions = useMemo<readonly CustomerType[]>(() => {
    const allowed = currentUser?.channel_tags
    if (!allowed || allowed.length === 0) return ALL_CUSTOMER_TYPES
    return ALL_CUSTOMER_TYPES.filter((t) => allowed.includes(t))
  }, [currentUser?.channel_tags])
  const isCustomerTypeLocked = !isEdit && customerTypeOptions.length === 1

  // On-create auto-fill from current user. Runs ONCE per mount; never
  // overwrites an already-set value; never touches the edit flow.
  //   1. Customer Type ← single allowed option (if filtered list is 1).
  //   2. Assigned To   ← the logged-in user by default (sales rule — the
  //                      creator owns the lead unless they reassign it).
  //   3. BDE           ← current user if they hold any BDE-flavour role.
  const autoFilledRef = useRef(false)
  useEffect(() => {
    if (isEdit) return
    if (autoFilledRef.current) return
    if (!currentUser) return

    if (!customerType && customerTypeOptions.length === 1) {
      setCustomerType(customerTypeOptions[0])
    }
    // Default the assignee to the creator — but only when the creator is a
    // valid assignee. A user holding an excluded role (presales / BDE / PM /
    // admin / superadmin — `ASSIGNEE_EXCLUDE_ROLE_NAMES`) is filtered out of
    // the picker, so auto-selecting them would seed a value the picker can't
    // show or re-select. Leave it blank for them to pick someone.
    if (!assignedTo && !isAssigneeExcluded(currentUser.roles)) {
      setAssignedTo(currentUser.id)
      setAssignedToLabel(fullName(currentUser))
    }
    const roles = currentUser.roles ?? []
    if (!bde && roles.some((r) => LEAD_BDE_ROLE_NAMES.includes(r))) {
      setBde(currentUser.id)
      setBdeLabel(fullName(currentUser))
    }
    autoFilledRef.current = true
  }, [isEdit, currentUser, customerType, customerTypeOptions, assignedTo, bde])

  // AsyncSelect option-hook adapters. Each wraps `useUserOptionsByRoles`
  // (debounced search + infinite scroll handled inside AsyncSelect) and is
  // gated on `enabled: open` via `loadOnOpen`, so the first request only
  // fires when the user opens the picker — same as the prior hand-rolled
  // dropdowns, now with a search box for free (Coding-guideline §16.11).
  //
  //  - Assignee: global exclude list — every role except presales/BDE
  //    flavours is eligible. Channel-tag scoped to the selected customer type.
  //    Admin/superadmin are now part of ASSIGNEE_EXCLUDE_ROLE_NAMES, so they're
  //    no longer assignable here — we DROP the second "pinned" /users call that
  //    used to re-add them. `pinnedRoleNames: []` disables that query, leaving
  //    the single scoped+excluded list as the source.
  const useAssignedToOptions = (
    search: string,
    opts?: { enabled?: boolean },
  ) =>
    useUserOptionsWithPinnedRoles(search, {
      enabled: opts?.enabled,
      channelTags: channelTagsForPickers,
      excludeRoleNames: ASSIGNEE_EXCLUDE_ROLE_NAMES,
      // Pinned admin/superadmin call removed — they're excluded assignees now.
      // pinnedRoleNames: OWNER_INCLUDE_ROLE_NAMES,
      pinnedRoleNames: [],
    })
  //  - Presales is intentionally NOT channel-scoped — PSMs are a shared pool.
  const usePresalesOptions = (search: string, opts?: { enabled?: boolean }) =>
    useUserOptionsByRoles(LEAD_PRESALES_ROLE_NAMES, {
      enabled: opts?.enabled,
      search,
    })
  //  - BDE is scoped to the channel's dedicated BDE role bucket.
  const useBdeOptions = (search: string, opts?: { enabled?: boolean }) =>
    useUserOptionsByRoles(bdeRoleNames, { enabled: opts?.enabled, search })

  const assignedToUserQuery = useUser(assignedTo)
  const presalesUserQuery = useUser(presalesManager)
  const bdeUserQuery = useUser(bde)

  // Channel-type change handler — wraps `setCustomerType` so that switching
  // the type clears any picked user that no longer fits the new channel.
  //  - Assigned To / Presales pickers filter by channel_tags, so we keep
  //    the channel_tags overlap check for them. `null` channel_tags =
  //    unrestricted (superuser or any role with empty tags), always
  //    satisfies.
  //  - BDE picker filters by role (LEAD_BDE_ROLES_BY_CHANNEL), so we
  //    clear the BDE only when their roles don't intersect the new
  //    channel's BDE role bucket — same predicate as the dropdown query.
  // The checks run against the `useUser` cache; if a user record isn't
  // loaded yet we leave the selection alone — better than a false-
  // positive clear.
  function handleCustomerTypeChange(next: CustomerType) {
    const prev = customerType
    setCustomerType(next)
    if (!prev || prev === next) return

    const matchesChannelTag = (channelTags: string[] | null | undefined) => {
      // No tags (superuser / role with empty tags) doesn't explicitly deal in
      // the channel → treat as a mismatch so the assignee is cleared.
      return dealsInChannel(channelTags, next)
    }

    if (assignedTo && assignedToUserQuery.data) {
      const u = assignedToUserQuery.data
      // Admin / superadmin oversee every channel — keep them on a type change.
      if (!isOwnerExempt(u.roles) && !matchesChannelTag(u.channel_tags)) {
        const label = getUserDisplayName(u)
        setAssignedTo("")
        setAssignedToLabel("")
        toast.info(S.toast.assignedToRemoved(label, next))
      }
    }
    // Presales is intentionally NOT channel-scoped — leave the picked
    // PSM in place when the channel type changes.
    if (bde && bdeUserQuery.data) {
      const allowedRoles =
        LEAD_BDE_ROLES_BY_CHANNEL[next] ?? LEAD_BDE_ROLE_NAMES
      const userRoles = bdeUserQuery.data.roles ?? []
      const matchesRole = userRoles.some((r) => allowedRoles.includes(r))
      if (!matchesRole) {
        const label = getUserDisplayName(bdeUserQuery.data)
        setBde("")
        setBdeLabel("")
        toast.info(S.toast.bdeRemoved(label, next))
      }
    }
  }

  useEffect(() => {
    if (!leadQuery.data || hydrated) return

    const lead = leadQuery.data

    setName(lead.contact_name ?? "")
    setEmail(lead.email ?? "")
    setPhone(lead.phone ?? "")
    setCompany((lead.company_name ?? "").toUpperCase())
    setStage(lead.stage)
    setValue(lead.lead_value == null ? "" : String(lead.lead_value))
    setSource(lead.source ?? "")
    setClosureDate(lead.estimated_close_date ?? "")
    setClosedLostReason(lead.closed_lost_reason ?? "")
    setDescription(lead.description ?? "")
    setCategories(
      lead.categories.map((category) => ({ id: category.id, label: category.name })),
    )
    setOems(lead.oems.map((oem) => ({ id: oem.id, label: oem.name })))
    setLocation((lead.location ?? "").toUpperCase())
    setCompanySize(lead.company_size ?? "")
    setWebsite(lead.website ?? "")
    setEmployees(lead.employees == null ? "" : String(lead.employees))
    setAssignedTo(lead.assigned_to?.id ?? "")
    setPresalesManager(lead.presales_manager_id ?? "")
    setPriority(lead.priority)
    setCustomerType((lead.channel_type ?? "") as CustomerType | "")
    setTags((lead.tags ?? []) as CrmTag[])
    setBde(lead.bdes[0]?.id ?? "")
    setHydrated(true)
  }, [leadQuery.data, hydrated])

  // Searchable Source picker. The field is free text, so a stored value that
  // is not in LEAD_SOURCES is added to the list to keep it selectable.
  const useSourceOptions = useMemo(() => {
    const values = new Set<string>(LEAD_SOURCES)
    if (source.trim()) values.add(source.trim())
    return makeStaticAsyncOptions([...values].map(toLeadSourceOption), leadSourceSearchText)
  }, [source])

  // Trigger display labels: the picked label (set on selection / default)
  // wins; on edit-hydration the `useUser(id)` detail query resolves it. BDE
  // additionally falls back to the embedded name on the loaded lead record.
  const assignedToDisplay =
    assignedToLabel ||
    (assignedToUserQuery.data ? getUserDisplayName(assignedToUserQuery.data) : "")

  const presalesManagerDisplay =
    presalesManagerLabel ||
    (presalesUserQuery.data ? getUserDisplayName(presalesUserQuery.data) : "")

  const bdeDisplay =
    bdeLabel ||
    (bdeUserQuery.data ? getUserDisplayName(bdeUserQuery.data) : "") ||
    (leadQuery.data?.bdes[0]?.name ?? "")

  const backHref = "/crm/leads"
  const isSaving =
    createLeadMutation.isPending || updateLeadMutation.isPending || checkingDuplicates
  const { errors, setErrors, clearError, clearAll } = useFormErrors()

  const initialValues = useMemo(() => {
    const existing = leadQuery.data
    if (isEdit && existing) {
      return {
        name: existing.contact_name ?? "",
        email: existing.email ?? "",
        phone: existing.phone ?? "",
        company: existing.company_name ?? "",
        stage: existing.stage,
        value: existing.lead_value == null ? "" : String(existing.lead_value),
        source: existing.source ?? "",
        closureDate: existing.estimated_close_date ?? "",
        closedLostReason: existing.closed_lost_reason ?? "",
        description: existing.description ?? "",
        categoryIds: existing.categories.map((c) => c.id),
        oemIds: existing.oems.map((o) => o.id),
        location: existing.location ?? "",
        companySize: existing.company_size ?? "",
        website: existing.website ?? "",
        employees: existing.employees == null ? "" : String(existing.employees),
        assignedTo: existing.assigned_to?.id ?? "",
        presalesManager: existing.presales_manager_id ?? "",
        priority: existing.priority,
        customerType: (existing.channel_type ?? "") as CustomerType | "",
        tags: (existing.tags ?? []) as CrmTag[],
        bde: existing.bdes[0]?.id ?? "",
      }
    }
    return {
      name: "",
      email: "",
      phone: "",
      company: "",
      stage: "New" as Lead["stage"],
      value: "",
      source: "",
      closureDate: "",
      closedLostReason: "",
      description: "",
      categoryIds: [] as string[],
      oemIds: [] as string[],
      location: "",
      companySize: "",
      website: "",
      employees: "",
      assignedTo: "",
      presalesManager: "",
      priority: "" as Lead["priority"] | "",
      customerType: "" as CustomerType | "",
      tags: [] as CrmTag[],
      bde: "",
    }
  }, [isEdit, leadQuery.data])

  const currentValues = useMemo(
    () => ({
      name,
      email,
      phone,
      company,
      stage,
      value,
      source,
      closureDate,
      closedLostReason,
      description,
      categoryIds: categories.map((c) => c.id),
      oemIds: oems.map((o) => o.id),
      location,
      companySize,
      website,
      employees,
      assignedTo,
      presalesManager,
      priority,
      customerType,
      tags,
      bde,
    }),
    [
      name,
      email,
      phone,
      company,
      stage,
      value,
      source,
      closureDate,
      closedLostReason,
      description,
      categories,
      oems,
      location,
      companySize,
      website,
      employees,
      assignedTo,
      presalesManager,
      priority,
      customerType,
      tags,
      bde,
    ],
  )

  const submitInFlight =
    createLeadMutation.isPending ||
    updateLeadMutation.isPending ||
    createLeadMutation.isSuccess ||
    updateLeadMutation.isSuccess
  const isDirty =
    !submitInFlight &&
    (!isEdit || hydrated) &&
    !deepEqual(currentValues, initialValues)

  function validateForm(): Record<string, string> {
    const e: Record<string, string> = {}

    // Name, Company, Type, Categories and Description (the requirement) are
    // only mandatory from Qualified onward, as is email / phone (at least
    // one). Assigned To is mandatory on every stage, including New.
    const detailsRequired = LEAD_DETAILS_REQUIRED_STAGES.includes(stage)
    const ownerRequired = LEAD_OWNER_REQUIRED_STAGES.includes(stage)

    if (!name.trim()) {
      if (detailsRequired) e.name = "Name is required for this stage."
    } else {
      // Free text — only length is enforced; spaces/digits are allowed.
      const err = validateFreeText(name, { label: "Name" })
      if (err) e.name = err
    }
    if (!company.trim()) {
      if (detailsRequired) e.company = "Company is required for this stage."
    } else {
      const err = validateFreeText(company, { maxLength: 100, label: "Company name" })
      if (err) e.company = err
    }

    // Description is rich-text (HTML) — hasLeadDescription strips tags + nbsp
    // so a cleared editor holding `<br>` or an empty `<p>` counts as empty.
    if (detailsRequired && !hasLeadDescription(description)) {
      e.description = "Description is required for this stage."
    }

    if (!email.trim() && !phone.trim()) {
      if (detailsRequired) e.contact = "Provide at least one of email or phone for this stage."
    } else {
      const emailErr = validateEmail(email)
      if (emailErr) e.email = emailErr
      const phoneErr = validatePhoneIndia(phone)
      if (phoneErr) e.phone = phoneErr
    }

    const websiteErr = validateUrl(website)
    if (websiteErr) e.website = websiteErr

    const employeesErr = validateInteger(employees, { min: 0, max: 1_000_000 })
    if (employeesErr) e.employees = employeesErr

    const valueErr = validateCurrency(value, { min: 0 })
    if (valueErr) e.value = valueErr

    // Closure Date past-date guarding lives ONLY on the DatePicker (`min`), so a
    // lead that already carries a past closure date can still be saved on edit
    // without being forced to change it. No save-level past-date check here.

    // Closed Lost reason is mandatory when the lead is moved to "Closed Lost".
    if (stage === "Closed Lost" && !closedLostReason.trim()) {
      e.closedLostReason = "Closed lost reason is required."
    }

    if (detailsRequired && categories.length === 0) {
      e.categories = "Category is required for this stage."
    }
    if (detailsRequired && !customerType) {
      e.customerType = "Type is required for this stage."
    }
    // Backend column is nullable so the owner rule is enforced FE-side only;
    // mirror it server-side if you need it as a hard gate.
    if (ownerRequired && !assignedTo) e.assigned_to = "Assigned To is required for this stage."
    // Channel-type ↔ Assigned-To consistency: the assignee must hold the
    // selected channel type in their `channel_tags`. A user with NO tags
    // (`null` = superuser / role with empty tags) does not explicitly deal in
    // the channel, so they're rejected too. Only checked once the assignee's
    // detail record is loaded (skip while loading rather than false-flag).
    else if (customerType && assignedToUserQuery.data) {
      const u = assignedToUserQuery.data
      const tags = u.channel_tags
      // Admin / superadmin can own any channel → bypass the tag check.
      if (!isOwnerExempt(u.roles) && !dealsInChannel(tags, customerType)) {
        e.assigned_to = `This user does not deal in ${customerType}.`
      }
    }
    // BDE ↔ channel consistency: the picked BDE must hold the channel's
    // dedicated BDE role (LEAD_BDE_ROLES_BY_CHANNEL). BDE is optional, so this
    // only runs when a BDE is selected, a channel type is set, and the BDE's
    // detail record is loaded.
    if (bde && customerType && bdeUserQuery.data) {
      const allowedRoles = LEAD_BDE_ROLES_BY_CHANNEL[customerType] ?? LEAD_BDE_ROLE_NAMES
      const userRoles = bdeUserQuery.data.roles ?? []
      if (!userRoles.some((r) => allowedRoles.includes(r))) {
        e.bde = `This BDE does not handle ${customerType}.`
      }
    }
    return e
  }

  function buildPayload(): CrmLeadUpsertPayload {
    const categoryIds = categories.map((category) => category.id)
    const oemIds = oems.map((o) => o.id)

    const payload: CrmLeadUpsertPayload = {
      description: description.trim(),
      company_name: normalizeOptional(company),
      contact_name: normalizeOptional(name),
      email: normalizeOptional(email),
      phone: normalizeOptional(phone),
      source: normalizeOptional(source),
      estimated_close_date: closureDate || null,
      website: normalizeOptional(website),
      location: normalizeOptional(location),
      company_size: normalizeOptional(companySize),
      employees: parseNumber(employees),
      lead_value: parseNumber(value),
      priority: priority || undefined,
      channel_type: customerType || null,
      tags,
      category_ids: categoryIds,
      oem_ids: oemIds,
      bde_user_ids: bde ? [bde] : [],
      assigned_to: assignedTo || null,
      presales_manager_id: presalesManager || null,
      notes: isEdit ? leadQuery.data?.notes ?? {} : {},
    }

    // On edit, send the chosen stage — EXCEPT "Closed Won". A lead can only
    // reach closed_won by approving a Sales Order (the backend rejects a
    // direct stage=closed_won PATCH), so we leave the stage untouched here and
    // hand the user off to the Closed-Won wizard after saving (see handleSave).
    if (isEdit && stage !== "Closed Won") {
      payload.stage = stage
    }

    // Only send the reason on the Closed-Lost transition — the backend rejects
    // it on any other stage.
    if (stage === "Closed Lost") {
      payload.closed_lost_reason = closedLostReason.trim()
    }

    return payload
  }

  async function handleSave() {
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      toast.error(S.toast.fixHighlighted)
      return
    }

    // Closed Won can only be initiated once the lead has progressed PAST the
    // early funnel (New / Contacted). Mirror the detail/kanban guard here so
    // the edit form can't shortcut a fresh lead straight to the wizard.
    if (isEdit && stage === "Closed Won") {
      const currentStage = leadQuery.data?.stage
      if (currentStage && !checkLeadNotRejected(currentStage)) return
      if (currentStage && LEAD_TYPE_OPTIONAL_STAGES.includes(currentStage)) {
        toast.error(S.toast.closeWonBlocked)
        return
      }
    }

    clearAll()

    const payload = buildPayload()

    setCheckingDuplicates(true)
    let duplicates: Awaited<ReturnType<typeof checkLeadDuplicates>>
    try {
      duplicates = await checkLeadDuplicates({
        companyName: payload.company_name,
        email: payload.email,
      })
    } catch {
      toast.error(S.toast.duplicateCheckFailed)
      setCheckingDuplicates(false)
      return
    }
    setCheckingDuplicates(false)

    const duplicateErrors: Record<string, string> = {}
    if (duplicates.account) {
      duplicateErrors.company = "An account already exists with this name."
    }
    // Existing-email (duplicate contact) check intentionally removed — we no
    // longer block the save or surface an "email already exists" message.
    if (Object.keys(duplicateErrors).length > 0) {
      setErrors(duplicateErrors)
      toast.error(S.toast.duplicateExists)
      return
    }

    try {
      if (isEdit) {
        await updateLeadMutation.mutateAsync(payload)
        // Closed Won is finalised through the dedicated wizard (Account →
        // Quote → Sales Order); the backend flips the lead to closed_won once
        // the SO is approved. After saving the other edits, hand off to the
        // wizard instead of returning to the previous page.
        if (stage === "Closed Won") {
          navigate(`/crm/leads/${leadId}/close-won?type=lead`)
        } else {
          navigate(-1)
        }
      } else {
        const created = await createLeadMutation.mutateAsync(payload)
        navigate(`/crm/leads/${created.id}`, { replace: true })
      }
    } catch {
      // toast is handled in the mutation hook
    }
  }

  function handleCancel() {
    goBack()
  }

  const formTitle = isEdit
    ? `Edit Lead: ${(leadQuery.data?.company_name ?? leadQuery.data?.contact_name ?? "Lead").toUpperCase()}`
    : "Create Lead"

  const loadingLead = isEdit && leadQuery.isLoading

  return {
    name,
    email,
    phone,
    company,
    stage,
    value,
    source,
    closureDate,
    closedLostReason,
    description,
    categories,
    oems,
    location,
    companySize,
    website,
    employees,
    assignedTo,
    presalesManager,
    priority,
    customerType,
    tags,
    bde,
    assignedToLabel,
    presalesManagerLabel,
    bdeLabel,
    hydrated,
    checkingDuplicates,
    setName,
    setEmail,
    setPhone,
    setCompany,
    setStage,
    setValue,
    setSource,
    setClosureDate,
    setClosedLostReason,
    setDescription,
    setCategories,
    setOems,
    setLocation,
    setCompanySize,
    setWebsite,
    setEmployees,
    setAssignedTo,
    setPresalesManager,
    setPriority,
    setCustomerType,
    setTags,
    setBde,
    setAssignedToLabel,
    setPresalesManagerLabel,
    setBdeLabel,
    setHydrated,
    setCheckingDuplicates,
    assignedToDisplay,
    assignedToUserQuery,
    autoFilledRef,
    backHref,
    bdeDisplay,
    bdeRoleNames,
    bdeUserQuery,
    buildPayload,
    channelTagsForPickers,
    createLeadMutation,
    currentValues,
    customerTypeOptions,
    formTitle,
    goBack,
    handleCancel,
    handleCustomerTypeChange,
    handleSave,
    initialValues,
    isCustomerTypeLocked,
    isDirty,
    isEdit,
    isSaving,
    leadId,
    leadQuery,
    loadingLead,
    navigate,
    presalesManagerDisplay,
    presalesUserQuery,
    useSourceOptions,
    submitInFlight,
    updateLeadMutation,
    useAssignedToOptions,
    useBdeOptions,
    usePresalesOptions,
    validateForm,
    errors,
    setErrors,
    clearError,
    clearAll,
  }
}

export type LeadFormController = ReturnType<typeof useLeadForm>
