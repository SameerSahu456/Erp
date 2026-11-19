import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { getUserDisplayName, useUser } from "@modules/users"
import { AUDIT_PERMISSIONS, useEntityAuditTrailCount } from "@modules/audit"
import { useAuth } from "@shared/auth/use-auth"
import { usePermission } from "@shared/rbac"

import { useDeal, useDealEntityStats, useDeleteDeal, useUpdateDeal } from "./useDeals"
import { useAccount, useAccountAddresses } from "../accounts/useAccounts"
import { useContact } from "../contacts/useContacts"
import { dealValueToNumber, type DealStage } from "../../api"
import { composeLostReason, decomposeLostReason } from "../../components/shared/LostReasonDialog"
import { DEALS_STRINGS } from "../../components/deals/deals.strings"
import { accounts } from "../../data/accounts"
import { contacts } from "../../data/contacts"
import { invoices } from "../../data/invoices"
import { DEAL_STAGES } from "../../types"
import type { AccountAddress, Deal } from "../../types"
import { crmCan } from "../../permissions"

// Container logic for the Deal detail page: the deal + account/contact/address
// follow-up queries, the wire→view adaptation, the assignee list, stage/value
// derivations, and all action handlers.
export function useDealDetail() {
  const { id: dealId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [lostReasonOpen, setLostReasonOpen] = useState(false)
  const [lostReason, setLostReason] = useState<{ reason: string; notes: string } | null>(null)
  const [currentStage, setCurrentStage] = useState<string | null>(null)
  const [updatedDealValue] = useState<number | null>(null)
  const [showAllAddresses, setShowAllAddresses] = useState(false)
  const { can } = usePermission()
  const canViewAudit = can(AUDIT_PERMISSIONS.READ)
  const canViewTasks = can([...crmCan.readTask])
  // Permission half of the write gate; combined with the view-only flag below.
  const hasWriteDealPermission = can([...crmCan.writeDeal])
  // Audit badge loads eagerly (gated only on audit-read), consistent with the
  // other tab-count badges sourced from `/stats`. Same query as the tab body,
  // so the count matches what the audit tab renders.
  const auditCount = useEntityAuditTrailCount(
    "deal",
    dealId,
    lostReason ? 1 : 0,
    canViewAudit,
  )

  const { user } = useAuth()

  // ── API lookups ───────────────────────────────────────────────────
  const dealQuery = useDeal(dealId ?? null)
  const apiDeal = dealQuery.data
  // Mention → view-only access: the backend decides (`access_level`); the FE
  // never infers it from mention ids. A mentioned owner / superadmin gets
  // "edit" and keeps every control.
  const isReadOnly = apiDeal?.access_level === "view"
  const isMentioned = apiDeal?.is_mentioned ?? false
  // Gates every deal write affordance on the page (header actions, stage
  // select, attachments, and the write controls inside the tabs).
  const canWriteDeal = hasWriteDealPermission && !isReadOnly
  // Account + contact are fetched purely for DISPLAY here, so bypass the
  // per-record access gate: the linked account/contact should render even when
  // the viewer can see the deal but not its account/contact.
  const accountQuery = useAccount(apiDeal?.account_id, {
    enabled: !!apiDeal,
    bypassAccess: true,
  })
  const contactQuery = useContact(apiDeal?.contact_id, {
    enabled: !!apiDeal,
    bypassAccess: true,
  })
  const addressesQuery = useAccountAddresses(
    apiDeal?.account_id ?? null,
    {},
    { enabled: !!apiDeal?.account_id },
  )
  const apiAccount = accountQuery.data
  const apiContact = contactQuery.data
  const apiAddresses = addressesQuery.data ?? []

  // Wire ships only ids for owner_id / presales_manager_id; resolve display
  // names with single-user lookups (cached by id, so cheap).
  const ownerId = apiDeal?.owner_id ?? null
  const presalesManagerId = apiDeal?.presales_manager_id ?? null
  const ownerUserQuery = useUser(ownerId ?? "")
  const presalesUserQuery = useUser(presalesManagerId ?? "")
  const ownerName = ownerUserQuery.data
    ? getUserDisplayName(ownerUserQuery.data)
    : null
  const presalesManagerName = presalesUserQuery.data
    ? getUserDisplayName(presalesUserQuery.data)
    : null

  const updateDealMut = useUpdateDeal(dealId ?? "")
  const deleteDealMut = useDeleteDeal()

  const dealCategories = useMemo(
    () => apiDeal?.categories ?? [],
    [apiDeal?.categories],
  )

  // Adapt the wire shape into the mock-Deal shape the rest of this page
  // already consumes.
  const adaptedDeal = useMemo(() => {
    if (!apiDeal) return null
    const resolvedOwner = ownerName ?? null
    return {
      id: apiDeal.id,
      dealNumber: apiDeal.deal_number,
      name: apiDeal.title,
      accountId: apiDeal.account_id,
      // Prefer the server-resolved `account_name` shipped on the deal so the
      // header paints immediately; fall back to the standalone account fetch,
      // then the raw id only if both are absent.
      accountName: apiDeal.account_name ?? apiAccount?.name ?? apiDeal.account_id,
      stage: apiDeal.stage,
      value: dealValueToNumber(apiDeal.value),
      sellableIntent: apiDeal.sellable_intent,
      realisedValue: dealValueToNumber(apiDeal.realised_value ?? 0),
      probability: apiDeal.probability,
      closeDate: apiDeal.estimated_closure_date ?? "",
      owner: resolvedOwner ?? "Unassigned",
      owners: (resolvedOwner ? [resolvedOwner] : []) as string[],
      assignedTo: resolvedOwner ?? undefined,
      presalesManager: undefined as string | undefined,
      priority: apiDeal.priority,
      companySize: apiAccount?.company_size ?? undefined,
      employees: apiAccount?.employees ?? undefined,
      location: apiDeal.location ?? undefined,
      source: apiDeal.source ?? undefined,
      website: apiAccount?.website ?? undefined,
      customerType: apiDeal.channel_type ?? undefined,
      tags: (apiDeal.tags ?? []) as Deal["tags"],
      createdAt: apiDeal.created_at,
      description: apiDeal.requirement ?? "",
      notes: apiDeal.notes ?? "",
      categories: dealCategories.map((c) => c.name),
      oems: (apiDeal.oems ?? []).map((o) => o.name),
      leadId: apiDeal.lead_id ?? undefined,
      closedLostReason: apiDeal.closed_lost_reason ?? undefined,
      // Backend deletion guard — false once a Sales Order is raised for the
      // deal. Header hides the Delete action when false.
      isDeletable: apiDeal.is_deletable !== false,
      addresses: [] as AccountAddress[],
    }
  }, [apiDeal, apiAccount, dealCategories, ownerName])

  const isLoading =
    dealQuery.isLoading || (!!dealId && !apiDeal && !dealQuery.isError)
  const isError = dealQuery.isError

  const deal = adaptedDeal
  // Account / contact still get a mock-shaped object so the existing JSX
  // keeps rendering. Real-backed fields take precedence over the legacy mocks.
  const account = apiAccount
    ? {
        id: apiAccount.id,
        name: apiAccount.name,
        industry: apiAccount.industry ?? "—",
        type: apiAccount.account_type,
        addresses: [] as never[],
      }
    : accounts.find((a) => a.id === deal?.accountId)
  const contactSpoc = apiContact
    ? {
        id: apiContact.id,
        name: apiContact.name,
        designation: apiContact.designation ?? "",
        email: apiContact.email ?? "",
        phone: apiContact.phone ?? "",
      }
    : contacts.find((c) => c.accountId === deal?.accountId)

  const relatedInvoices = invoices.filter((i) => i.accountId === deal?.accountId)

  // Detail-page tab-count badges. One `/deals/{id}/stats` call returns real
  // backend counts for every relation (notes/comments/tasks/quotes/MIs), so
  // the badges reflect actual data instead of in-memory fixtures. The
  // audit-trail badge keeps its own gated `useEntityAuditTrailCount` hook
  // (audit visibility is a separate, stricter permission), so `audit_trail`
  // from this payload is intentionally not consumed here.
  const entityStats = useDealEntityStats(dealId)
  const noteCount = entityStats.data?.notes ?? 0
  const commentCount = entityStats.data?.comments ?? 0
  const taskCount = entityStats.data?.tasks ?? 0
  const quoteCount = entityStats.data?.quotes ?? 0
  const materialInquiryCount = entityStats.data?.material_inquiries ?? 0
  const salesOrderCount = entityStats.data?.sales_orders ?? 0

  // Build the assignment list shown on the right sidebar.
  type Assignee = {
    userId: string | null
    fallbackName: string | null
    role: string
  }
  const assignees: Assignee[] = []
  const seenAssigneeKeys = new Set<string>()
  function pushAssignee(
    userId: string | null | undefined,
    fallbackName: string | null | undefined,
    role: string,
  ) {
    if (!userId && !fallbackName) return
    const idKey = userId ? `id:${userId}` : null
    const nameKey = fallbackName?.trim().toLowerCase()
      ? `name:${fallbackName.trim().toLowerCase()}`
      : null
    if (idKey && seenAssigneeKeys.has(idKey)) return
    if (nameKey && seenAssigneeKeys.has(nameKey)) return
    if (idKey) seenAssigneeKeys.add(idKey)
    if (nameKey) seenAssigneeKeys.add(nameKey)
    assignees.push({
      userId: userId ?? null,
      fallbackName: fallbackName ?? null,
      role,
    })
  }
  pushAssignee(ownerId, ownerName, "Assigned To")
  for (const bde of apiDeal?.bde_users ?? []) {
    pushAssignee(bde.id, bde.name, "BDE")
  }
  pushAssignee(presalesManagerId, presalesManagerName, "Pre-Sales Manager")

  // Stage progress
  const activeStage = currentStage ?? deal?.stage ?? ""
  const pipelineStages = DEAL_STAGES.filter((s) => s !== "Closed Lost")
  const currentStageIndex = pipelineStages.indexOf(activeStage as typeof pipelineStages[number])
  const isClosedLost = activeStage === "Closed Lost"
  // Displayed lost reason: prefer the just-entered value (shown immediately
  // after marking lost, before the detail query refetches); otherwise hydrate
  // from the persisted `closed_lost_reason` returned by the API so the reason
  // survives a page reload.
  const displayLostReason =
    lostReason ??
    (deal?.closedLostReason ? decomposeLostReason(deal.closedLostReason) : null)

  // Calculated metrics — use updated value from SO if available
  const displayValue = updatedDealValue ?? deal?.value ?? 0

  function handleStageChange(newStage: string) {
    // The stage select is hidden for view-only users; guard anyway.
    if (!canWriteDeal) return
    if (!dealId) return
    if (newStage === "Closed Won") {
      navigate(`/crm/deals/${dealId}/close-won?type=deal`)
      return
    }
    if (newStage === "Closed Lost") {
      // Capture the lost reason + show the close-lost date before mutating —
      // the actual stage move happens in handleLostReasonConfirm.
      setLostReasonOpen(true)
      return
    }
    const stage = newStage as DealStage
    setCurrentStage(newStage)
    updateDealMut.mutate(
      { stage },
      {
        onError: () => {
          setCurrentStage(null)
        },
      },
    )
  }

  function handleDelete() {
    if (!dealId) return
    deleteDealMut.mutate(dealId, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
        navigate("/crm/deals")
      },
    })
  }

  function handleLostReasonConfirm(reason: string, notes: string) {
    if (!deal) return
    setLostReasonOpen(false)
    setLostReason({ reason, notes })
    setCurrentStage("Closed Lost")
    updateDealMut.mutate(
      {
        stage: "Closed Lost",
        closed_lost_reason: composeLostReason(reason, notes),
      },
      {
        // Toast only once the server accepts it — a 409
        // LOST_BLOCKED_BY_FULFILMENT is surfaced by the mutation's error toast.
        onSuccess: () => toast.success(DEALS_STRINGS.toast.markedLost(deal.name, reason)),
        onError: () => {
          setCurrentStage(null)
        },
      },
    )
  }

  const priorityVariant: "destructive" | "warning" | "secondary" =
    deal?.priority === "High" ? "destructive" : deal?.priority === "Medium" ? "warning" : "secondary"

  return {
    deal,
    apiDeal,
    apiAccount,
    account,
    contactSpoc,
    apiAddresses,
    addressesQuery,
    isLoading,
    isError,
    activeStage,
    pipelineStages,
    currentStageIndex,
    isClosedLost,
    displayValue,
    assignees,
    relatedInvoices,
    noteCount,
    commentCount,
    taskCount,
    quoteCount,
    materialInquiryCount,
    salesOrderCount,
    canViewAudit,
    canViewTasks,
    canWriteDeal,
    isReadOnly,
    isMentioned,
    auditCount,
    user,
    priorityVariant,
    deleteDialogOpen,
    setDeleteDialogOpen,
    lostReasonOpen,
    setLostReasonOpen,
    lostReason: displayLostReason,
    showAllAddresses,
    setShowAllAddresses,
    handleStageChange,
    handleDelete,
    handleLostReasonConfirm,
  }
}
