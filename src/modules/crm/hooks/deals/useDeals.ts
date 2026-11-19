import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import {
  createDeal,
  deleteDeal,
  fetchDeal,
  fetchDealEntityStats,
  fetchDeals,
  fetchDealStats,
  updateDeal,
  type DealCreatePayload,
  type DealListItem,
  type DealsListResponse,
  type DealStage,
  type DealUpdatePayload,
  type FetchDealsParams,
  type FetchDealStatsParams,
} from "../../api"
import { DEAL_STAGE_LIST } from "../../api"
import { DEALS_STRINGS } from "../../components/deals/deals.strings"
import { dealEntityStatsKey, invalidateEntityStats } from "../shared/entityStats"

type DealsInfiniteCache = {
  pages: DealsListResponse[]
  pageParams: unknown[]
}

const KEY = ["crm", "deals"] as const
const STATS_KEY = [...KEY, "stats"] as const

// Invalidate every variant of the stats query (any param combo) so a stage
// move / create / delete refreshes whichever filter the page currently has
// applied. Targeted to stats — list & kanban queries get their own
// targeted invalidation elsewhere.
function invalidateStats(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const k = query.queryKey
      return k[0] === "crm" && k[1] === "deals" && k[2] === "stats"
    },
  })
}

// Refresh every list/kanban variant after a create/delete (rows appear or
// disappear). Skips the per-deal detail cache — the caller updates that
// directly via setQueryData so we don't refetch the row we just wrote.
function invalidateLists(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const k = query.queryKey
      if (k[0] !== "crm" || k[1] !== "deals") return false
      // Skip detail entries — they're owned by their own setQueryData call.
      return k[2] !== "detail"
    },
  })
}

export function useDeals(
  params: FetchDealsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () => fetchDeals(params),
    enabled: options?.enabled ?? true,
    // Paged lists keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

// Pipeline-stage counts + total_value for the KPI cards. Honors the same
// filter rules as the list endpoint, so the cards always reflect what the
// user is currently filtering.
export function useDealStats(
  params: FetchDealStatsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...STATS_KEY, params],
    queryFn: () => fetchDealStats(params),
    enabled: options?.enabled ?? true,
  })
}

// Infinite-scroll query for one pipeline column. Kanban view runs one of
// these per stage so each column fetches & paginates independently.
export function useDealsInfinite(
  params: Omit<FetchDealsParams, "page">,
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: [...KEY, "infinite", params],
    queryFn: ({ pageParam }) => fetchDeals({ ...params, page: pageParam }),
    initialPageParam: 1 as number,
    getNextPageParam: (last) => {
      const loaded = last.page * last.page_size
      return loaded < last.total ? last.page + 1 : undefined
    },
    enabled: options?.enabled ?? true,
  })
}

type KanbanStage = (typeof DEAL_STAGE_LIST)[number]

// One infinite query per kanban pipeline stage. Verbose by design:
// rules-of-hooks require a static call order, so each stage gets its own
// explicit hook call. Returns a `Record<stage, query>` keyed by the 7
// pipeline stages.
//
// `restrictToStage` lets the page narrow active queries to a single stage
// (used when the stage filter is set) — the other six queries are disabled
// so we don't burn requests on data the user can't see.
export function useDealsByAllStages(
  common: Omit<FetchDealsParams, "stage" | "page">,
  options?: { enabled?: boolean; restrictToStage?: KanbanStage },
) {
  const baseEnabled = options?.enabled ?? true
  const restrict = options?.restrictToStage
  const isOn = (stage: KanbanStage) =>
    baseEnabled && (!restrict || restrict === stage)

  const newQ = useDealsInfinite(
    { ...common, stage: "New" },
    { enabled: isOn("New") },
  )
  const procurementQ = useDealsInfinite(
    { ...common, stage: "Procurement" },
    { enabled: isOn("Procurement") },
  )
  const coldQ = useDealsInfinite(
    { ...common, stage: "Cold" },
    { enabled: isOn("Cold") },
  )
  const proposalQ = useDealsInfinite(
    { ...common, stage: "Proposal" },
    { enabled: isOn("Proposal") },
  )
  const negotiationQ = useDealsInfinite(
    { ...common, stage: "Negotiation" },
    { enabled: isOn("Negotiation") },
  )
  const closedWonQ = useDealsInfinite(
    { ...common, stage: "Closed Won" },
    { enabled: isOn("Closed Won") },
  )
  const closedLostQ = useDealsInfinite(
    { ...common, stage: "Closed Lost" },
    { enabled: isOn("Closed Lost") },
  )

  const map: Record<KanbanStage, ReturnType<typeof useDealsInfinite>> = {
    New: newQ,
    Procurement: procurementQ,
    Cold: coldQ,
    Proposal: proposalQ,
    Negotiation: negotiationQ,
    "Closed Won": closedWonQ,
    "Closed Lost": closedLostQ,
  }
  return map
}

export function useDeal(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...KEY, "detail", id],
    queryFn: () => fetchDeal(id as string),
    enabled: !!id && (options?.enabled ?? true),
  })
}

// Per-deal relation counts (notes/comments/tasks/quotes/MIs/audit) for the
// detail-page tab badges. One lightweight call replaces per-relation fetches.
export function useDealEntityStats(id: string | null | undefined) {
  return useQuery({
    queryKey: dealEntityStatsKey(id ?? ""),
    queryFn: () => fetchDealEntityStats(id as string),
    enabled: !!id,
  })
}

export function useCreateDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: DealCreatePayload) => createDeal(body),
    onSuccess: (created) => {
      queryClient.setQueryData([...KEY, "detail", created.id], created)
      invalidateLists(queryClient)
      invalidateEntityStats(queryClient)
      toast.success(DEALS_STRINGS.toast.created)
    },
    onError: (error: Error) => {
      toast.error(error.message || DEALS_STRINGS.toast.createFailed)
    },
  })
}

export function useUpdateDeal(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: DealUpdatePayload) => updateDeal(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData([...KEY, "detail", id], updated)
      invalidateLists(queryClient)
      toast.success(DEALS_STRINGS.toast.updated)
    },
    onError: (error: Error) => {
      toast.error(error.message || DEALS_STRINGS.toast.updateFailed)
    },
  })
}

export function useDeleteDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDeal(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: [...KEY, "detail", id] })
      invalidateLists(queryClient)
      invalidateEntityStats(queryClient)
      toast.success(DEALS_STRINGS.toast.deleted)
    },
    onError: (error: Error) => {
      toast.error(error.message || DEALS_STRINGS.toast.deleteFailed)
    },
  })
}

// Drag-and-drop stage move. Targeted invalidation per §16.9: only the
// source + destination kanban columns + the moved deal's detail query.
// Backend handles state-machine guards and proposal_date toggle.
//
// Optimistic update mirrors `useMoveLeadStage`: on mutate, the moved deal
// is removed from the source-stage cache and inserted at the top of the
// destination-stage cache so the kanban renders the drop instantly. The
// KanbanBoard wrapper would otherwise show the card snapping back to its
// origin for a frame while the PATCH is in flight.
export function useMoveDealStage() {
  const queryClient = useQueryClient()

  const matchesAffectedQueries = (
    fromStage: DealStage,
    toStage: DealStage,
  ) => (query: { queryKey: readonly unknown[] }) => {
    const k = query.queryKey
    if (k[0] !== "crm" || k[1] !== "deals" || k[2] !== "infinite") return false
    const params = k[3] as { stage?: DealStage } | undefined
    return params?.stage === fromStage || params?.stage === toStage
  }

  return useMutation({
    mutationFn: ({
      id,
      toStage,
      closedLostReason,
    }: {
      id: string
      fromStage: DealStage
      toStage: DealStage
      // Required by the backend when moving INTO "Closed Lost"; ignored
      // (and rejected) on any other transition, so only send it then.
      closedLostReason?: string
    }) =>
      updateDeal(id, {
        stage: toStage,
        ...(toStage === "Closed Lost" && closedLostReason
          ? { closed_lost_reason: closedLostReason }
          : {}),
      }),

    onMutate: async ({ id, fromStage, toStage }) => {
      const matcher = matchesAffectedQueries(fromStage, toStage)
      await queryClient.cancelQueries({ predicate: matcher })

      const snapshots: Array<readonly [readonly unknown[], DealsInfiniteCache | undefined]> = []
      const affected = queryClient.getQueriesData<DealsInfiniteCache>({
        predicate: matcher,
      })

      let movedRow: DealListItem | undefined
      for (const [key, data] of affected) {
        snapshots.push([key, data])
        if (!data) continue
        const params = (key as readonly unknown[])[3] as { stage?: DealStage } | undefined
        if (params?.stage !== fromStage) continue
        const nextPages = data.pages.map((page) => {
          const idx = page.items.findIndex((row) => row.id === id)
          if (idx === -1) return page
          movedRow = page.items[idx]
          return {
            ...page,
            items: page.items.filter((row) => row.id !== id),
            total: Math.max(0, page.total - 1),
          }
        })
        queryClient.setQueryData<DealsInfiniteCache>(key, {
          ...data,
          pages: nextPages,
        })
      }

      if (movedRow) {
        const inserted: DealListItem = { ...movedRow, stage: toStage }
        for (const [key, data] of affected) {
          if (!data) continue
          const params = (key as readonly unknown[])[3] as { stage?: DealStage } | undefined
          if (params?.stage !== toStage) continue
          const [firstPage, ...restPages] = data.pages
          if (!firstPage) continue
          const nextFirst: DealsListResponse = {
            ...firstPage,
            items: [inserted, ...firstPage.items],
            total: firstPage.total + 1,
          }
          queryClient.setQueryData<DealsInfiniteCache>(key, {
            ...data,
            pages: [nextFirst, ...restPages],
          })
        }
      }

      return { snapshots }
    },

    onError: (error: Error, _vars, context) => {
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error(error.message || DEALS_STRINGS.toast.moveStageFailed)
    },

    onSuccess: (_, { id, fromStage, toStage }) => {
      void queryClient.invalidateQueries({
        predicate: matchesAffectedQueries(fromStage, toStage),
      })
      void queryClient.invalidateQueries({ queryKey: [...KEY, "detail", id] })
      invalidateStats(queryClient)
      // toast.success(`Deal moved to "${toStage}"`)
    },
  })
}
