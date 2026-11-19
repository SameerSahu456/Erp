import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import {
  createLead,
  deleteLead,
  fetchLead,
  fetchLeadEntityStats,
  fetchLeads,
  fetchLeadStats,
  rejectLead,
  updateLead,
  type CrmLeadListItem,
  type CrmLeadsListResponse,
  type CrmLeadUpsertPayload,
  type FetchLeadsParams,
  type FetchLeadStatsParams,
} from "../../api"
import { LEAD_STAGES, type Lead } from "../../types"
import { LEADS_STRINGS as S } from "../../components/leads/leads.strings"
import { leadEntityStatsKey } from "../shared/entityStats"

// Shape of one infinite-query cache entry for the per-stage kanban queries.
// `useInfiniteQuery` wraps the raw page array in `{ pages, pageParams }`.
type LeadsInfiniteCache = {
  pages: CrmLeadsListResponse[]
  pageParams: unknown[]
}

const KEY = ["crm", "leads"] as const
const STATS_KEY = [...KEY, "stats"] as const

// Invalidate every variant of the stats query (any param combo) so a stage
// move / create / delete refreshes whichever filter the page currently has
// applied. Using a predicate keeps it scoped to stats — table & kanban
// queries get their own targeted invalidation elsewhere.
function invalidateStats(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const k = query.queryKey
      return k[0] === "crm" && k[1] === "leads" && k[2] === "stats"
    },
  })
}

// Refresh every list/kanban/stats variant after a create/update/delete (rows
// appear, disappear, or change shape). Skips detail entries — the detail
// cache for a known id is updated explicitly when the caller has the row.
//
// Detail keys are `["crm","leads", <id-string>]` (legacy 3-tuple, no marker).
// List keys are `["crm","leads", <paramsObject>]`. Infinite & stats keys add
// a string marker at index 2 (`"infinite"`, `"stats"`).
function invalidateLists(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const k = query.queryKey
      if (k[0] !== "crm" || k[1] !== "leads") return false
      const marker = k[2]
      if (marker === "infinite" || marker === "stats") return true
      // Plain list: 3-element key with a params object at [2]. Skip detail
      // (where [2] is the string id).
      return typeof marker === "object" && marker !== null
    },
  })
}

export function useLeads(params: FetchLeadsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () => fetchLeads(params),
    enabled: options?.enabled ?? true,
  })
}

// Funnel-stage counts for the summary cards. Honors the same visibility +
// filter rules as the list endpoint, so the cards always reflect what the
// user is currently filtering.
export function useLeadStats(
  params: FetchLeadStatsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...STATS_KEY, params],
    queryFn: () => fetchLeadStats(params),
    enabled: options?.enabled ?? true,
  })
}

// Infinite-scroll query for one funnel column. The kanban view runs one of these
// per stage so each column fetches & paginates independently of the others.
export function useLeadsInfinite(
  params: Omit<FetchLeadsParams, "page">,
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: [...KEY, "infinite", params],
    queryFn: ({ pageParam }) => fetchLeads({ ...params, page: pageParam }),
    initialPageParam: 1 as number,
    getNextPageParam: (last) => {
      const loaded = last.page * last.page_size
      return loaded < last.total ? last.page + 1 : undefined
    },
    enabled: options?.enabled ?? true,
  })
}

type KanbanStage = (typeof LEAD_STAGES)[number]

// One infinite query per kanban funnel stage. Verbose by design: rules-of-hooks
// require a static call order, so each stage gets its own explicit hook call.
// Returns a `Record<stage, query>` keyed by the 9 kanban stages (no Rejected).
//
// `restrictToStage` lets the page narrow the active queries to a single stage
// (used when the stage filter is set) — the other eight queries are disabled
// so we don't burn requests on data the user can't see.
export function useLeadsByAllStages(
  common: Omit<FetchLeadsParams, "stage" | "page">,
  options?: {
    enabled?: boolean
    restrictToStage?: KanbanStage
    // When set, only these stages fetch — every other stage gets
    // `enabled: false`, so no query fires for a hidden column (e.g. early-funnel
    // BDE roles → New / Contacted / Qualified only). `undefined` ⇒ all stages.
    allowedStages?: readonly string[]
  },
) {
  const baseEnabled = options?.enabled ?? true
  const restrict = options?.restrictToStage
  const allowed = options?.allowedStages
  const isOn = (stage: KanbanStage) =>
    baseEnabled &&
    (!restrict || restrict === stage) &&
    (!allowed || allowed.includes(stage))

  const newQ = useLeadsInfinite({ ...common, stage: "New" }, { enabled: isOn("New") })
  const contactedQ = useLeadsInfinite(
    { ...common, stage: "Contacted" },
    { enabled: isOn("Contacted") },
  )
  const qualifiedQ = useLeadsInfinite(
    { ...common, stage: "Qualified" },
    { enabled: isOn("Qualified") },
  )
  const procurementQ = useLeadsInfinite(
    { ...common, stage: "Procurement" },
    { enabled: isOn("Procurement") },
  )
  const coldQ = useLeadsInfinite({ ...common, stage: "Cold" }, { enabled: isOn("Cold") })
  const proposalQ = useLeadsInfinite(
    { ...common, stage: "Proposal" },
    { enabled: isOn("Proposal") },
  )
  const negotiationQ = useLeadsInfinite(
    { ...common, stage: "Negotiation" },
    { enabled: isOn("Negotiation") },
  )
  const closedWonQ = useLeadsInfinite(
    { ...common, stage: "Closed Won" },
    { enabled: isOn("Closed Won") },
  )
  const closedLostQ = useLeadsInfinite(
    { ...common, stage: "Closed Lost" },
    { enabled: isOn("Closed Lost") },
  )

  const map: Record<KanbanStage, ReturnType<typeof useLeadsInfinite>> = {
    New: newQ,
    Contacted: contactedQ,
    Qualified: qualifiedQ,
    Procurement: procurementQ,
    Cold: coldQ,
    Proposal: proposalQ,
    Negotiation: negotiationQ,
    "Closed Won": closedWonQ,
    "Closed Lost": closedLostQ,
  }
  return map
}

export function useLead(id: string) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => fetchLead(id),
    enabled: !!id,
  })
}

// Per-lead relation counts (notes/comments/tasks/quotes/MIs/audit) for the
// detail-page tab badges. One lightweight call replaces per-relation fetches.
export function useLeadEntityStats(id: string) {
  return useQuery({
    queryKey: leadEntityStatsKey(id),
    queryFn: () => fetchLeadEntityStats(id),
    enabled: !!id,
  })
}

export function useCreateLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CrmLeadUpsertPayload) => createLead(body),
    onSuccess: (created) => {
      queryClient.setQueryData([...KEY, created.id], created)
      invalidateLists(queryClient)
      toast.success(S.toast.created)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.createFailed)
    },
  })
}

export function useUpdateLead(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CrmLeadUpsertPayload) => updateLead(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData([...KEY, id], updated)
      invalidateLists(queryClient)
      toast.success(S.toast.updated)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.updateFailed)
    },
  })
}

// POST /crm/leads/{id}/reject — moves a lead from any non-terminal stage into
// the "Rejected" terminal stage with a stored rejection_reason. Targeted
// invalidation: source stage's kanban query (so the row leaves the column it
// was in) AND any list query scoped to the "Rejected" stage (so the row
// appears on /crm/rejected-leads, which uses the plain-list `useLeads` and
// would otherwise stay stale until staleTime elapsed).
export function useRejectLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      reason,
    }: {
      id: string
      fromStage: Lead["stage"]
      reason: string
    }) => rejectLead(id, { rejection_reason: reason }),
    onSuccess: (_, { id, fromStage }) => {
      void queryClient.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey
          if (k[0] !== "crm" || k[1] !== "leads") return false
          const marker = k[2]
          // Source kanban column — refetch so the rejected row leaves it.
          if (marker === "infinite") {
            const params = k[3] as { stage?: string } | undefined
            return params?.stage === fromStage
          }
          // Plain list query keyed by params object at index 2. Invalidate
          // any variant that filters to "Rejected" so the rejected-leads
          // page picks up the new row immediately.
          if (typeof marker === "object" && marker !== null) {
            const params = marker as { stage?: string }
            return params.stage === "Rejected"
          }
          return false
        },
      })
      void queryClient.invalidateQueries({ queryKey: [...KEY, id] })
      invalidateStats(queryClient)
      toast.success(S.toast.rejected)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.rejectFailed)
    },
  })
}

// DELETE /crm/leads/{id} — soft-deletes the lead. We don't know which stage
// it was in (the caller may not have it in scope), so we invalidate every
// kanban infinite query plus the detail query. Acceptable because delete is
// rare compared to drag-and-drop stage moves.
export function useDeleteLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: [...KEY, id] })
      invalidateLists(queryClient)
      toast.success(S.toast.deleted)
    },
    onError: (error: Error) => {
      toast.error(error.message || S.toast.deleteFailed)
    },
  })
}

export function useMoveLeadStage() {
  const queryClient = useQueryClient()

  // Predicate that matches the two kanban infinite queries affected by a
  // single move — source stage and destination stage. Used for both the
  // optimistic write and the post-success invalidation, keeping them in
  // lock-step so we never optimistic-write a query we don't also reconcile.
  const matchesAffectedQueries = (
    fromStage: Lead["stage"],
    toStage: Lead["stage"],
  ) => (query: { queryKey: readonly unknown[] }) => {
    const k = query.queryKey
    if (k[0] !== "crm" || k[1] !== "leads" || k[2] !== "infinite") return false
    const params = k[3] as { stage?: string } | undefined
    return params?.stage === fromStage || params?.stage === toStage
  }

  return useMutation({
    mutationFn: ({
      id,
      toStage,
      closedLostReason,
    }: {
      id: string
      fromStage: Lead["stage"]
      toStage: Lead["stage"]
      // Required by the backend when moving INTO "Closed Lost"; ignored
      // (and rejected) on any other transition, so only send it then.
      closedLostReason?: string
    }) =>
      updateLead(id, {
        stage: toStage,
        ...(toStage === "Closed Lost" && closedLostReason
          ? { closed_lost_reason: closedLostReason }
          : {}),
      }),

    // Optimistically move the lead between the two affected per-stage
    // infinite caches so the kanban renders the drop instantly. Without
    // this, the KanbanBoard sees stale `items` for ~50–200ms after drop
    // (until the PATCH lands + invalidate refetches), and the dropped
    // card visually snaps back to its origin column for those frames.
    //
    // Returns a snapshot map so onError can roll the caches back if the
    // PATCH fails (e.g. backend state-machine guard rejects the move).
    onMutate: async ({ id, fromStage, toStage }) => {
      const matcher = matchesAffectedQueries(fromStage, toStage)

      // Pause any in-flight refetches that could overwrite our write. We
      // only target the two affected stage queries — other stages stay
      // alive and refetch on their own schedule.
      await queryClient.cancelQueries({ predicate: matcher })

      // Snapshot for rollback. Each entry is [queryKey, previousData].
      const snapshots: Array<readonly [readonly unknown[], LeadsInfiniteCache | undefined]> = []
      const affected = queryClient.getQueriesData<LeadsInfiniteCache>({
        predicate: matcher,
      })

      // Step 1 — pull the moved row out of the source-stage cache(s) and
      // remember its full record so we can re-insert it into the destination.
      let movedRow: CrmLeadListItem | undefined
      for (const [key, data] of affected) {
        snapshots.push([key, data])
        if (!data) continue
        const params = (key as readonly unknown[])[3] as { stage?: string } | undefined
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
        queryClient.setQueryData<LeadsInfiniteCache>(key, {
          ...data,
          pages: nextPages,
        })
      }

      // Step 2 — insert the moved row at the top of the destination
      // stage's first page, with its `stage` field updated. Top-insert
      // mirrors what the user expects: the just-moved card is the most
      // recent thing in the destination column.
      if (movedRow) {
        const inserted: CrmLeadListItem = { ...movedRow, stage: toStage }
        for (const [key, data] of affected) {
          if (!data) continue
          const params = (key as readonly unknown[])[3] as { stage?: string } | undefined
          if (params?.stage !== toStage) continue
          const [firstPage, ...restPages] = data.pages
          if (!firstPage) continue
          const nextFirst: CrmLeadsListResponse = {
            ...firstPage,
            items: [inserted, ...firstPage.items],
            total: firstPage.total + 1,
          }
          queryClient.setQueryData<LeadsInfiniteCache>(key, {
            ...data,
            pages: [nextFirst, ...restPages],
          })
        }
      }

      return { snapshots }
    },

    onError: (error: Error, _vars, context) => {
      // Roll every snapshotted cache back to its pre-drop state. The
      // KanbanBoard's items-sync effect will pick up the reverted props
      // and the card will animate back to its origin column on its own.
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error(error.message || S.toast.moveStageFailed)
    },

    onSuccess: (_, { id, fromStage, toStage }) => {
      // Targeted invalidation: only the source and destination kanban
      // columns + the moved lead's detail query. Other stage queries are
      // unaffected by the move, so we don't burn requests refetching them.
      void queryClient.invalidateQueries({
        predicate: matchesAffectedQueries(fromStage, toStage),
      })
      void queryClient.invalidateQueries({ queryKey: [...KEY, id] })
      invalidateStats(queryClient)
      // toast.success(`Lead moved to "${toStage}"`)
    },
  })
}
