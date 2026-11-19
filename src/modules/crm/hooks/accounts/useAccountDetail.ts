import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { useUrlPagination } from "@/shared/hooks"
import { PAGINATION } from "@/shared/constants"

import {
  DEAL_NON_TERMINAL_STAGES,
  fetchDealStats,
  type DealStage,
} from "../../api"

import {
  useAccount,
  useAccountAddresses,
  useAccountStats,
  useAccountContacts,
  useAccountOwners,
  useApproveAccount,
  useChildAccountsInfinite,
  useAddAccountOwner,
  useDeleteAccount,
  usePromoteAccountOwnerPrimary,
  useRejectAccount,
  useRemoveAccountOwner,
} from "./useAccounts"
import { useDeals } from "../deals/useDeals"
import { useAccountDealsFilters } from "./useAccountDealsFilters"
import { useEntityNotes } from "../shared/useNotes"
import { useActivities } from "../shared/useActivities"

// Container logic for the Account detail page: the account query, the
// tab-gated list queries (contacts/addresses/deals/orders/notes/activities),
// the two infinite-scroll observers, owner mutations, and derived values.
export function useAccountDetail() {
  const { id: accountId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  // True while the pre-delete open-deals check is in flight, so the dialog's
  // confirm button shows pending during the /deals/stats round-trip.
  const [isCheckingDealsForDelete, setIsCheckingDealsForDelete] = useState(false)
  const [addOwnerOpen, setAddOwnerOpen] = useState(false)

  // Active tab id — mirrored to the URL by `DetailTabs` as `?tab=<id>`. We
  // gate each list query on the tabs that consume it so initial load fires
  // only the active tab's requests.
  const [searchParams] = useSearchParams()
  const activeTab = searchParams.get("tab") ?? "overview"

  const { data: account, isLoading, isError, error } = useAccount(accountId)
  // Always-on: owners surface in the right-rail Owners card regardless of tab.
  const { data: owners } = useAccountOwners(accountId)

  // Hierarchy (always-on, right-rail + Company Details):
  //  - parentAccount resolves the parent's name for the "Parent Account"
  //    link. useAccount internally no-ops when the id is null/undefined,
  //    so this is a no-op for root accounts.
  //  - childAccounts is the direct-children walk (GET /accounts?parent_account_id=)
  //    powering the "Child Accounts" card.
  const { data: parentAccount } = useAccount(account?.parent_account_id)
  const childrenQuery = useChildAccountsInfinite(account?.id)
  // Dedup by id when flattening pages. Offset pagination can return the same
  // row on two pages if the server sort isn't a total order; without this the
  // list emits duplicate React keys. The backend tiebreaker
  // (account_repository._apply_sort) is the real fix — this just keeps the
  // view robust against any future overlap.
  const childAccounts = useMemo(() => {
    const seen = new Set<string>()
    return (childrenQuery.data?.pages ?? [])
      .flatMap((p) => p.items)
      .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
  }, [childrenQuery.data?.pages])
  const childAccountsTotal = childrenQuery.data?.pages?.[0]?.total ?? 0

  // Tab-gated reads ────────────────────────────────────────────────────
  const { data: contactsResp } = useAccountContacts(accountId, {
    enabled: !!accountId && activeTab === "contacts",
  })
  const { data: addresses } = useAccountAddresses(
    accountId,
    {},
    { enabled: !!accountId && activeTab === "addresses" },
  )

  // Deals tab — numbered pagination (Coding-guideline §16.7): one page at a time
  // via the paged `useDeals` query. Page + size live in the URL (`dl_page` /
  // `dl_size`) next to the tab's filters, so a refresh or a trip into a deal and
  // back keeps them; a filter change drops `dl_page` (page 1).
  const {
    page: dealsPage,
    setPage: setDealsPage,
    pageSize: dealsPageSize,
    setPageSize: setDealsPageSize,
  } = useUrlPagination({
    sizeKey: "dl_size",
    pageKey: "dl_page",
    defaultSize: PAGINATION.DEFAULT_PAGE_SIZE,
  })
  // Search + filters of the Deals tab (shared toolbar), URL-backed.
  const dealsFilters = useAccountDealsFilters()
  const dealsQuery = useDeals(
    {
      account_id: accountId ?? "",
      page: dealsPage,
      page_size: dealsPageSize,
      ...dealsFilters.queryParams,
    },
    { enabled: !!accountId && activeTab === "deals" },
  )
  const deals = dealsQuery.data?.items ?? []
  const dealsListTotal = dealsQuery.data?.total ?? 0
  // Badge counts for every tab come from one stats call, so they are right on
  // first load from any tab; the tab's own list total is the fallback.
  const { data: stats } = useAccountStats(accountId)

  const dealsTotal = stats?.deals ?? dealsListTotal

  // The Sales Orders tab (<OrdersSection>) fetches its own list; the badge comes
  // from the stats call so it is right before the tab is visited.
  const salesOrdersTotal = stats?.sales_orders ?? 0

  // Notes here drive only the tab-count badge — the Notes tab body renders
  // its own <NotesSection> with independent pagination. `total` from the
  // envelope is the accurate count (the old infinite hook could only count
  // the rows it had loaded).
  const notesQuery = useEntityNotes("account", accountId, {
    enabled: !!accountId && activeTab === "notes",
  })
  const notesTotal = stats?.notes ?? notesQuery.data?.total ?? 0

  const activitiesQuery = useActivities("account", accountId, {
    enabled: !!accountId && activeTab === "activities",
  })
  const activitiesCount =
    activitiesQuery.data?.pages?.[0]?.items.length ?? 0

  // Child Accounts card — infinite scroll inside the right-rail card
  // (IntersectionObserver sentinel).
  const [childSentinel, setChildSentinel] = useState<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!childSentinel || !childrenQuery.hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (
            e.isIntersecting &&
            childrenQuery.hasNextPage &&
            !childrenQuery.isFetchingNextPage
          ) {
            void childrenQuery.fetchNextPage()
          }
        }
      },
      // The child list scrolls inside the card's own `max-h-72 overflow-y-auto`
      // box (AccountHierarchyCards), and the sentinel is a direct child of it.
      // Root the observer at that scroll container, not the viewport — a
      // viewport-rooted observer sees the sentinel clipped by the inner
      // scroller and stops firing before the last page loads (children capped
      // at ~100 of 120). `parentElement` is the scroll box.
      { root: childSentinel.parentElement, rootMargin: "200px 0px" },
    )
    observer.observe(childSentinel)
    return () => observer.disconnect()
  }, [
    childSentinel,
    childrenQuery.hasNextPage,
    childrenQuery.isFetchingNextPage,
    childrenQuery.fetchNextPage,
  ])

  const deleteMut = useDeleteAccount()
  const addOwnerMut = useAddAccountOwner(accountId ?? "")
  const removeOwnerMut = useRemoveAccountOwner(accountId ?? "")
  const promotePrimaryMut = usePromoteAccountOwnerPrimary(accountId ?? "")
  const approveMut = useApproveAccount(accountId ?? "")
  const rejectMut = useRejectAccount(accountId ?? "")

  // "Both"-typed addresses serve billing and shipping at once, so they belong
  // in each column — matching the SalesOrderFormPage convention. Strict
  // equality previously dropped them from both lists, hiding them entirely.
  const billingAddresses = (addresses ?? []).filter(
    (a) => a.address_type === "Billing" || a.address_type === "Both",
  )
  const shippingAddresses = (addresses ?? []).filter(
    (a) => a.address_type === "Shipping" || a.address_type === "Both",
  )
  const contacts = contactsResp?.items ?? []
  const addressesCount = stats?.addresses ?? (addresses ?? []).length

  async function handleDelete() {
    if (!accountId) return
    if (deleteMut.isPending || isCheckingDealsForDelete) return

    // Block deletion while the account still has open deals — anything not in
    // a terminal stage (Closed Won / Closed Lost). One /deals/stats call gives
    // the per-stage counts; either terminal stage resolves a deal. Mirrors the
    // owner-removal guard in AccountOwnersSelect.
    setIsCheckingDealsForDelete(true)
    try {
      const stats = await fetchDealStats({ account_id: accountId })
      const openCount = DEAL_NON_TERMINAL_STAGES.reduce(
        (sum, stage: DealStage) => sum + (stats.by_stage[stage] ?? 0),
        0,
      )
      if (openCount > 0) {
        toast.error(
          `Cannot delete this account — ${openCount} open deal${
            openCount === 1 ? "" : "s"
          } not yet closed. Move them to Closed Won / Closed Lost first.`,
        )
        return
      }
    } catch (err) {
      // Fail closed: a flaky network must not let an account with open deals
      // slip through. Surface the error and leave the account untouched.
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not verify open deals — account not deleted.",
      )
      return
    } finally {
      setIsCheckingDealsForDelete(false)
    }

    deleteMut.mutate(accountId, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
        navigate("/crm/accounts")
      },
    })
  }

  async function handleAddOwners(picks: Array<{ userId: string; isPrimary: boolean }>) {
    for (const pick of picks) {
      await addOwnerMut.mutateAsync({
        user_id: pick.userId,
        is_primary: pick.isPrimary,
      })
    }
    setAddOwnerOpen(false)
  }

  return {
    accountId,
    navigate,
    account,
    isLoading,
    isError,
    error,
    owners,
    // tab data
    deals,
    dealsTotal,
    dealsListTotal,
    dealsFilters,
    dealsQuery,
    dealsPage,
    setDealsPage,
    dealsPageSize,
    setDealsPageSize,
    salesOrdersTotal,
    quotesTotal: stats?.quotes ?? 0,
    contactsCount: stats?.contacts,
    notesTotal,
    activitiesCount,
    contacts,
    parentAccount,
    childAccounts,
    childAccountsTotal,
    childrenQuery,
    setChildSentinel,
    billingAddresses,
    shippingAddresses,
    addressesCount,
    // dialogs
    deleteDialogOpen,
    setDeleteDialogOpen,
    isCheckingDealsForDelete,
    addOwnerOpen,
    setAddOwnerOpen,
    // mutations
    deleteMut,
    addOwnerMut,
    removeOwnerMut,
    promotePrimaryMut,
    approveMut,
    rejectMut,
    // handlers
    handleDelete,
    handleAddOwners,
  }
}
