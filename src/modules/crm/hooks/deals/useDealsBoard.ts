import { useCallback, useMemo, useState } from "react"
import { CHANNEL_TYPES } from "../../constants/channel-types"
import { useNavigate } from "react-router-dom"
import {
  CheckCircle2,
  Handshake,
  Package,
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

import { crmCan } from "../../permissions"
import {
  DEAL_STAGE_LIST,
  type DealListItem,
  type DealPriority,
  type DealStage,
  type DealTag,
} from "../../api"
import { composeLostReason } from "../../components/shared/LostReasonDialog"
import { DEAL_STAGE_COLOR } from "../../lib/stage-styles"
import { readBoardViewPreference, writeBoardViewPreference } from "../../lib/view-preference"
import {
  useDeals,
  useDealsByAllStages,
  useDealStats,
  useMoveDealStage,
} from "./useDeals"

export const kanbanColumns: KanbanColumnConfig[] = DEAL_STAGE_LIST.map((stage) => ({
  id: stage,
  label: stage,
  color: DEAL_STAGE_COLOR[stage],
}))

type StageCardSpec = {
  stage: DealStage
  label: string
  icon: LucideIcon
  accent: DataCardProps["accent"]
}

const STAGE_CARDS: readonly StageCardSpec[] = [
  { stage: "New",          label: "New",          icon: Sparkles,    accent: "info" },
  { stage: "Procurement",  label: "Procurement",  icon: Package,     accent: "info" },
  { stage: "Cold",         label: "Cold",         icon: Snowflake,   accent: "primary" },
  { stage: "Proposal",     label: "Proposal",     icon: CheckCircle2, accent: "warning" },
  { stage: "Negotiation",  label: "Negotiation",  icon: Handshake,   accent: "violet" },
  { stage: "Closed Won",   label: "Closed Won",   icon: Trophy,      accent: "success" },
  { stage: "Closed Lost",  label: "Closed Lost",  icon: XCircle,     accent: "danger" },
]

export const DEALS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

export function accountLabel(deal: DealListItem): string {
  return deal.account_name ?? deal.account_id
}

export function ownerLabel(deal: DealListItem): string {
  return deal.assigned_to?.name ?? "Unassigned"
}

// Container logic for the Deals list page: view/filter/pagination state, the
// per-stage kanban + list + stats queries, and every derived board value.
export function useDealsBoard() {
  const { can } = usePermission()
  const canWriteDeal = can([...crmCan.writeDeal])
  const navigate = useNavigate()
  // View (kanban | list) lives in the URL (`?view=list`) so it persists across
  // refresh and back/forward. Switching view clears `page` via useFilterParams
  // (a fresh view starts at page 1; kanban shouldn't carry a stale `?page`).
  // Every filter lives in the URL (mirrors pagination) so it survives refresh,
  // detail round-trips, and browser back/forward. Each setter clears `?page`
  // for free, so filter handlers no longer reset the page by hand.
  // When a fresh navigation lands without `?view=` (or refresh strips it), fall
  // back to the remembered preference so the user's last choice sticks.
  const { get: getUrlParam, set: setUrlParam, setMany: setManyParams } = useFilterParams()
  const urlView = getUrlParam("view", "")
  const view: "kanban" | "list" =
    urlView === "list"
      ? "list"
      : urlView === "kanban"
        ? "kanban"
        : readBoardViewPreference("deals") ?? "kanban"
  const setView = useCallback(
    (next: "kanban" | "list") => {
      writeBoardViewPreference("deals", next)
      setUrlParam("view", next === "kanban" ? null : next)
    },
    [setUrlParam],
  )
  const [selectedStage, setSelectedStage] = useUrlFilter("stage", "__all__")
  const [selectedPriority, setSelectedPriority] = useUrlFilter("priority", "__all__")
  // Order Type filter — single-select (`"__all__"` sentinel mirrors Priority).
  const [selectedTag, setSelectedTag] = useUrlFilter("tag", "__all__")
  // Source filter — single-select on the deal's source label (`"__all__"` sentinel).
  const [selectedSource, setSelectedSource] = useUrlFilter("source", "__all__")
  // Date Range is a UI-only preset for now (the deals list endpoint doesn't
  // accept date params yet). Kept so the user sees the same filter set the
  // page has always had — flagged as "Backend filter not yet supported"
  // in the panel so we don't pretend it does something it doesn't.
  const [datePreset, setDatePreset] = useUrlFilter("date_preset", "yearly")
  // Owners filter — multi-select user ids (API-backed picker).
  const [selectedOwners, setSelectedOwners] = useUrlMultiFilter("owner_id")
  // Product-Manager filter — multi-select user ids (API-backed picker). The
  // backend resolves the selected PMs' combined category scope and narrows
  // deals by category overlap (OR semantics — a row passes when any selected
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
  // Assignment filter — "unassigned" replaces the Owners match with the
  // backend's `unassigned=true` on every list/kanban/stats query. Shown to
  // everyone — the backend scopes NULL-owner rows to view-unassigned holders.
  const [selectedAssignment, setSelectedAssignment] = useUrlFilter("assignment", "__all__")
  const onlyUnassigned = selectedAssignment === "unassigned"
  // "Mentioned" filter — only records visible solely because the viewer was
  // @mentioned (backend `mentioned_only=true`), on list, kanban and stats.
  const [selectedMentioned, setSelectedMentioned] = useUrlFilter("mentioned", "__all__")
  const onlyMentioned = selectedMentioned === "only"
  const [search, setSearch] = useUrlFilter("search", "")
  // Created-date range filter.
  const [dateRange, setDateRange] = useUrlDateRange()
  const { date_from, date_to } = dateRangeToParams(dateRange)
  // Quote-value range filter (latest-quote grand_total, not the deal's own value).
  const [quoteValue, setQuoteValue] = useUrlValueRange("min_quote_value", "max_quote_value", 14)
  // Deal-value range filter (the row's own value field).
  const [dealValue, setDealValue] = useUrlValueRange("min_deal_value", "max_deal_value", 14)

  const debouncedSearch = useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS)

  const activeFilterCount =
    (onlyUnassigned ? 1 : 0) +
    (onlyMentioned ? 1 : 0) +
    (selectedStage !== "__all__" ? 1 : 0) +
    (selectedPriority !== "__all__" ? 1 : 0) +
    (selectedTag !== "__all__" ? 1 : 0) +
    (selectedSource !== "__all__" ? 1 : 0) +
    (datePreset !== "yearly" ? 1 : 0) +
    (!onlyUnassigned && selectedOwners.length > 0 ? 1 : 0) +
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
  const [filtersOpen, setFiltersOpen] = useMemoryState("crm:deals:filtersOpen", () => activeFilterCount > 0)

  // §16 — list-view page + page size in the URL (mirrors IMS). Filter changes
  // reset to page 1 via the handlers below; a size change clears `page`
  // atomically. Kanban columns keep DEALS_PAGE_SIZE as their scroll chunk.
  const {
    page: tablePage,
    setPage: setTablePage,
    pageSize: tablePageSize,
    setPageSize: setTablePageSize,
  } = useUrlPagination({
    sizeKey: "deals_size",
    defaultSize: PAGINATION.CRM_LIST_DEFAULT_PAGE_SIZE,
  })

  // Filter setters already clear `?page` (via useFilterParams), so each handler
  // is just the URL-backed setter — no manual page reset needed.
  const handleSearchChange = setSearch
  const handleStageChange = setSelectedStage
  const handlePriorityChange = setSelectedPriority
  const handleTagChange = setSelectedTag
  const handleSourceChange = setSelectedSource
  const handleOwnersChange = setSelectedOwners
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

  const priorityFilter =
    selectedPriority !== "__all__"
      ? (selectedPriority as DealPriority)
      : undefined
  const tagsFilter = selectedTag !== "__all__" ? [selectedTag as DealTag] : undefined
  const sourceFilter = selectedSource !== "__all__" ? selectedSource : undefined
  const ownerFilter =
    !onlyUnassigned && selectedOwners.length > 0 ? selectedOwners : undefined
  const pmFilter = selectedPm.length > 0 ? selectedPm : undefined
  const categoryFilter = selectedCategories.length > 0 ? selectedCategories : undefined
  const oemFilter = selectedOems.length > 0 ? selectedOems : undefined

  const commonFilters = useMemo(
    () => ({
      page_size: DEALS_PAGE_SIZE,
      search: debouncedSearch || undefined,
      priority: priorityFilter,
      tags: tagsFilter,
      source: sourceFilter,
      owner_id: ownerFilter,
      pm_user_ids: pmFilter,
      category_ids: categoryFilter,
      oem_ids: oemFilter,
      channel_type: channelTypeFilter,
      unassigned: onlyUnassigned || undefined,
      mentioned_only: onlyMentioned || undefined,
      // §16.8 — threads the range into the list query AND every per-stage
      // kanban infinite query (part of each column's queryKey).
      date_from,
      date_to,
      // Quote-value range — same threading as date range: narrows the list and
      // every kanban column at once (part of each column's queryKey).
      min_quote_value: quoteValue?.min,
      max_quote_value: quoteValue?.max,
      min_deal_value: dealValue?.min,
      max_deal_value: dealValue?.max,
    }),
    [debouncedSearch, priorityFilter, tagsFilter, sourceFilter, ownerFilter, pmFilter, categoryFilter, oemFilter, channelTypeFilter, onlyUnassigned, onlyMentioned, date_from, date_to, quoteValue?.min, quoteValue?.max, dealValue?.min, dealValue?.max],
  )

  const tableParams = useMemo(
    () => ({
      ...commonFilters,
      page: tablePage,
      page_size: tablePageSize,
      stage:
        selectedStage !== "__all__" ? (selectedStage as DealStage) : undefined,
    }),
    [commonFilters, tablePage, tablePageSize, selectedStage],
  )

  const restrictToStage =
    selectedStage !== "__all__" ? (selectedStage as DealStage) : undefined

  const tableQuery = useDeals(tableParams, { enabled: view === "list" })
  const stageQueries = useDealsByAllStages(commonFilters, {
    enabled: view === "kanban",
    restrictToStage,
  })

  const statsQuery = useDealStats({
    search: debouncedSearch || undefined,
    priority: priorityFilter,
    tags: tagsFilter,
    // Keep the KPI cards in sync with the Source filter.
    source: sourceFilter,
    // Keep the KPI cards in sync with the Product-Manager filter.
    pm_user_ids: pmFilter,
    // …and with the Category + OEM filters.
    category_ids: categoryFilter,
    oem_ids: oemFilter,
    channel_type: channelTypeFilter,
    // …and with the created-date range.
    date_from,
    date_to,
    // …and with the quote-value range.
    min_quote_value: quoteValue?.min,
    max_quote_value: quoteValue?.max,
    min_deal_value: dealValue?.min,
    max_deal_value: dealValue?.max,
    // Keep the KPI cards in sync with the Owners + Assignment filters.
    owner_id: ownerFilter,
    unassigned: onlyUnassigned || undefined,
    mentioned_only: onlyMentioned || undefined,
  })

  const moveDealStage = useMoveDealStage()

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
    fromStage: DealStage
    name: string
  } | null>(null)

  const isStageActive = (stage: DealStage) =>
    !restrictToStage || restrictToStage === stage

  const stageData = useMemo(
    () =>
      ({
        New: stageQueries.New.data,
        Procurement: stageQueries.Procurement.data,
        Cold: stageQueries.Cold.data,
        Proposal: stageQueries.Proposal.data,
        Negotiation: stageQueries.Negotiation.data,
        "Closed Won": stageQueries["Closed Won"].data,
        "Closed Lost": stageQueries["Closed Lost"].data,
      }) as const,
    [
      stageQueries.New.data,
      stageQueries.Procurement.data,
      stageQueries.Cold.data,
      stageQueries.Proposal.data,
      stageQueries.Negotiation.data,
      stageQueries["Closed Won"].data,
      stageQueries["Closed Lost"].data,
    ],
  )

  const filteredKanbanItems = useMemo(() => {
    const grouped: Record<DealStage, DealListItem[]> = {
      New: [],
      Procurement: [],
      Cold: [],
      Proposal: [],
      Negotiation: [],
      "Closed Won": [],
      "Closed Lost": [],
    }
    if (view !== "kanban") return grouped
    for (const stage of DEAL_STAGE_LIST) {
      if (!isStageActive(stage)) continue
      const pages = stageData[stage]?.pages ?? []
      for (const p of pages) for (const item of p.items) grouped[stage].push(item)
    }
    return grouped
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, stageData, restrictToStage])

  const stageCounts = useMemo(() => {
    const counts: Record<DealStage, number> = {
      New: 0,
      Procurement: 0,
      Cold: 0,
      Proposal: 0,
      Negotiation: 0,
      "Closed Won": 0,
      "Closed Lost": 0,
    }
    for (const stage of DEAL_STAGE_LIST) {
      if (!isStageActive(stage)) continue
      counts[stage] = stageData[stage]?.pages[0]?.total ?? 0
    }
    return counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageData, restrictToStage])

  const kanbanInfinite = useMemo(
    () => ({
      hasMore: Object.fromEntries(
        DEAL_STAGE_LIST.map((s) => [
          s,
          isStageActive(s) && !!stageQueries[s].hasNextPage,
        ]),
      ),
      loading: Object.fromEntries(
        DEAL_STAGE_LIST.map((s) => [
          s,
          isStageActive(s) && !!stageQueries[s].isFetchingNextPage,
        ]),
      ),
      onLoadMore: (columnId: string) => {
        const stage = columnId as DealStage
        if (!isStageActive(stage)) return
        const q = stageQueries[stage]
        if (q?.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage()
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stageQueries, restrictToStage],
  )

  const kanbanColumnsWithCounts = useMemo(
    () =>
      kanbanColumns
        .filter((column) => !restrictToStage || column.id === restrictToStage)
        .map((column) => ({
          ...column,
          count: stageCounts[column.id as DealStage] ?? 0,
        })),
    [stageCounts, restrictToStage],
  )

  const stats = statsQuery.data

  // KPI cards: Total + full per-stage breakdown from /crm/deals/stats.
  // Pipeline Value / Won Value / Win Rate aren't in the stats payload yet
  // and are intentionally omitted (would need a backend change).
  const kpiStats: DataCardProps[] = useMemo(() => {
    const total = stats?.total ?? 0
    const byStage = stats?.by_stage ?? {}
    return [
      { label: "Total Deals", value: total, icon: Users, accent: "primary" as const },
      ...STAGE_CARDS.map(({ stage, label, icon, accent }) => ({
        label,
        value: byStage[stage] ?? 0,
        icon,
        accent,
      })),
    ]
  }, [stats])

  const openDeal = useCallback(
    (id: string) => navigate(`/crm/deals/${id}`),
    [navigate],
  )
  const openDealNew = useCallback(() => navigate("/crm/deals/new"), [navigate])

  const tableRows = useMemo(
    () => tableQuery.data?.items ?? [],
    [tableQuery.data?.items],
  )

  const handleKanbanMoveAcross = (
    itemId: string,
    fromColumn: string,
    toColumn: string,
  ) => {
    const fromStage = fromColumn as DealStage
    const toStage = toColumn as DealStage
    if (fromStage === toStage) return

    // View-only (mentioned) deals aren't draggable; snap back if one slips
    // through — the backend would 404 the move anyway.
    const draggedDeal = filteredKanbanItems[fromStage]?.find((d) => d.id === itemId)
    if (draggedDeal?.access_level === "view") {
      setKanbanResetKey((k) => k + 1)
      return
    }

    // if (fromStage === "Closed Lost") {
    //   toast.error("Closed Lost deals can't be moved. Reinstate the deal first.")
    //   setKanbanResetKey((k) => k + 1)
    //   return
    // }

    if (toStage === "Closed Won" && fromStage !== "Closed Won") {
      // Closed Won runs the dedicated wizard: Quote → Sales Order (Account
      // already lives on the deal). Snap the dropped card back to its
      // source column and hand the user off to the wizard — stage flips
      // automatically once the SO is approved at the end.
      setKanbanResetKey((k) => k + 1)
      navigate(`/crm/deals/${itemId}/close-won?type=deal`)
      return
    }

    if (toStage === "Closed Lost" && fromStage !== "Closed Lost") {
      // Defer the move: snap the card back, then open the shared dialog to
      // capture the lost reason. The mutation fires from handleKanbanLostConfirm.
      const movingDeal = filteredKanbanItems[fromStage]?.find(
        (d) => d.id === itemId,
      )
      setKanbanResetKey((k) => k + 1)
      setPendingLostMove({
        itemId,
        fromStage,
        name: movingDeal?.title ?? "this deal",
      })
      setLostReasonOpen(true)
      return
    }

    moveDealStage.mutate({ id: itemId, fromStage, toStage })
  }

  // Commit the deferred close-lost move once the dialog is confirmed.
  const handleKanbanLostConfirm = (reason: string, notes: string) => {
    if (!pendingLostMove) return
    const { itemId, fromStage } = pendingLostMove
    setLostReasonOpen(false)
    setPendingLostMove(null)
    moveDealStage.mutate({
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
      date_preset: null,
      owner_id: null,
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
      : DEAL_STAGE_LIST.some(
          (s) => stageQueries[s].isLoading && !stageQueries[s].data,
        )

  const listError =
    view === "list"
      ? tableQuery.isError
        ? tableQuery.error
        : null
      : DEAL_STAGE_LIST.map((s) => stageQueries[s]).find((q) => q.isError)
          ?.error ?? null

  // A failed list fetch always toasts the backend's message. A 422 (e.g. a filter
  // value out of range) is NOT painted as a broken-page error — the list just
  // shows empty; other failures keep the inline error state too.
  useQueryErrorToast(listError)
  const activeError = isValidationError(listError) ? null : listError

  return {
    canWriteDeal,
    onlyUnassigned,
    handleOnlyUnassignedChange,
    onlyMentioned,
    handleOnlyMentionedChange,
    openDeal,
    openDealNew,
    view,
    setView,
    selectedStage,
    selectedPriority,
    selectedTag,
    selectedSource,
    datePreset,
    setDatePreset,
    selectedOwners,
    selectedPm,
    selectedCategories,
    selectedOems,
    selectedChannelTypes,
    handleStageChange,
    handlePriorityChange,
    handleTagChange,
    handleSourceChange,
    handleOwnersChange,
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
    search,
    handleSearchChange,
    activeFilterCount,
    resetFilters,
    tableRows,
    tablePage,
    setTablePage,
    tablePageSize,
    setTablePageSize,
    tableTotal: tableQuery.data?.total ?? 0,
    tableIsFetching: tableQuery.isFetching,
    kanbanResetKey,
    lostReasonOpen,
    lostEntityName: pendingLostMove?.name ?? "",
    lostEntityId: pendingLostMove?.itemId ?? null,
    onLostReasonOpenChange: handleKanbanLostOpenChange,
    handleKanbanLostConfirm,
    kanbanColumnsWithCounts,
    filteredKanbanItems,
    kanbanInfinite,
    handleKanbanMoveAcross,
    activeIsLoading,
    activeError,
    kpiStats,
  }
}
