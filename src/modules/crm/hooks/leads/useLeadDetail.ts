import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { getUserDisplayName, useUser } from "@modules/users"
import { AUDIT_PERMISSIONS, useEntityAuditTrailCount } from "@modules/audit"
import { useAuth } from "@shared/auth/use-auth"
import type { UserRole } from "@shared/auth/roles"
import { ApiError } from "@shared/api/envelope"
import { usePermission } from "@shared/rbac"

import { canReinstateLead } from "../../crm-roles"
import { composeLostReason, decomposeLostReason } from "../../components/shared/LostReasonDialog"
import { mapCrmLead } from "../../api"
import { checkLeadNotRejected, checkLeadStageRequirements, leadStageFields } from "../../lib/lead-close-won-gate"
import { crmCan } from "../../permissions"
import { LEAD_STAGES, LEAD_TYPE_OPTIONAL_STAGES, type Lead } from "../../types"
import { LEADS_STRINGS as S } from "../../components/leads/leads.strings"
import {
  useDeleteLead,
  useLead,
  useLeadEntityStats,
  useMoveLeadStage,
  useRejectLead,
} from "./useLeads"

type Assignee = {
  userId: string | null
  fallbackName: string | null
  role: string
}

// Container logic for the Lead detail page: the lead query, every dialog/stage
// state, the assignee list build, and all action handlers. The page is a thin
// controller that consumes this and wires presenters.
export function useLeadDetail() {
  const { id: leadId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [rejectionNotes, setRejectionNotes] = useState("")
  const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false)
  const [reinstateNote, setReinstateNote] = useState("")
  const [lostReasonOpen, setLostReasonOpen] = useState(false)
  const [lostReason, setLostReason] = useState<{ reason: string; notes: string } | null>(null)
  const [currentStage, setCurrentStage] = useState<string | null>(null)
  // Audit-trail tab badge count. The hook is hoisted ABOVE early returns so
  // Rules of Hooks holds. The fetch is gated only on audit-read permission,
  // so the badge count loads eagerly with the page — consistent with the
  // other tab-count badges (notes/comments/tasks/quotes/MIs) that come from
  // the `/stats` call. Sourcing the badge from the same query as the tab body
  // (rather than `stats.audit_trail`) keeps the number identical to what the
  // tab actually renders, including the synthetic closed-lost timeline entry.
  //
  // Audit-trail visibility: backend's `audit:read` permission is seeded but
  // ungranted by default; only `is_superuser=true` bypasses the gate. We
  // mirror that here — non-privileged users don't see the tab AND the hook's
  // `enabled` flag is forced false so no audit API call ever fires for them.
  const { can } = usePermission()
  const canViewAudit = can(AUDIT_PERMISSIONS.READ)
  // Tasks tab is hidden for users who can neither read nor manage tasks
  // (backend GET /tasks gates on crm:read OR crm:task_read).
  const canViewTasks = can([...crmCan.readTask])
  // Permission half of the write gate; combined with the view-only flag below.
  const hasWriteLeadPermission = can([...crmCan.writeLead])
  const auditCount = useEntityAuditTrailCount(
    "lead",
    leadId,
    lostReason ? 1 : 0,
    canViewAudit,
  )
  const { user } = useAuth()
  const userCanReinstate = canReinstateLead((user?.roles[0] ?? "VIEWER") as UserRole)
  const leadQuery = useLead(leadId ?? "")
  const moveLeadStage = useMoveLeadStage()
  const deleteLeadMutation = useDeleteLead()
  const rejectLeadMutation = useRejectLead()
  const lead = leadQuery.data ? mapCrmLead(leadQuery.data) : null
  // Mention → view-only access: the backend decides (`access_level`); the FE
  // never infers it from mention ids. A mentioned owner / superadmin gets
  // "edit" and keeps every control.
  const isReadOnly = lead?.accessLevel === "view"
  const isMentioned = lead?.isMentioned ?? false
  // Gates every lead write affordance on the page (header actions, stage
  // select, attachments, and the write controls inside the tabs).
  const canWriteLead = hasWriteLeadPermission && !isReadOnly

  // `assigned_to` is now an `{id, name}` embed on the wire — no extra
  // lookup needed. `presales_manager_id` is still just a UUID, so resolve
  // its display name with a single-user lookup (cached by id, so cheap).
  const assignedToId = leadQuery.data?.assigned_to?.id ?? null
  const assignedToName = leadQuery.data?.assigned_to?.name ?? null
  const presalesManagerId = leadQuery.data?.presales_manager_id ?? null
  const presalesUserQuery = useUser(presalesManagerId ?? "")
  const presalesManagerName = presalesUserQuery.data
    ? getUserDisplayName(presalesUserQuery.data)
    : null
  // `rejected_by` is an `{id, name}` embed on the wire — no extra lookup
  // needed. `mapCrmLead` already exposes the name as `lead.rejectedBy`.
  const rejectedByName = lead?.rejectedBy ?? null

  useEffect(() => {
    setCurrentStage(null)
  }, [lead?.id])

  // A 4xx means the `:id` in the URL is unusable — 404 (no such lead),
  // 422 (malformed UUID), 400 (bad request). The user hand-edited the id;
  // that's a "not found", not a load failure. Check both the settled
  // `error` and the in-flight retry's `failureReason` so we flip to the
  // not-found view on the first failed request instead of sitting on the
  // loading screen through the retry (global config: retry 1).
  const isBadId = (err: unknown) =>
    err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500
  const leadFetchBadId =
    isBadId(leadQuery.error) || isBadId(leadQuery.failureReason)
  const isLeadNotFound = leadFetchBadId || (leadQuery.isSuccess && !lead)

  // Detail-page tab-count badges. One `/leads/{id}/stats` call returns real
  // backend counts for every relation (notes/comments/tasks/quotes/MIs), so
  // the badges reflect actual data instead of in-memory fixtures. The
  // audit-trail badge keeps its own gated `useEntityAuditTrailCount` hook
  // (audit visibility is a separate, stricter permission), so `audit_trail`
  // from this payload is intentionally not consumed here.
  const entityStats = useLeadEntityStats(leadId ?? "")
  const noteCount = entityStats.data?.notes ?? 0
  const commentCount = entityStats.data?.comments ?? 0
  const taskCount = entityStats.data?.tasks ?? 0
  const quoteCount = entityStats.data?.quotes ?? 0
  const materialInquiryCount = entityStats.data?.material_inquiries ?? 0
  const salesOrderCount = entityStats.data?.sales_orders ?? 0

  // Build the assignment list shown on the right sidebar. Reads straight from
  // the API payload: `assigned_to` is an `{id, name}` embed (exposed above as
  // `assignedToId` / `assignedToName`), `bdes` is an array of `{id, name}`,
  // and `presales_manager_id` is a single UUID (resolved into `presalesManagerName`).
  // Same person across roles is deduped so a BDE who is also the assignee
  // doesn't render twice.
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
  pushAssignee(assignedToId, assignedToName, "Assigned To")
  for (const bde of leadQuery.data?.bdes ?? []) {
    pushAssignee(bde.id, bde.name, "BDE")
  }
  pushAssignee(presalesManagerId, presalesManagerName, "Pre-Sales Manager")

  // Pipeline stages (exclude Closed Lost for visual pipeline)
  const activeStage = currentStage ?? lead?.stage ?? ""
  const pipelineStages = LEAD_STAGES.filter((s) => s !== "Closed Lost")
  const currentStageIndex = pipelineStages.indexOf(activeStage as typeof pipelineStages[number])
  const isLost = activeStage === "Closed Lost"
  const isRejected = activeStage === "Rejected"
  // Displayed lost reason: prefer the just-entered value (shown immediately
  // after marking lost, before the detail query refetches); otherwise hydrate
  // from the persisted `closed_lost_reason` returned by the API so the reason
  // survives a page reload.
  const displayLostReason =
    lostReason ??
    (lead?.closedLostReason ? decomposeLostReason(lead.closedLostReason) : null)

  function redirectToLeadsIndex() {
    navigate("/crm/leads", { replace: true })
  }

  function handleDelete() {
    if (!leadId) return
    deleteLeadMutation.mutate(leadId, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
        redirectToLeadsIndex()
      },
    })
  }

  function handleReject() {
    if (!leadId || !lead) return
    const reason = rejectionNotes.trim()
      ? `${rejectionReason} — ${rejectionNotes.trim()}`
      : rejectionReason
    rejectLeadMutation.mutate(
      { id: leadId, fromStage: lead.stage as Lead["stage"], reason },
      {
        onSuccess: () => {
          setRejectDialogOpen(false)
          setRejectionReason("")
          setRejectionNotes("")
          redirectToLeadsIndex()
        },
      },
    )
  }

  function handleReinstate() {
    setReinstateDialogOpen(false)
    setReinstateNote("")
    navigate("/crm/leads")
  }

  function handleStageChange(newStage: string) {
    // The stage select is hidden for view-only users; guard anyway.
    if (!canWriteLead) return
    if (!lead) return
    // Qualified-and-ahead needs Type / Categories / Description / owner;
    // Closed Lost needs an owner. Checked before the Closed-Won branch below
    // so wizard entry goes through the same guard.
    if (!checkLeadStageRequirements(newStage, leadStageFields(lead))) return
    if (newStage === "Closed Won") {
      if (!checkLeadNotRejected(lead.stage)) return
      // Closed Won is allowed from any stage EXCEPT the early funnel
      // (New / Contacted) — the lead must have progressed past initial triage.
      if (LEAD_TYPE_OPTIONAL_STAGES.includes(lead.stage)) {
        toast.error(S.toast.closeWonBlocked)
        return
      }
      // Closed Won runs the dedicated wizard: Account (lead-cascade) → Quote
      // → Sales Order. The lead's stage flips to Closed Won once the SO is
      // approved (separate flow). The SO form is no longer the entry point
      // — the wizard owns account-creation and quote-selection.
      navigate(`/crm/leads/${lead.id}/close-won?type=lead`)
      return
    }
    if (newStage === "Closed Lost") {
      setLostReasonOpen(true)
      return
    }
    setCurrentStage(newStage)
    // When converting a Rejected lead back into the pipeline (e.g. "Convert
    // to Qualified"), drop the sticky "?from=rejected" param once the move
    // succeeds — otherwise the sidebar keeps "Rejected Leads" highlighted.
    const wasRejected = lead.stage === "Rejected"
    moveLeadStage.mutate(
      {
        id: lead.id,
        fromStage: lead.stage as Lead["stage"],
        toStage: newStage as Lead["stage"],
      },
      wasRejected
        ? {
            onSuccess: () =>
              navigate(`/crm/leads/${lead.id}`, { replace: true }),
          }
        : undefined,
    )
  }

  function handleLostReasonConfirm(reason: string, notes: string) {
    if (!lead) return
    setLostReasonOpen(false)
    setLostReason({ reason, notes })
    setCurrentStage("Closed Lost")
    moveLeadStage.mutate(
      {
        id: lead.id,
        fromStage: lead.stage as Lead["stage"],
        toStage: "Closed Lost",
        closedLostReason: composeLostReason(reason, notes),
      },
      {
        // Toast only once the server accepts it — a 409
        // LOST_BLOCKED_BY_FULFILMENT is surfaced by the mutation's error toast.
        onSuccess: () => toast.success(S.toast.markedLost(lead.name, reason)),
        onError: () => setCurrentStage(null),
      },
    )
  }

  const priorityVariant: "destructive" | "warning" | "secondary" =
    lead?.priority === "High" ? "destructive" : lead?.priority === "Medium" ? "warning" : "secondary"

  return {
    leadId,
    lead,
    leadData: leadQuery.data,
    isLeadNotFound,
    isLoading: leadQuery.isLoading,
    isError: leadQuery.isError,
    loadError: leadQuery.error,
    // derived stage / display
    activeStage,
    isLost,
    isRejected,
    pipelineStages,
    currentStageIndex,
    priorityVariant,
    assignees,
    assignedToName,
    presalesManagerName,
    rejectedByName,
    // permissions + counts
    canViewAudit,
    canViewTasks,
    canWriteLead,
    isReadOnly,
    isMentioned,
    auditCount,
    noteCount,
    commentCount,
    taskCount,
    quoteCount,
    materialInquiryCount,
    salesOrderCount,
    user,
    userCanReinstate,
    // mutations
    moveLeadStage,
    deleteLeadMutation,
    rejectLeadMutation,
    // dialog state
    deleteDialogOpen,
    setDeleteDialogOpen,
    rejectDialogOpen,
    setRejectDialogOpen,
    rejectionReason,
    setRejectionReason,
    rejectionNotes,
    setRejectionNotes,
    reinstateDialogOpen,
    setReinstateDialogOpen,
    reinstateNote,
    setReinstateNote,
    lostReasonOpen,
    setLostReasonOpen,
    lostReason: displayLostReason,
    // handlers
    handleDelete,
    handleReject,
    handleReinstate,
    handleStageChange,
    handleLostReasonConfirm,
  }
}
