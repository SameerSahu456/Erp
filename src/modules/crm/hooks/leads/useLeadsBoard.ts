import { useCallback, useMemo, useState } from "react"
import { CHANNEL_TYPES } from "../../constants/channel-types"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  CheckCircle2,
  FileText,
  Handshake,
  Package,
  PhoneCall,
  Snowflake,
  Sparkles,
  Trophy,
  Users,
  XCircle,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { DataCardProps } from "@/components/common/display/DataCard"
import type { KanbanColumnConfig } from "@/components/common/views/KanbanBoard"
import { PAGINATION, UI } from "@/shared/constants"
import { dateRangeToParams } from "@/shared/lib/date"
import {
  useDebounce,
  useFilterParams,
  useMemoryState,
  useQueryErrorToast,
  useUrlDateRange,
  useUrlFilter,
  useUrlMultiFilter,
  useUrlPagination,
  useUrlValueRange,
} from "@/shared/hooks"
import { isValidationError } from "@/shared/api/envelope"
import { usePermission } from "@shared/rbac"
import { useAuth } from "@/shared/auth/use-auth"

import { mapCrmLead } from "../../api"
import { crmCan } from "../../permissions"
import { isFirst3SectionRole } from "../../crm-roles"
import { LEAD_STAGES, LEAD_TYPE_OPTIONAL_STAGES } from "../../types"
import type { CrmTag, Lead } from "../../types"
import { checkLeadNotRejected, checkLeadStageRequirements, leadStageFields } from "../../lib/lead-close-won-gate"
import { LEAD_STAGE_COLOR } from "../../lib/stage-styles"
import { readBoardViewPreference, writeBoardViewPreference } from "../../lib/view-preference"
import { LEAD_STAGE_LABELS, leadStageLabel } from "../../constants/lead-stages"
import { LEADS_STRINGS as S } from "../../components/leads/leads.strings"
import { composeLostReason } from "../../components/shared/LostReasonDialog"
import {
  useLeads,
  useLeadsByAllStages,
  useLeadStats,
  useMoveLeadStage,
} from "./useLeads"

export const kanbanColumns: KanbanColumnConfig[] = LEAD_STAGES.map((stage) => ({
  id: stage,
  label: leadStageLabel(stage),
  color: LEAD_STAGE_COLOR[stage],
}))

// The first 3 pipeline sections — the only ones early-funnel BDE roles see.
const FIRST_3_LEAD_STAGES: readonly string[] = LEAD_STAGES.slice(0, 3)

// Per-stage card config for the summary row. Sourced from /crm/leads/stats
// `by_stage` map so every card has a real count behind it.
type StageCardSpec = {
  stage: string
  label: string
  icon: LucideIcon
  accent: DataCardProps["accent"]
}

// Labels are sourced from the LEAD_STAGE_LABELS domain map (§16.12 bucket 2)
// so the KPI cards never drift from the kanban columns / list badges.
const STAGE_CARDS: readonly StageCardSpec[] = [
  { stage: "New",         label: LEAD_STAGE_LABELS["New"],         icon: Sparkles,    accent: "info" },
  { stage: "Contacted",   label: LEAD_STAGE_LABELS["Contacted"],   icon: PhoneCall,   accent: "violet" },
  { stage: "Qualified",   label: LEAD_STAGE_LABELS["Qualified"],   icon: CheckCircle2, accent: "success" },
  { stage: "Procurement", label: LEAD_STAGE_LABELS["Procurement"], icon: Package,     accent: "info" },
  { stage: "Cold",        label: LEAD_STAGE_LABELS["Cold"],        icon: Snowflake,   accent: "primary" },
  { stage: "Proposal",    label: LEAD_STAGE_LABELS["Proposal"],    icon: FileText,    accent: "warning" },
  { stage: "Negotiation", label: LEAD_STAGE_LABELS["Negotiation"], icon: Handshake,   accent: "violet" },
  { stage: "Closed Won",  label: LEAD_STAGE_LABELS["Closed Won"],  icon: Trophy,      accent: "success" },
  { stage: "Closed Lost", label: LEAD_STAGE_LABELS["Closed Lost"], icon: XCircle,     accent: "danger" },
]

export const LEADS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

// Container logic for the Leads list page: view/filter/pagination state, the
// per-stage kanban + list + stats queries, and every derived board value.
// The page is a thin controller that consumes this and wires presenters.
export function useLeadsBoard() {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canWriteLead = can([...crmCan.writeLead])
  // Early-funnel-only roles (BDE_ROLES.first_3_section_visible_role) see just
  // the first 3 pipeline sections — New / Contacted / Qualified.
  const { user } = useAuth()
  const restrictToFirst3 = isFirst3SectionRole(user?.roles)
  // View (kanban | list) lives in the URL (`?view=list`) so it persists across
  // refresh and back/forward. Switching view clears `page` via useFilterParams
  // (a fresh view starts at page 1; kanban shouldn't carry a stale `?page`).
  // When a fresh navigation lands without `?view=` (or refresh strips it), fall
  // back to the remembered preference so the user's last choice sticks.
  const { get: getUrlParam, set: setUrlParam, setMany: setManyParams } = useFilterParams()
  const urlView = getUrlParam("view", "")
  const view: "kanban" | "list" =
    urlView === "list"
      ? "list"
      : urlView === "kanban"
        ? "kanban"
        : readBoardViewPreference("leads") ?? "kanban"
  const setView = useCallback(
    (next: "kanban" | "list") => {
      writeBoardViewPreference("leads", next)
      setUrlParam("view", next === "kanban" ? null : next)
    },
    [setUrlParam],
  )
  // Every filter lives in the URL (mirrors pagination) so it survives refresh,
  // detail round-trips, and browser back/forward. Each setter clears `?page`
  // for free, so filter handlers no longer reset the page by hand.
  const [selectedStage, setSelectedStage] = useUrlFilter("stage", "__all__")
  const [selectedPriority, setSelectedPriority] = useUrlFilter("priority", "__all__")
  // Order Type filter — single-select (`"__all__"` sentinel mirrors Priority).
  const [selectedTag, setSelectedTag] = useUrlFilter("tag", "__all__")
  // Source filter — single-select on the lead's source label (`"__all__"` sentinel).
  const [selectedSource, setSelectedSource] = useUrlFilter("source", "__all__")
  // Assigned-To filter — multi-select user ids (API-backed picker).
  const [selectedAssignees, setSelectedAssignees] = useUrlMultiFilter("assigned_to")
  // Product-Manager filter — multi-select user ids (API-backed picker). The
  // backend resolves the selected PMs' combined category scope and narrows
  // leads by category overlap (OR semantics — a row passes when any selected
  // PM would see it).
  const [selectedPm, setSelectedPm] = useUrlMultiFilter("pm_user_id")
  // Category / OEM filters — multi-select IMS ids (API-backed pickers). The
  // backend matches rows whose own category_ids / oem_ids overlap ANY selection.
  const [selectedCategories, setSelectedCategories] = useUrlMultiFilter("category_id")
  const [selectedOems, setSelectedOems] = useUrlMultiFilter("oem_id")
  // Channel-type filter — multi-select over the fixed CHANNEL_TYPES allow-list.
  // §11.1: a hand-edited `?channel_type=` drops values the backend would 422.
  const [rawChannelTypes, setSelectedChannelTypes] = useUrlMultiFilter("channel_type")
  const selectedChannelTypes = useMemo(
    () => rawChannelTypes.filter((c) => (CHANNEL_TYPES as readonly string[]).includes(c)),
    [rawChannelTypes],
  )
  const channelTypeFilter = selectedChannelTypes.length > 0 ? selectedChannelTypes : undefined
  // Assignment filter — "unassigned" replaces the Assigned-To match with the
  // backend's `unassigned=true` on every list/kanban/stats query. Shown to
  // everyone — the backend scopes NULL-assignee rows to view-unassigned holders.
  const [selectedAssignment, setSelectedAssignment] = useUrlFilter("assignment", "__all__")
  const onlyUnassigned = selectedAssignment === "unassigned"
  // "Mentioned" filter — only records visible solely because the viewer was
  // @mentioned (backend `mentioned_only=true`), on list, kanban and stats.
  const [selectedMentioned, setSelectedMentioned] = useUrlFilter("mentioned", "__all__")
  const onlyMentioned = selectedMentioned === "only"
  const assigneeFilter =
    !onlyUnassigned && selectedAssignees.length > 0 ? selectedAssignees : undefined
  const [kanbanSearch, setKanbanSearch] = useUrlFilter("search", "")
  // Created-date range filter.
  const [dateRange, setDateRange] = useUrlDateRange()
  const { date_from, date_to } = dateRangeToParams(dateRange)
  // Quote-value range filter (latest-quote grand_total, not the lead's own value).
  const [quoteValue, setQuoteValue] = useUrlValueRange("min_quote_value", "max_quote_value", 14)
  // Deal-value range filter (the row's own value field).
  const [dealValue, setDealValue] = useUrlValueRange("min_deal_value", "max_deal_value", 14)

  const debouncedSearch = useDebounce(kanbanSearch.trim(), UI.DEBOUNCE_SEARCH_MS)

  const activeFilterCount =
    (onlyUnassigned ? 1 : 0) +
    (onlyMentioned ? 1 : 0) +
    (selectedStage !== "__all__" ? 1 : 0) +
    (selectedPriority !== "__all__" ? 1 : 0) +
    (selectedTag !== "__all__" ? 1 : 0) +
    (selectedSource !== "__all__" ? 1 : 0) +
    (assigneeFilter ? 1 : 0) +
    (selectedPm.length > 0 ? 1 : 0) +
    (selectedCategories.length > 0 ? 1 : 0) +
    (selectedOems.length > 0 ? 1 : 0) +
    (selectedChannelTypes.length > 0 ? 1 : 0) +
    (dateRange?.from || dateRange?.to ? 1 : 0) +
    (quoteValue?.min != null || quoteValue?.max != null ? 1 : 0) +
    (dealValue?.min != null || dealValue?.max != null ? 1 : 0)

  // Open the filter panel by default when the page mounts with filters already
  // applied (shared/bookmarked URL, or back-nav from a detail page) so the
  // active filters are visible. Lazy initializer ⇒ only the first render
  // decides; the user can still toggle it freely afterwards.
  const [filtersOpen, setFiltersOpen] = useMemoryState("crm:leads:filtersOpen", () => activeFilterCount > 0)

  // §16 — list-view page + page size in the URL (mirrors IMS). Filter changes
  // reset to page 1 via the handlers below; a size change clears `page`
  // atomically. Kanban columns keep LEADS_PAGE_SIZE as their scroll chunk.
  const {
    page: tablePage,
    setPage: setTablePage,
    pageSize: tablePageSize,
    setPageSize: setTablePageSize,
  } = useUrlPagination({
    sizeKey: "leads_size",
    defaultSize: PAGINATION.CRM_LIST_DEFAULT_PAGE_SIZE,
  })

  // Filter setters already clear `?page` (via useFilterParams), so each handler
  // is just the URL-backed setter — no manual page reset needed.
  const handleSearchChange = setKanbanSearch
  const handleStageChange = setSelectedStage
  const handlePriorityChange = setSelectedPriority
  const handleTagChange = setSelectedTag
  const handleSourceChange = setSelectedSource
  const handleAssigneesChange = setSelectedAssignees
  const handlePmChange = setSelectedPm
  const handleCategoriesChange = setSelectedCategories
  const handleOemsChange = setSelectedOems
  const handleChannelTypesChange = setSelectedChannelTypes
  const handleOnlyUnassignedChange = (checked: boolean) =>
    setSelectedAssignment(checked ? "unassigned" : "__all__")
  const handleOnlyMentionedChange = (checked: boolean) =>
    setSelectedMentioned(checked ? "only" : "__all__")
  const handleDateRangeChange = setDateRange
  const handleQuoteValueChange = setQuoteValue
  const handleDealValueChange = setDealValue

  const commonFilters = useMemo(
    () => ({
      page_size: LEADS_PAGE_SIZE,
      search: debouncedSearch || undefined,
      priority:
        selectedPriority !== "__all__"
          ? (selectedPriority as Lead["priority"])
          : undefined,
      tags: selectedTag !== "__all__" ? [selectedTag as CrmTag] : undefined,
      source: selectedSource !== "__all__" ? selectedSource : undefined,
      assigned_to: assigneeFilter,
      unassigned: onlyUnassigned || undefined,
      mentioned_only: onlyMentioned || undefined,
      pm_user_ids: selectedPm.length > 0 ? selectedPm : undefined,
      category_ids: selectedCategories.length > 0 ? selectedCategories : undefined,
      oem_ids: selectedOems.length > 0 ? selectedOems : undefined,
      channel_type: channelTypeFilter,
      // §16.8 — feeding the range into commonFilters threads it into BOTH the
      // list query and every per-stage kanban infinite query (it's part of
      // each column's queryKey), so the range narrows all columns at once.
      date_from,
      date_to,
      // Quote-value range — same threading as date range.
      min_quote_value: quoteValue?.min,
      max_quote_value: quoteValue?.max,
      min_deal_value: dealValue?.min,
      max_deal_value: dealValue?.max,
    }),
    [debouncedSearch, selectedPriority, selectedTag, selectedSource, assigneeFilter, onlyUnassigned, onlyMentioned, selectedPm, selectedCategories, selectedOems, channelTypeFilter, date_from, date_to, quoteValue?.min, quoteValue?.max, dealValue?.min, dealValue?.max]
  )

  const tableParams = useMemo(
    () => ({
      ...commonFilters,
      page: tablePage,
      page_size: tablePageSize,
      stage:
        selectedStage !== "__all__" ? (selectedStage as Lead["stage"]) : undefined,
    }),
    [commonFilters, tablePage, tablePageSize, selectedStage]
  )

  const restrictToStage =
    selectedStage !== "__all__"
      ? (selectedStage as (typeof LEAD_STAGES)[number])
      : undefined

  const tableQuery = useLeads(tableParams, { enabled: view === "list" })
  const stageQueries = useLeadsByAllStages(commonFilters, {
    enabled: view === "kanban",
    restrictToStage,
    // Don't fetch hidden columns for early-funnel BDE roles — only the first 3.
    allowedStages: restrictToFirst3 ? FIRST_3_LEAD_STAGES : undefined,
  })

  const statsQuery = useLeadStats({
    search: debouncedSearch || undefined,
    priority:
      selectedPriority !== "__all__"
        ? (selectedPriority as Lead["priority"])
        : undefined,
    // Keep the KPI cards in sync with the Source filter.
    source: selectedSource !== "__all__" ? selectedSource : undefined,
    // Keep the KPI cards in sync with the Product-Manager filter.
    pm_user_ids: selectedPm.length > 0 ? selectedPm : undefined,
    // …and with the Category + OEM filters.
    category_ids: selectedCategories.length > 0 ? selectedCategories : undefined,
    oem_ids: selectedOems.length > 0 ? selectedOems : undefined,
    channel_type: channelTypeFilter,
    // …and with the created-date range.
    date_from,
    date_to,
    // …and with the quote-value range.
    min_quote_value: quoteValue?.min,
    max_quote_value: quoteValue?.max,
    min_deal_value: dealValue?.min,
    max_deal_value: dealValue?.max,
    // Keep the KPI cards in sync with the Assigned-To + Assignment filters.
    assigned_to: assigneeFilter,
    unassigned: onlyUnassigned || undefined,
    mentioned_only: onlyMentioned || undefined,
  })

  const moveLeadStage = useMoveLeadStage()

  // Bumping this key force-remounts the KanbanBoard so a dropped card
  // snaps back to its source column when Closed-Won navigation fires
  // (no actual stage change happens until the SO is approved).
  const [kanbanResetKey, setKanbanResetKey] = useState(0)

  // Close-lost from the kanban: capture the reason via the shared dialog before
  // committing the move. We stash the pending drop and snap the card back to
  // its source column until the user confirms (or cancels) in the dialog.
  const [lostReasonOpen, setLostReasonOpen] = useState(false)
  const [pendingLostMove, setPendingLostMove] = useState<{
    itemId: string
    fromStage: Lead["stage"]
    name: string
  } | null>(null)

  const isStageActive = (stage: (typeof LEAD_STAGES)[number]) =>
    !restrictToStage || restrictToStage === stage

  const stageData = useMemo(
    () =>
      ({
        New: stageQueries.New.data,
        Contacted: stageQueries.Contacted.data,
        Qualified: stageQueries.Qualified.data,
        Procurement: stageQueries.Procurement.data,
        Cold: stageQueries.Cold.data,
        Proposal: stageQueries.Proposal.data,
        Negotiation: stageQueries.Negotiation.data,
        "Closed Won": stageQueries["Closed Won"].data,
        "Closed Lost": stageQueries["Closed Lost"].data,
      }) as const,
    [
      stageQueries.New.data,
      stageQueries.Contacted.data,
      stageQueries.Qualified.data,
      stageQueries.Procurement.data,
      stageQueries.Cold.data,
      stageQueries.Proposal.data,
      stageQueries.Negotiation.data,
      stageQueries["Closed Won"].data,
      stageQueries["Closed Lost"].data,
    ],
  )

  const apiLeads = useMemo(() => {
    if (view === "list") {
      return (tableQuery.data?.items ?? []).map(mapCrmLead)
    }
    const all: Lead[] = []
    for (const stage of LEAD_STAGES) {
      if (!isStageActive(stage)) continue
      const pages = stageData[stage]?.pages ?? []
      for (const p of pages) for (const item of p.items) all.push(mapCrmLead(item))
    }
    return all
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, tableQuery.data?.items, stageData, restrictToStage])

  const filteredKanbanItems = useMemo(() => {
    const grouped: Record<string, Lead[]> = {}
    for (const stage of LEAD_STAGES) grouped[stage] = []
    if (view !== "kanban") return grouped
    for (const stage of LEAD_STAGES) {
      if (!isStageActive(stage)) continue
      const pages = stageData[stage]?.pages ?? []
      for (const p of pages) for (const item of p.items) grouped[stage].push(mapCrmLead(item))
    }
    return grouped
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, stageData, restrictToStage])

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const stage of LEAD_STAGES) {
      if (!isStageActive(stage)) {
        counts[stage] = 0
        continue
      }
      const firstPage = stageData[stage]?.pages[0]
      counts[stage] = firstPage?.total ?? 0
    }
    return counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageData, restrictToStage])

  const kanbanInfinite = useMemo(
    () => ({
      hasMore: Object.fromEntries(
        LEAD_STAGES.map((s) => [
          s,
          isStageActive(s) && !!stageQueries[s].hasNextPage,
        ])
      ),
      loading: Object.fromEntries(
        LEAD_STAGES.map((s) => [
          s,
          isStageActive(s) && !!stageQueries[s].isFetchingNextPage,
        ])
      ),
      onLoadMore: (columnId: string) => {
        const stage = columnId as (typeof LEAD_STAGES)[number]
        if (!isStageActive(stage)) return
        const q = stageQueries[stage]
        if (q?.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage()
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stageQueries, restrictToStage]
  )

  const kanbanColumnsWithCounts = useMemo(
    () =>
      kanbanColumns
        .filter((column) => !restrictToStage || column.id === restrictToStage)
        // Early-funnel BDE roles: only New / Contacted / Qualified.
        .filter((column) => !restrictToFirst3 || FIRST_3_LEAD_STAGES.includes(column.id))
        .map((column) => ({
          ...column,
          count: stageCounts[column.id] ?? 0,
        })),
    [stageCounts, restrictToStage, restrictToFirst3]
  )

  // KPI cards: Total + full per-stage breakdown. Every value is sourced from
  // /crm/leads/stats `by_stage`, so each card has a real backend count
  // behind it. Pipeline Value / Won Value / Win Rate aren't in the stats
  // payload yet and are intentionally omitted (would need a backend change).
  const stats = statsQuery.data
  const kpiStats: DataCardProps[] = useMemo(() => {
    const total = stats?.total ?? 0
    const byStage = stats?.by_stage ?? {}
    return [
      { label: S.kpi.totalLeads, value: total, icon: Users, accent: "primary" as const },
      ...STAGE_CARDS.map(({ stage, label, icon, accent }) => ({
        label,
        value: byStage[stage] ?? 0,
        icon,
        accent,
      })),
    ]
  }, [stats])

  const openLead = useCallback(
    (id: string) => navigate(`/crm/leads/${id}`),
    [navigate],
  )

  const openLeadNew = useCallback(() => navigate("/crm/leads/new"), [navigate])

  const handleKanbanMoveAcross = (
    itemId: string,
    fromColumn: string,
    toColumn: string,
  ) => {
    const fromStage = fromColumn as Lead["stage"]
    const toStage = toColumn as Lead["stage"]
    if (fromStage === toStage) return

    // Single lookup of the dragged card — the stage gates below and the
    // Closed-Lost dialog all read from it. A miss (card not in the cached
    // column) skips the gates rather than false-rejecting a legal drop.
    const movingLead = filteredKanbanItems[fromColumn]?.find(
      (l) => l.id === itemId,
    )

    // View-only (mentioned) leads aren't draggable; snap back if one slips
    // through — the backend would 404 the move anyway.
    if (movingLead?.accessLevel === "view") {
      setKanbanResetKey((k) => k + 1)
      return
    }

    // Qualified-and-ahead needs Type / Categories / Description / owner;
    // Closed Lost needs an owner. The gate owns both the stage sets and the
    // toast, so this only has to snap the card back.
    if (movingLead && !checkLeadStageRequirements(toStage, leadStageFields(movingLead))) {
      setKanbanResetKey((k) => k + 1)
      return
    }

    // if (fromStage === "Closed Lost") {
    //   toast.error("Closed Lost leads can't be moved.")
    //   setKanbanResetKey((k) => k + 1)
    //   return
    // }

    if (toStage === "Closed Won" && fromStage !== "Closed Won") {
      if (!checkLeadNotRejected(fromStage)) {
        setKanbanResetKey((k) => k + 1)
        return
      }
      // Closed Won is allowed from any stage EXCEPT the early funnel
      // (New / Contacted) — snap the card back and reject the drop otherwise.
      if (LEAD_TYPE_OPTIONAL_STAGES.includes(fromStage)) {
        setKanbanResetKey((k) => k + 1)
        toast.error(S.toast.closeWonBlocked)
        return
      }
      // Closed Won runs the dedicated wizard: Account (lead-cascade) → Quote
      // → Sales Order. Snap the dropped card back to its source column and
      // hand the user off to the wizard — stage flips automatically once
      // the SO is approved at the end of the wizard flow.
      setKanbanResetKey((k) => k + 1)
      navigate(`/crm/leads/${itemId}/close-won?type=lead`)
      return
    }

    if (toStage === "Closed Lost" && fromStage !== "Closed Lost") {
      // Defer the move: snap the card back, then open the shared dialog to
      // capture the lost reason. The mutation fires from handleKanbanLostConfirm.
      setKanbanResetKey((k) => k + 1)
      setPendingLostMove({
        itemId,
        fromStage,
        name: movingLead?.name ?? "this lead",
      })
      setLostReasonOpen(true)
      return
    }

    moveLeadStage.mutate({ id: itemId, fromStage, toStage })
  }

  // Commit the deferred close-lost move once the dialog is confirmed.
  const handleKanbanLostConfirm = (reason: string, notes: string) => {
    if (!pendingLostMove) return
    const { itemId, fromStage } = pendingLostMove
    setLostReasonOpen(false)
    setPendingLostMove(null)
    moveLeadStage.mutate({
      id: itemId,
      fromStage,
      toStage: "Closed Lost",
      closedLostReason: composeLostReason(reason, notes),
    })
  }

  // Snap state back if the user dismisses the dialog without confirming.
  const handleKanbanLostOpenChange = (open: boolean) => {
    setLostReasonOpen(open)
    if (!open) setPendingLostMove(null)
  }

  // Clear every filter key in ONE navigation (sequential setters would stomp
  // each other on the shared URL). Page resets for free; view, page size and
  // the search text stay (search lives in the toolbar, not the filter panel).
  const resetFilters = () => {
    setManyParams({
      stage: null,
      priority: null,
      tag: null,
      source: null,
      assigned_to: null,
      pm_user_id: null,
      category_id: null,
      oem_id: null,
      channel_type: null,
      assignment: null,
      mentioned: null,
      date_from: null,
      date_to: null,
      min_quote_value: null,
      max_quote_value: null,
      min_deal_value: null,
      max_deal_value: null,
    })
  }

  const activeIsLoading =
    view === "list"
      ? tableQuery.isLoading && !tableQuery.data
      : LEAD_STAGES.some(
          (s) => stageQueries[s].isLoading && !stageQueries[s].data
        )

  const listError =
    view === "list"
      ? tableQuery.isError
        ? tableQuery.error
        : null
      : LEAD_STAGES.map((s) => stageQueries[s]).find((q) => q.isError)?.error ?? null

  // A failed list fetch always toasts the backend's message. A 422 (e.g. a filter
  // value out of range) is NOT painted as a broken-page error — the list just
  // shows empty; other failures keep the inline error state too.
  useQueryErrorToast(listError)
  const activeError = isValidationError(listError) ? null : listError

  return {
    canWriteLead,
    onlyUnassigned,
    handleOnlyUnassignedChange,
    onlyMentioned,
    handleOnlyMentionedChange,
    openLead,
    openLeadNew,
    // view + filters
    view,
    setView,
    selectedStage,
    selectedPriority,
    selectedTag,
    selectedSource,
    selectedAssignees,
    selectedPm,
    selectedCategories,
    selectedOems,
    selectedChannelTypes,
    handleStageChange,
    handlePriorityChange,
    handleTagChange,
    handleSourceChange,
    handleAssigneesChange,
    handlePmChange,
    handleCategoriesChange,
    handleOemsChange,
    handleChannelTypesChange,
    dateRange,
    handleDateRangeChange,
    quoteValue,
    handleQuoteValueChange,
    dealValue,
    handleDealValueChange,
    filtersOpen,
    setFiltersOpen,
    kanbanSearch,
    handleSearchChange,
    activeFilterCount,
    resetFilters,
    // list (table) data
    apiLeads,
    tablePage,
    setTablePage,
    tablePageSize,
    setTablePageSize,
    tableTotal: tableQuery.data?.total ?? 0,
    tableIsFetching: tableQuery.isFetching,
    // kanban data
    kanbanResetKey,
    kanbanColumnsWithCounts,
    filteredKanbanItems,
    kanbanInfinite,
    handleKanbanMoveAcross,
    // kanban close-lost dialog
    lostReasonOpen,
    lostEntityName: pendingLostMove?.name ?? "",
    lostEntityId: pendingLostMove?.itemId ?? null,
    onLostReasonOpenChange: handleKanbanLostOpenChange,
    handleKanbanLostConfirm,
    // status
    activeIsLoading,
    activeError,
    // stats
    kpiStats,
  }
}
