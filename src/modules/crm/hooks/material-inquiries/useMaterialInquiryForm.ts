import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import type { AsyncSelectOption } from "@/components/ui/async-select"
import { deepEqual } from "@/lib/deep-equal"
import { useNavigateBack } from "@/hooks/use-navigate-back"
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"
import { useFormErrors } from "@/hooks/use-form-errors"
import { getUserDisplayName, useUser, useUserOptions } from "@modules/users"

import {
  useCreateMaterialInquiry,
  useMaterialInquiry,
  useUpdateMaterialInquiry,
  useAddMaterialInquiryItem,
  useUpdateMaterialInquiryItem,
  useDeleteMaterialInquiryItem,
} from "./useMaterialInquiries"
import { useLead, useLeadsInfinite } from "../leads/useLeads"
import { useDeal, useDealsInfinite } from "../deals/useDeals"
import { useCrmPrefillGuard } from "../shared/useCrmPrefillGuard"
import { MATERIAL_INQUIRIES_STRINGS as S } from "../../components/material-inquiries/material-inquiries.strings"
import { submitMaterialInquiry } from "../../api"
import type {
  MaterialInquiryItemWire,
  MaterialInquiryStatus,
  MaterialInquiryWire,
} from "../../api"

// One row per line item. `serverId` is set for items that already exist on the
// backend; new rows leave it undefined so save dispatches POST vs. PATCH/DELETE
// correctly. UI-only `clientKey` is for stable React keys.
export interface MIItemDraft {
  clientKey: string
  serverId?: string
  variant_id?: string
  part_sku?: string
  item_name: string
  category_id?: string
  description: string
  qty_requested: number
  qty_input: string
  client_budget_per_unit: string
  client_timeline: string
}

function genKey(prefix = "mi-item"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// AsyncSelect calls `useOptions(search, { enabled })` — two-arg shape. Bridge
// the infinite-query hooks into that shape so the picker drives debounced
// search AND defers the first call until open (loadOnOpen, §16.11).
export function useLeadPickerOptions(search: string, options?: { enabled?: boolean }) {
  return useLeadsInfinite(
    { search: search || undefined },
    options,
  )
}

export function useDealPickerOptions(search: string, options?: { enabled?: boolean }) {
  return useDealsInfinite(
    { search: search || undefined, sort: "-created_at" },
    options,
  )
}

export function useAssigneePickerOptions(
  search: string,
  options?: { enabled?: boolean },
) {
  return useUserOptions(search, { is_active: true }, options)
}

function emptyItem(): MIItemDraft {
  return {
    clientKey: genKey(),
    item_name: "",
    description: "",
    qty_requested: 1,
    qty_input: "1",
    client_budget_per_unit: "",
    client_timeline: "",
  }
}

function itemFromServer(item: MaterialInquiryItemWire): MIItemDraft {
  return {
    clientKey: genKey(),
    serverId: item.id,
    variant_id: item.variant_id ?? undefined,
    part_sku: undefined,
    item_name: item.item_name,
    category_id: item.category_id ?? undefined,
    description: item.description ?? "",
    qty_requested: item.qty_requested,
    qty_input: String(item.qty_requested),
    client_budget_per_unit:
      item.client_budget_per_unit == null ? "" : String(item.client_budget_per_unit),
    client_timeline: item.client_timeline ?? "",
  }
}

// Container logic for the Material Inquiry create/edit form: linked Lead/Deal
// pickers, line-item drafts (create→POST, edit→diffed PATCH/DELETE), hydration,
// validation, and the save / submit-to-procurement flows.
export function useMaterialInquiryForm() {
  const { id: miId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = !!miId
  const backHref = "/crm/material-inquiries"
  const goBack = useNavigateBack(backHref)

  const detailQuery = useMaterialInquiry(miId, { enabled: isEdit })
  const existing = detailQuery.data

  const prefillLeadId = searchParams.get("leadId") ?? ""
  const prefillDealId = searchParams.get("dealId") ?? ""

  const prefillGuard = useCrmPrefillGuard({
    leadId: isEdit ? undefined : prefillLeadId,
    dealId: isEdit ? undefined : prefillDealId,
  })

  // The linked entity (Lead vs Deal + which record) is fixed once the MI
  // exists: on amend/edit it can't be re-pointed at a different lead/deal, so
  // both the "Linked to" toggle and the record picker are locked. On create
  // it's also locked when opened from a Lead/Deal detail page (the deep-link
  // already chose the entity); a plain "New" stays editable.
  const linkedLocked = isEdit || Boolean(prefillLeadId || prefillDealId)

  const [hydrated, setHydrated] = useState(!isEdit)
  const [linkedType, setLinkedType] = useState<"lead" | "deal">(
    prefillDealId ? "deal" : "lead",
  )
  const [selectedLead, setSelectedLead] = useState<AsyncSelectOption | null>(
    prefillLeadId ? { id: prefillLeadId, label: S.chipLoading } : null,
  )
  const [selectedDeal, setSelectedDeal] = useState<AsyncSelectOption | null>(
    prefillDealId ? { id: prefillDealId, label: S.chipLoading } : null,
  )
  const leadId = selectedLead?.id ?? ""
  const dealId = selectedDeal?.id ?? ""
  const { errors, setErrors, clearError, clearAll } = useFormErrors()
  const [description, setDescription] = useState("")
  const [clientBudget, setClientBudget] = useState("")
  const [clientTimeline, setClientTimeline] = useState("")
  const [assignedTo, setAssignedTo] = useState<AsyncSelectOption | null>(null)
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<MIItemDraft[]>([emptyItem()])

  const assignedUserQuery = useUser(existing?.assigned_to_id ?? "")
  const leadDetailQuery = useLead(selectedLead?.id ?? "")
  const dealDetailQuery = useDeal(selectedDeal?.id ?? null)

  // Edit-mode hydration. Fires once when `existing` lands.
  useEffect(() => {
    if (!existing || hydrated) return
    setLinkedType(existing.lead_id ? "lead" : existing.deal_id ? "deal" : "lead")
    setSelectedLead(
      existing.lead_id ? { id: existing.lead_id, label: S.chipLoading } : null,
    )
    setSelectedDeal(
      existing.deal_id ? { id: existing.deal_id, label: S.chipLoading } : null,
    )
    setDescription(existing.description ?? "")
    setClientBudget(existing.client_budget == null ? "" : String(existing.client_budget))
    setClientTimeline(existing.client_timeline ?? "")
    if (existing.assigned_to_id) {
      setAssignedTo({ id: existing.assigned_to_id, label: S.chipLoading })
    } else {
      setAssignedTo(null)
    }
    setNotes(existing.notes ?? "")
    setItems(
      existing.items.length > 0 ? existing.items.map(itemFromServer) : [emptyItem()],
    )
    setHydrated(true)
  }, [existing, hydrated])

  // Patch the lead chip label once /leads/{id} resolves.
  useEffect(() => {
    const lead = leadDetailQuery.data
    if (!lead || !selectedLead || selectedLead.id !== lead.id) return
    const label = `${lead.lead_code}${lead.company_name ? ` · ${lead.company_name}` : ""}`
    if (selectedLead.label !== label) {
      setSelectedLead({ id: lead.id, label })
    }
  }, [leadDetailQuery.data, selectedLead])

  // Same for the deal chip.
  useEffect(() => {
    const deal = dealDetailQuery.data
    if (!deal || !selectedDeal || selectedDeal.id !== deal.id) return
    const accountName = deal.account_name ?? deal.account?.name
    const label = accountName
      ? `${deal.deal_number} · ${accountName}`
      : deal.deal_number
    if (selectedDeal.label !== label) {
      setSelectedDeal({ id: deal.id, label })
    }
  }, [dealDetailQuery.data, selectedDeal])

  // Replace the "Loading…" placeholder once the user fetch resolves.
  useEffect(() => {
    if (!assignedUserQuery.data || !assignedTo) return
    const label = getUserDisplayName(assignedUserQuery.data)
    if (
      assignedTo.id === assignedUserQuery.data.id &&
      assignedTo.label !== label
    ) {
      setAssignedTo({
        id: assignedUserQuery.data.id,
        label,
      })
    }
  }, [assignedUserQuery.data, assignedTo])

  const status: MaterialInquiryStatus = existing?.status ?? "draft"
  const canEditItems = !isEdit || status === "draft"
  const canEditHeader = !isEdit || status !== "closed"

  const createMut = useCreateMaterialInquiry()
  const updateMut = useUpdateMaterialInquiry(existing?.id ?? "")
  const addItemMut = useAddMaterialInquiryItem(existing?.id ?? "")
  const updateItemMut = useUpdateMaterialInquiryItem(existing?.id ?? "")
  const deleteItemMut = useDeleteMaterialInquiryItem(existing?.id ?? "")

  function switchLinkedType(next: "lead" | "deal") {
    if (next === linkedType) return
    if (next === "lead") {
      setSelectedDeal(null)
    } else {
      setSelectedLead(null)
    }
    setLinkedType(next)
  }

  function updateItem(clientKey: string, patch: Partial<MIItemDraft>) {
    setItems((prev) => prev.map((it) => (it.clientKey === clientKey ? { ...it, ...patch } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(clientKey: string) {
    setItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((it) => it.clientKey !== clientKey)
    })
  }

  function validateForm(): Record<string, string> {
    const e: Record<string, string> = {}
    // Linked entity (Lead / Deal) is mandatory — one of the two per the toggle.
    if (linkedType === "lead" && !leadId.trim()) {
      e.leadId = S.validation.leadRequired
    } else if (linkedType === "deal" && !dealId.trim()) {
      e.dealId = S.validation.dealRequired
    }
    if (!description.trim() && items.every((i) => !i.item_name.trim())) {
      e.description = S.validation.descriptionOrItem
    }
    if (clientBudget.trim() && Number.isNaN(Number(clientBudget))) {
      e.clientBudget = S.validation.clientBudgetNumber
    }
    for (const [idx, it] of items.entries()) {
      const named = it.item_name.trim().length > 0
      const otherRowsHaveContent = items.some(
        (other) => other.clientKey !== it.clientKey && other.item_name.trim(),
      )
      // A row must be completed if it carries a name, or it's the only
      // candidate row (so an all-empty form still flags the first line). Blank
      // extra rows alongside a filled one are ignored.
      const rowRequired = named || !otherRowsHaveContent
      if (!rowRequired) continue
      // Name + Category are both mandatory on a required line — validate each
      // independently so an empty category still errors even when the name is
      // also blank.
      if (!named) {
        e[`item:${it.clientKey}:name`] = S.validation.lineItemNameRequired(idx + 1)
      }
      if (!it.category_id) {
        e[`item:${it.clientKey}:category`] =
          S.validation.lineItemCategoryRequired(idx + 1)
      }
      // Qty / budget only matter once the line is a real (named) item.
      if (named) {
        if (!Number.isFinite(it.qty_requested) || it.qty_requested < 1) {
          e[`item:${it.clientKey}:qty`] = S.validation.lineItemQtyMin(idx + 1)
        }
        if (
          it.client_budget_per_unit.trim() &&
          Number.isNaN(Number(it.client_budget_per_unit))
        ) {
          e[`item:${it.clientKey}:budget`] =
            S.validation.lineItemBudgetNumber(idx + 1)
        }
      }
    }
    return e
  }

  function realItems(): MIItemDraft[] {
    return items.filter((it) => it.item_name.trim().length > 0)
  }

  function buildHeaderPayload() {
    return {
      lead_id: leadId.trim() || undefined,
      deal_id: dealId.trim() || undefined,
      description: description.trim() || null,
      client_budget: clientBudget.trim() ? Number(clientBudget) : undefined,
      client_timeline: clientTimeline.trim() || undefined,
      assigned_to_id: assignedTo?.id || undefined,
      notes: notes.trim() || null,
    }
  }

  async function handleCreate(): Promise<MaterialInquiryWire> {
    const payload = {
      ...buildHeaderPayload(),
      items: realItems().map((it) => ({
        item_name: it.item_name.trim(),
        variant_id: it.variant_id,
        category_id: it.category_id,
        description: it.description.trim() || null,
        qty_requested: it.qty_requested,
        client_budget_per_unit: it.client_budget_per_unit.trim()
          ? Number(it.client_budget_per_unit)
          : undefined,
        client_timeline: it.client_timeline.trim() || undefined,
      })),
    }
    return createMut.mutateAsync(payload)
  }

  async function handleEdit(): Promise<MaterialInquiryWire> {
    if (!existing) throw new Error(S.validation.notLoaded)
    // Header dirty-diff so PATCH is minimal.
    const dirty = (
      [
        ["lead_id", leadId.trim() || null, existing.lead_id],
        ["deal_id", dealId.trim() || null, existing.deal_id],
        ["description", description.trim() || null, existing.description],
        [
          "client_budget",
          clientBudget.trim() ? Number(clientBudget) : null,
          existing.client_budget,
        ],
        [
          "client_timeline",
          clientTimeline.trim() || null,
          existing.client_timeline,
        ],
        [
          "assigned_to_id",
          assignedTo?.id ?? null,
          existing.assigned_to_id,
        ],
        ["notes", notes.trim() || null, existing.notes],
      ] as const
    ).filter(([, next, prev]) => {
      const a = next == null ? null : next
      const b = prev == null ? null : prev
      return a !== b
    })

    if (dirty.length > 0) {
      const headerPatch: Record<string, unknown> = {}
      for (const [k, v] of dirty) headerPatch[k] = v
      await updateMut.mutateAsync(headerPatch)
    }

    if (canEditItems) {
      const originalById = new Map<string, MaterialInquiryItemWire>()
      for (const i of existing.items) originalById.set(i.id, i)

      const presentServerIds = new Set(
        items.map((i) => i.serverId).filter((id): id is string => !!id),
      )

      // 1) Deletes
      for (const orig of existing.items) {
        if (!presentServerIds.has(orig.id)) {
          await deleteItemMut.mutateAsync(orig.id)
        }
      }

      // 2) Creates + updates
      for (const it of realItems()) {
        const payload = {
          item_name: it.item_name.trim(),
          variant_id: it.variant_id,
          category_id: it.category_id,
          description: it.description.trim() || null,
          qty_requested: it.qty_requested,
          client_budget_per_unit: it.client_budget_per_unit.trim()
            ? Number(it.client_budget_per_unit)
            : undefined,
          client_timeline: it.client_timeline.trim() || undefined,
        }
        if (!it.serverId) {
          await addItemMut.mutateAsync(payload)
        } else {
          const orig = originalById.get(it.serverId)
          if (!orig) continue
          const itemDirty =
            payload.item_name !== orig.item_name ||
            (payload.variant_id ?? null) !== (orig.variant_id ?? null) ||
            (payload.category_id ?? null) !== (orig.category_id ?? null) ||
            (payload.description ?? null) !== (orig.description ?? null) ||
            payload.qty_requested !== orig.qty_requested ||
            (payload.client_budget_per_unit ?? null) !==
              (orig.client_budget_per_unit ?? null) ||
            (payload.client_timeline ?? null) !==
              (orig.client_timeline ?? null)
          if (itemDirty) {
            await updateItemMut.mutateAsync({ itemId: it.serverId, body: payload })
          }
        }
      }
    }

    return existing
  }

  async function handleSave() {
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      toast.error(S.toast.fixHighlightedFields)
      return
    }
    clearAll()
    try {
      if (isEdit) {
        await handleEdit()
        navigate(-1)
      } else {
        const created = await handleCreate()
        navigate(`/crm/material-inquiries/${created.id}`, { replace: true })
      }
    } catch {
      // Each mutation toasts on failure already.
    }
  }

  async function handleSubmitToProcurement() {
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      toast.error(S.toast.fixHighlightedFields)
      return
    }
    if (!selectedLead && !selectedDeal) {
      toast.error(S.toast.linkBeforeSubmit)
      return
    }
    clearAll()
    try {
      const created = await handleCreate()
      try {
        await submitMaterialInquiry(created.id)
        toast.success(S.toast.submittedToProcurement)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : S.toast.submitFailed,
        )
      }
      navigate(`/crm/material-inquiries/${created.id}`, { replace: true })
    } catch {
      // handleCreate's mutation toasts its own failure.
    }
  }

  const isPending =
    createMut.isPending ||
    updateMut.isPending ||
    addItemMut.isPending ||
    updateItemMut.isPending ||
    deleteItemMut.isPending

  const canSave = useMemo(() => {
    if (isPending) return false
    if (isEdit && !canEditHeader && !canEditItems) return false
    return true
  }, [isPending, isEdit, canEditHeader, canEditItems])

  // Snapshot for dirty detection. Compare item structure by stable fields.
  const summarizeItem = (it: MIItemDraft) => ({
    variant_id: it.variant_id,
    part_sku: it.part_sku,
    item_name: it.item_name,
    category_id: it.category_id,
    description: it.description,
    qty_requested: it.qty_requested,
    client_budget_per_unit: it.client_budget_per_unit,
    client_timeline: it.client_timeline,
  })
  const initialValues = useMemo(() => {
    if (isEdit && existing) {
      return {
        linkedType: (existing.lead_id ? "lead" : "deal") as "lead" | "deal",
        leadId: existing.lead_id ?? "",
        dealId: existing.deal_id ?? "",
        description: existing.description ?? "",
        clientBudget: existing.client_budget == null ? "" : String(existing.client_budget),
        clientTimeline: existing.client_timeline ?? "",
        assignedToId: existing.assigned_to_id ?? "",
        notes: existing.notes ?? "",
        items: (existing.items.length > 0
          ? existing.items.map(itemFromServer)
          : [emptyItem()]
        ).map(summarizeItem),
      }
    }
    return {
      linkedType: (prefillDealId ? "deal" : "lead") as "lead" | "deal",
      leadId: prefillLeadId,
      dealId: prefillDealId,
      description: "",
      clientBudget: "",
      clientTimeline: "",
      assignedToId: "",
      notes: "",
      items: [summarizeItem(emptyItem())],
    }
  }, [isEdit, existing, prefillLeadId, prefillDealId])

  const currentValues = useMemo(
    () => ({
      linkedType,
      leadId,
      dealId,
      description,
      clientBudget,
      clientTimeline,
      assignedToId: assignedTo?.id ?? "",
      notes,
      items: items.map(summarizeItem),
    }),
    [linkedType, leadId, dealId, description, clientBudget, clientTimeline, assignedTo, notes, items],
  )

  const submitInFlight = isPending || createMut.isSuccess || updateMut.isSuccess
  const isDirty =
    !submitInFlight &&
    (!isEdit || hydrated) &&
    !deepEqual(currentValues, initialValues)

  const guard = useUnsavedChangesGuard({ isDirty })

  return {
    isEdit,
    backHref,
    goBack,
    detailQuery,
    existing,
    prefillGuard,
    hydrated,
    status,
    linkedType,
    switchLinkedType,
    linkedLocked,
    canEditHeader,
    canEditItems,
    selectedLead,
    setSelectedLead,
    selectedDeal,
    setSelectedDeal,
    leadId,
    dealId,
    description,
    setDescription,
    clientBudget,
    setClientBudget,
    clientTimeline,
    setClientTimeline,
    assignedTo,
    setAssignedTo,
    notes,
    setNotes,
    items,
    updateItem,
    addItem,
    removeItem,
    errors,
    clearError,
    isPending,
    canSave,
    isDirty,
    guard,
    handleSave,
    handleSubmitToProcurement,
  }
}

export type MaterialInquiryFormController = ReturnType<typeof useMaterialInquiryForm>
